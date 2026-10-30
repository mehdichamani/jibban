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
 * دریافت لیست گروه‌های کاربر جاری
 */
groupsRouter.get('/', async (c) => {
  const userId = c.get('userId');

  const { results } = await c.env.DB.prepare(
    `SELECT g.id, g.name, g.currency, g.created_at as createdAt,
            COUNT(gm.user_id) as memberCount
     FROM groups g
     INNER JOIN group_members gm_user ON g.id = gm_user.group_id AND gm_user.user_id = ?
     LEFT JOIN group_members gm ON g.id = gm.group_id
     GROUP BY g.id
     ORDER BY g.created_at DESC`
  )
    .bind(userId)
    .all();

  return c.json({ success: true, data: results });
});

/**
 * ایجاد گروه دنگ جدید
 */
groupsRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    name: string;
    currency?: string;
    memberNames?: string[];
  }>();

  if (!body.name || body.name.trim().length === 0) {
    return c.json({ success: false, error: 'نام گروه الزامی است' }, 400);
  }

  const groupId = `grp_${crypto.randomUUID()}`;
  const currency = body.currency || 'IRT';

  // ۱. ایجاد گروه
  await c.env.DB.prepare(
    'INSERT INTO groups (id, name, currency, created_by) VALUES (?, ?, ?, ?)'
  )
    .bind(groupId, body.name.trim(), currency, userId)
    .run();

  // ۲. افزودن سازنده به عنوان ادمین
  await c.env.DB.prepare(
    'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)'
  )
    .bind(groupId, userId, 'admin')
    .run();

  // ۳. افزودن اعضای اولیه در صورت ارسال
  if (body.memberNames && body.memberNames.length > 0) {
    for (const mName of body.memberNames) {
      if (!mName || mName.trim().length === 0) continue;
      const mId = `user_${crypto.randomUUID().slice(0, 8)}`;
      await c.env.DB.prepare(
        'INSERT INTO users (id, name, sync_token) VALUES (?, ?, ?)'
      )
        .bind(mId, mName.trim(), `sync_${mId}`)
        .run();

      await c.env.DB.prepare(
        'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)'
      )
        .bind(groupId, mId, 'member')
        .run();
    }
  }

  return c.json(
    {
      success: true,
      data: {
        id: groupId,
        name: body.name.trim(),
        currency,
        createdBy: userId,
      },
    },
    201
  );
});

/**
 * دریافت مشخصات، اعضا و هزینه‌های اخیر یک گروه
 */
groupsRouter.get('/:id', async (c) => {
  const groupId = c.req.param('id');

  const group = await c.env.DB.prepare('SELECT * FROM groups WHERE id = ?')
    .bind(groupId)
    .first();

  if (!group) {
    return c.json({ success: false, error: 'گروه پیدا نشد' }, 404);
  }

  // اعضای گروه
  const { results: members } = await c.env.DB.prepare(
    `SELECT u.id, u.name, gm.role, gm.joined_at as joinedAt
     FROM group_members gm
     INNER JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = ?`
  )
    .bind(groupId)
    .all();

  // ۱۰ هزینه اخیر
  const { results: recentExpenses } = await c.env.DB.prepare(
    `SELECT e.id, e.amount, e.description, e.expense_date as expenseDate,
            u.name as payerName, e.payer_id as payerId
     FROM group_expenses e
     INNER JOIN users u ON e.payer_id = u.id
     WHERE e.group_id = ?
     ORDER BY e.expense_date DESC
     LIMIT 20`
  )
    .bind(groupId)
    .all();

  return c.json({
    success: true,
    data: {
      group,
      members,
      recentExpenses,
    },
  });
});

/**
 * افزودن عضو جدید به گروه
 */
groupsRouter.post('/:id/members', async (c) => {
  const groupId = c.req.param('id');
  const body = await c.req.json<{ name: string; userId?: string }>();

  if (!body.name || body.name.trim().length === 0) {
    return c.json({ success: false, error: 'نام عضو جدید الزامی است' }, 400);
  }

  let targetUserId = body.userId;
  if (!targetUserId) {
    targetUserId = `user_${crypto.randomUUID().slice(0, 8)}`;
    await c.env.DB.prepare(
      'INSERT INTO users (id, name, sync_token) VALUES (?, ?, ?)'
    )
      .bind(targetUserId, body.name.trim(), `sync_${targetUserId}`)
      .run();
  }

  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)'
  )
    .bind(groupId, targetUserId, 'member')
    .run();

  return c.json({
    success: true,
    data: {
      userId: targetUserId,
      name: body.name.trim(),
    },
  }, 201);
});

/**
 * ثبت هزینه جدید در گروه با مشخص کردن سهم هر کاربر (مساوی، درصدی، یا وزنی)
 */
