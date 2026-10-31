import { Hono } from 'hono';
import {
  calculateGroupSummary,
  calculateEqualSplits,
  calculateShareSplits,
  calculatePercentageSplits,
  Expense,
  PastSettlement,
} from '@jibban/debt-engine';
import { Bindings, Variables } from '../types.js';

export const groupsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت لیست گروه‌های دنگ
 */
groupsRouter.get('/', async (c) => {
  const userId = c.get('userId');

  const { results } = await c.env.DB.prepare(
    `SELECT g.id, g.name, g.created_at as createdAt,
            COUNT(gm.counterparty_id) as memberCount
     FROM groups g
     LEFT JOIN group_members gm ON g.id = gm.group_id
     WHERE g.created_by = ?
     GROUP BY g.id
     ORDER BY g.created_at DESC`
  )
    .bind(userId)
    .all();

  return c.json({ success: true, data: results || [] });
});

/**
 * ایجاد گروه دنگ جدید همراه با اعضای اولیه
 */
groupsRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    name: string;
    memberCounterpartyIds?: string[];
  }>();

  if (!body.name || !body.name.trim()) {
    return c.json({ success: false, error: 'نام گروه الزامی است' }, 400);
  }

  const groupId = `grp_${crypto.randomUUID()}`;

  await c.env.DB.prepare(
    'INSERT INTO groups (id, name, created_by) VALUES (?, ?, ?)'
  )
    .bind(groupId, body.name.trim(), userId)
    .run();

  if (body.memberCounterpartyIds && body.memberCounterpartyIds.length > 0) {
    const stmts = body.memberCounterpartyIds.map((cpId) =>
      c.env.DB.prepare(
        'INSERT OR IGNORE INTO group_members (group_id, counterparty_id) VALUES (?, ?)'
      ).bind(groupId, cpId)
    );
    await c.env.DB.batch(stmts);
  }

  return c.json(
    {
      success: true,
      data: {
        id: groupId,
        name: body.name.trim(),
        createdBy: userId,
      },
    },
    201
  );
});

/**
 * دریافت مشخصات، اعضا و هزینه‌های یک گروه
 */
groupsRouter.get('/:id', async (c) => {
  const groupId = c.req.param('id');
  const userId = c.get('userId');

  const group = await c.env.DB.prepare('SELECT * FROM groups WHERE id = ? AND created_by = ?')
    .bind(groupId, userId)
    .first<any>();

  if (!group) {
    return c.json({ success: false, error: 'گروه پیدا نشد' }, 404);
  }

  // اعضای گروه از جدول counterparties
  const { results: members } = await c.env.DB.prepare(
    `SELECT cp.id, cp.name, cp.phone, cp.balance, gm.joined_at as joinedAt
     FROM group_members gm
     INNER JOIN counterparties cp ON gm.counterparty_id = cp.id
     WHERE gm.group_id = ?`
  )
    .bind(groupId)
    .all();

  // هزینه‌های اخیر
  const { results: recentExpenses } = await c.env.DB.prepare(
    `SELECT e.id, e.amount, e.description, e.expense_date as expenseDate,
            cp.name as payerName, e.payer_id as payerId
     FROM group_expenses e
     INNER JOIN counterparties cp ON e.payer_id = cp.id
     WHERE e.group_id = ?
     ORDER BY e.expense_date DESC
     LIMIT 30`
  )
    .bind(groupId)
    .all();

  return c.json({
    success: true,
    data: {
      group,
      members: members || [],
      recentExpenses: recentExpenses || [],
    },
  });
});

/**
 * افزودن عضو (طرف‌حساب) به گروه
 */
groupsRouter.post('/:id/members', async (c) => {
  const groupId = c.req.param('id');
  const userId = c.get('userId');
  const body = await c.req.json<{ counterpartyId?: string; name?: string }>();

  let cpId = body.counterpartyId;

  if (!cpId && body.name && body.name.trim()) {
    cpId = `cp_${crypto.randomUUID()}`;
    await c.env.DB.prepare(
      'INSERT INTO counterparties (id, user_id, name, balance) VALUES (?, ?, ?, 0)'
    )
      .bind(cpId, userId, body.name.trim())
      .run();
  }

  if (!cpId) {
    return c.json({ success: false, error: 'مشخصات عضو الزامی است' }, 400);
  }

  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO group_members (group_id, counterparty_id) VALUES (?, ?)'
  )
    .bind(groupId, cpId)
    .run();

  return c.json({ success: true, message: 'عضو با موفقیت به گروه اضافه شد', data: { counterpartyId: cpId } }, 201);
});

/**
 * ثبت هزینه جدید در گروه
 */
