import { Hono } from 'hono';
import {
  calculateGroupSummary,
  calculateEqualSplits,
  Expense,
  PastSettlement,
} from '@jibban/debt-engine';
import { Bindings, Variables } from '../types.js';

export const groupsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت لیست گروه‌های دنگ
 */
groupsRouter.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT g.id, g.name, g.created_at as createdAt,
            COUNT(m.id) as memberCount
     FROM groups g
     LEFT JOIN members m ON g.id = m.group_id
     GROUP BY g.id
     ORDER BY g.created_at DESC`
  ).all<any>();

  return c.json({ success: true, data: results || [] });
});

/**
 * ایجاد گروه دنگ جدید
 */
groupsRouter.post('/', async (c) => {
  const body = await c.req.json<{
    name: string;
    members?: string[];
  }>();

  if (!body.name || !body.name.trim()) {
    return c.json({ success: false, error: 'نام گروه الزامی است' }, 400);
  }

  const groupId = `grp_${crypto.randomUUID()}`;
  const shareToken = crypto.randomUUID().slice(0, 8);

  await c.env.DB.prepare(
    'INSERT INTO groups (id, name, share_token, created_by) VALUES (?, ?, ?, ?)'
  ).bind(groupId, body.name.trim(), shareToken, 'user_default').run();

  if (body.members && body.members.length > 0) {
    for (const memberName of body.members) {
      if (memberName.trim()) {
        const memberId = `mem_${crypto.randomUUID()}`;
        await c.env.DB.prepare(
          'INSERT INTO members (id, group_id, name) VALUES (?, ?, ?)'
        ).bind(memberId, groupId, memberName.trim()).run();
      }
    }
  }

  return c.json({
    success: true,
    data: {
      id: groupId,
      name: body.name.trim(),
      shareToken,
    },
  }, 201);
});

/**
 * دریافت جزئیات گروه دنگ و محاسبات تسویه‌حساب (Debt Engine)
 */
groupsRouter.get('/:id', async (c) => {
  const groupId = c.req.param('id');

  const group = await c.env.DB.prepare('SELECT * FROM groups WHERE id = ?').bind(groupId).first<any>();
  if (!group) return c.json({ success: false, error: 'گروه یافت نشد' }, 404);

  const { results: members } = await c.env.DB.prepare('SELECT * FROM members WHERE group_id = ?').bind(groupId).all<any>();
  const { results: expenses } = await c.env.DB.prepare('SELECT * FROM group_expenses WHERE group_id = ? ORDER BY expense_date DESC').bind(groupId).all<any>();
  const { results: splits } = await c.env.DB.prepare(
    `SELECT es.* FROM expense_splits es
     JOIN group_expenses ge ON es.expense_id = ge.id
     WHERE ge.group_id = ?`
  ).bind(groupId).all<any>();
  const { results: settlements } = await c.env.DB.prepare('SELECT * FROM settlements WHERE group_id = ?').bind(groupId).all<any>();

  // آماده‌سازی برای Debt Engine
  const engineExpenses: Expense[] = (expenses || []).map((exp: any) => ({
    id: exp.id,
    amount: exp.amount,
    payerId: exp.payer_id,
    splits: (splits || [])
      .filter((s: any) => s.expense_id === exp.id)
      .map((s: any) => ({
        userId: s.member_id,
        owedAmount: s.owed_amount,
      })),
  }));

  const engineSettlements: PastSettlement[] = (settlements || []).map((s: any) => ({
    id: s.id,
    fromUserId: s.from_id,
    toUserId: s.to_id,
    amount: s.amount,
  }));

  const summary = calculateGroupSummary(engineExpenses, engineSettlements);

  return c.json({
    success: true,
    data: {
      group,
      members: members || [],
      expenses: expenses || [],
      summary,
    },
  });
});