groupsRouter.post('/:id/expenses', async (c) => {
  const groupId = c.req.param('id');
  const defaultUser = c.get('userId');
  const body = await c.req.json<{
    payerId?: string;
    amount: number;
    description: string;
    splitType?: 'equal' | 'shares' | 'percentage' | 'custom';
    splits?: Array<{ userId: string; owedAmount: number }>;
    shares?: Array<{ userId: string; shares: number }>;
    percentages?: Array<{ userId: string; percentage: number }>;
    participantIds?: string[];
  }>();

  if (!body.amount || body.amount <= 0 || !body.description) {
    return c.json({ success: false, error: 'مبلغ و شرح هزینه الزامی است' }, 400);
  }

  const payerId = body.payerId || defaultUser;
  let finalSplits: Array<{ userId: string; owedAmount: number }> = [];

  // ۱. تعیین نحوه محاسبه تسهیم هزینه بر اساس نوع انتخاب‌شده
  if (body.splitType === 'custom' && body.splits && body.splits.length > 0) {
    finalSplits = body.splits;
  } else if (body.splitType === 'shares' && body.shares) {
    finalSplits = calculateShareSplits(body.amount, body.shares);
  } else if (body.splitType === 'percentage' && body.percentages) {
    finalSplits = calculatePercentageSplits(body.amount, body.percentages);
  } else {
    // پیش‌فرض: تقسیم کاملاً مساوی
    let participants = body.participantIds;
    if (!participants || participants.length === 0) {
      const members = await c.env.DB.prepare(
        'SELECT user_id FROM group_members WHERE group_id = ?'
      )
        .bind(groupId)
        .all<{ user_id: string }>();
      participants = members.results.map((m) => m.user_id);
    }
    finalSplits = calculateEqualSplits(body.amount, participants);
  }

  if (finalSplits.length === 0) {
    return c.json({ success: false, error: 'تسهیم سهم‌ها امکان‌پذیر نیست' }, 400);
  }

  // ۲. ثبت در پایگاه داده D1
  const expenseId = `exp_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO group_expenses (
      id, group_id, payer_id, amount, description, expense_date
    ) VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(expenseId, groupId, payerId, body.amount, body.description.trim(), now)
    .run();

  const splitStatements = finalSplits.map((s) =>
    c.env.DB.prepare(
      'INSERT INTO expense_splits (expense_id, user_id, owed_amount) VALUES (?, ?, ?)'
    ).bind(expenseId, s.userId, s.owedAmount)
  );
  await c.env.DB.batch(splitStatements);

  return c.json(
    {
      success: true,
      message: 'هزینه با موفقیت در گروه ثبت شد',
      data: {
        id: expenseId,
        groupId,
        payerId,
        amount: body.amount,
        description: body.description,
        splits: finalSplits,
      },
    },
    201
  );
});

/**
 * دریافت خلاصه حساب و تسویه‌حساب‌های بهینه گروه به کمک موتور @jibban/debt-engine
 */
groupsRouter.get('/:id/settlements', async (c) => {
  const groupId = c.req.param('id');

  // ۱. دریافت تمامی هزینه‌ها و سهم‌های مربوط به این گروه
  const { results: rawExpenses } = await c.env.DB.prepare(
    `SELECT e.id, e.payer_id as payerId, e.amount, e.description,
            s.user_id as splitUserId, s.owed_amount as splitAmount
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

  // تجمیع به قالب شیء Expense
  const expenseMap = new Map<string, Expense>();
  for (const row of rawExpenses) {
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
  const expensesList = Array.from(expenseMap.values());

  // ۲. دریافت تسویه‌حساب‌های گذشته ثبت‌شده در سیستم
  const { results: rawSettlements } = await c.env.DB.prepare(
    `SELECT id, from_user_id as fromUserId, to_user_id as toUserId, amount, settled_at as settledAt
     FROM settlements
     WHERE group_id = ?`
  )
    .bind(groupId)
    .all<PastSettlement>();

  // ۳. محاسبه ترازها و ساده‌سازی بهینه گراف بدهی با الگوریتم Spliit
  const summary = calculateGroupSummary(expensesList, rawSettlements);

  // ۴. پیوست نام کاربران جهت نمایش خوانا در رابط کاربری
  const { results: users } = await c.env.DB.prepare(
    `SELECT u.id, u.name FROM users u
     INNER JOIN group_members gm ON u.id = gm.user_id
     WHERE gm.group_id = ?`
  )
    .bind(groupId)
    .all<{ id: string; name: string }>();

  const userNames = new Map(users.map((u) => [u.id, u.name]));

  const settlementsWithNames = summary.settlements.map((s) => ({
    fromUserId: s.fromUser,
    fromUserName: userNames.get(s.fromUser) || s.fromUser,
    toUserId: s.toUser,
    toUserName: userNames.get(s.toUser) || s.toUser,
    amount: s.amount,
  }));

  const balancesWithNames = Object.entries(summary.balances).map(([userId, bal]) => ({
    userId,
    userName: userNames.get(userId) || userId,
    netBalance: bal.netBalance,
    totalPaid: bal.totalPaid,
    totalShare: bal.totalShare,
  }));

  return c.json({
    success: true,
    data: {
      groupId,
      totalExpenses: summary.totalExpenses,
      balances: balancesWithNames,
      settlements: settlementsWithNames,
    },
  });
});

/**
 * ثبت تسویه‌حساب پرداخت‌شده بین دو عضو در گروه
 */
groupsRouter.post('/:id/settlements', async (c) => {
  const groupId = c.req.param('id');
  const body = await c.req.json<{
    fromUserId: string;
    toUserId: string;
    amount: number;
  }>();

  if (!body.fromUserId || !body.toUserId || !body.amount || body.amount <= 0) {
    return c.json({ success: false, error: 'طرفین تسویه و مبلغ الزامی هستند' }, 400);
  }

  const settlementId = `set_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO settlements (id, group_id, from_user_id, to_user_id, amount, settled_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(settlementId, groupId, body.fromUserId, body.toUserId, body.amount, now)
    .run();

  return c.json(
    {
      success: true,
      message: 'تسویه‌حساب با موفقیت ثبت شد',
      data: {
        id: settlementId,
        groupId,
        fromUserId: body.fromUserId,
        toUserId: body.toUserId,
        amount: body.amount,
        settledAt: now,
      },
    },
    201
  );
});