groupsRouter.post('/:id/expenses', async (c) => {
  const groupId = c.req.param('id');
  const body = await c.req.json<{
    payerId: string; // counterpartyId
    amount: number; // ریال
    description: string;
    splitType?: 'equal' | 'shares' | 'percentage' | 'custom';
    splits?: Array<{ counterpartyId: string; owedAmount: number }>;
    shares?: Array<{ counterpartyId: string; shares: number }>;
    percentages?: Array<{ counterpartyId: string; percentage: number }>;
    participantIds?: string[];
  }>();

  if (!body.amount || body.amount <= 0 || !body.description || !body.payerId) {
    return c.json({ success: false, error: 'مبلغ، پرداخت‌کننده و شرح هزینه الزامی است' }, 400);
  }

  const amount = Math.round(body.amount);
  let finalSplits: Array<{ counterpartyId: string; owedAmount: number }> = [];

  if (body.splitType === 'custom' && body.splits && body.splits.length > 0) {
    finalSplits = body.splits;
  } else if (body.splitType === 'shares' && body.shares) {
    const rawSplits = calculateShareSplits(
      amount,
      body.shares.map((s) => ({ userId: s.counterpartyId, shares: s.shares }))
    );
    finalSplits = rawSplits.map((s) => ({ counterpartyId: s.userId, owedAmount: s.owedAmount }));
  } else if (body.splitType === 'percentage' && body.percentages) {
    const rawSplits = calculatePercentageSplits(
      amount,
      body.percentages.map((p) => ({ userId: p.counterpartyId, percentage: p.percentage }))
    );
    finalSplits = rawSplits.map((s) => ({ counterpartyId: s.userId, owedAmount: s.owedAmount }));
  } else {
    let participants = body.participantIds;
    if (!participants || participants.length === 0) {
      const members = await c.env.DB.prepare(
        'SELECT counterparty_id FROM group_members WHERE group_id = ?'
      )
        .bind(groupId)
        .all<{ counterparty_id: string }>();
      participants = members.results.map((m) => m.counterparty_id);
    }
    const rawSplits = calculateEqualSplits(amount, participants);
    finalSplits = rawSplits.map((s) => ({ counterpartyId: s.userId, owedAmount: s.owedAmount }));
  }

  const expenseId = `exp_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO group_expenses (
      id, group_id, payer_id, amount, description, expense_date
    ) VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(expenseId, groupId, body.payerId, amount, body.description.trim(), now)
    .run();

  const splitStatements = finalSplits.map((s) =>
    c.env.DB.prepare(
      'INSERT INTO expense_splits (expense_id, counterparty_id, owed_amount) VALUES (?, ?, ?)'
    ).bind(expenseId, s.counterpartyId, s.owedAmount)
  );
  await c.env.DB.batch(splitStatements);

  return c.json(
    {
      success: true,
      data: {
        id: expenseId,
        groupId,
        payerId: body.payerId,
        amount,
        description: body.description,
        splits: finalSplits,
      },
    },
    201
  );
});

/**
 * دریافت تسویه‌حساب‌های بهینه و خلاصه بدهی/طلب گروه
 */
groupsRouter.get('/:id/settlements', async (c) => {
  const groupId = c.req.param('id');

  const { results: rawExpenses } = await c.env.DB.prepare(
    `SELECT e.id, e.payer_id as payerId, e.amount, e.description,
            s.counterparty_id as splitUserId, s.owed_amount as splitAmount
     FROM group_expenses e
     INNER JOIN expense_splits s ON e.id = s.expense_id
     WHERE e.group_id = ?`
  )
    .bind(groupId)
    .all<{
      id: string;
      payerId: string;
      amount: number;
      description: string;
      splitUserId: string;
      splitAmount: number;
    }>();

  const expenseMap = new Map<string, Expense>();
  for (const row of rawExpenses || []) {
    if (!expenseMap.has(row.id)) {
      expenseMap.set(row.id, {
        id: row.id,
        payerId: row.payerId,
        amount: row.amount,
        description: row.description,
        splits: [],
      });
    }
    expenseMap.get(row.id)!.splits.push({
      userId: row.splitUserId,
      owedAmount: row.splitAmount,
    });
  }

  const { results: rawSettlements } = await c.env.DB.prepare(
    `SELECT id, from_id as fromUserId, to_id as toUserId, amount, settled_at as settledAt
     FROM settlements
     WHERE group_id = ?`
  )
    .bind(groupId)
    .all<PastSettlement>();

  const summary = calculateGroupSummary(Array.from(expenseMap.values()), rawSettlements || []);

  const { results: counterparties } = await c.env.DB.prepare(
    `SELECT cp.id, cp.name FROM counterparties cp
     INNER JOIN group_members gm ON cp.id = gm.counterparty_id
     WHERE gm.group_id = ?`
  )
    .bind(groupId)
    .all<{ id: string; name: string }>();

  const nameMap = new Map((counterparties || []).map((cp) => [cp.id, cp.name]));

  const settlements = summary.settlements.map((s) => ({
    fromId: s.fromUser,
    fromName: nameMap.get(s.fromUser) || s.fromUser,
    toId: s.toUser,
    toName: nameMap.get(s.toUser) || s.toUser,
    amount: s.amount,
  }));

  const balances = Object.entries(summary.balances).map(([cpId, bal]) => ({
    counterpartyId: cpId,
    name: nameMap.get(cpId) || cpId,
    netBalance: bal.netBalance,
    totalPaid: bal.totalPaid,
    totalShare: bal.totalShare,
  }));

  return c.json({
    success: true,
    data: {
      groupId,
      totalExpenses: summary.totalExpenses,
      balances,
      settlements,
    },
  });
});

/**
 * ثبت تسویه‌حساب در گروه
 */
groupsRouter.post('/:id/settlements', async (c) => {
  const groupId = c.req.param('id');
  const body = await c.req.json<{
    fromId: string;
    toId: string;
    amount: number; // ریال
  }>();

  if (!body.fromId || !body.toId || !body.amount || body.amount <= 0) {
    return c.json({ success: false, error: 'طرفین و مبلغ تسویه الزامی هستند' }, 400);
  }

  const settlementId = `set_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO settlements (id, group_id, from_id, to_id, amount, settled_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(settlementId, groupId, body.fromId, body.toId, Math.round(body.amount), now)
    .run();

  return c.json(
    {
      success: true,
      message: 'تسویه‌حساب با موفقیت ثبت شد',
      data: {
        id: settlementId,
        groupId,
        fromId: body.fromId,
        toId: body.toId,
        amount: Math.round(body.amount),
        settledAt: now,
      },
    },
    201
  );
});
