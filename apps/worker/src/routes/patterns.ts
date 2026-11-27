import { Hono } from 'hono';
import { Bindings, Variables } from '../types.js';
import { resolveAccountPath, pickLeafAccountId } from '../lib/parmis-core.js';

export const patternsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت لیست الگوهای تراکنش سریع (Pattern پارمیس)
 */
patternsRouter.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT
       p.pat_id as id,
       p.pat_title as title,
       p.pat_amount as amount,
       p.pat_info as description,
       p.pat_type as type,
       p.pat_rec_accParentId as recRootId,
       p.pat_rec_accChildId as recSubId,
       p.pat_rec_accSubChildId as recLeafId,
       p.pat_pay_accParentId as payRootId,
       p.pat_pay_accChildId as paySubId,
       p.pat_pay_accSubChildId as payLeafId
     FROM Pattern p
     ORDER BY p.pat_id DESC`
  ).all<any>();

  const data = await Promise.all(
    (results || []).map(async (row: any) => {
      const fromId = pickLeafAccountId(row.recLeafId, row.recSubId, row.recRootId);
      const toId = pickLeafAccountId(row.payLeafId, row.paySubId, row.payRootId);

      const fromAcc = fromId
        ? await c.env.DB.prepare('SELECT Ac_title FROM accounts WHERE Ac_id = ?').bind(fromId).first<{ Ac_title: string }>()
        : null;
      const toAcc = toId
        ? await c.env.DB.prepare('SELECT Ac_title FROM accounts WHERE Ac_id = ?').bind(toId).first<{ Ac_title: string }>()
        : null;

      return {
        id: String(row.id),
        title: row.title || '',
        amount: Math.round(Number(row.amount || 0)),
        description: row.description || '',
        type: row.recRootId === 2 ? 'credit' : row.payRootId === 1 ? 'debit' : 'transfer',
        fromAccountId: fromId ? String(fromId) : null,
        fromAccountName: fromAcc?.Ac_title,
        toAccountId: toId ? String(toId) : null,
        toAccountName: toAcc?.Ac_title,
      };
    })
  );

  return c.json({ success: true, data });
});

/**
 * ایجاد الگوی تراکنش سریع
 */
patternsRouter.post('/', async (c) => {
  const body = await c.req.json<{
    title: string;
    fromAccountId?: string | number | null;
    toAccountId?: string | number | null;
    amount?: number;
    description?: string;
    type?: 'debit' | 'credit' | 'transfer';
  }>();

  if (!body.title || !body.title.trim()) {
    return c.json({ success: false, error: 'عنوان الگو الزامی است' }, 400);
  }

  const maxRow = await c.env.DB.prepare('SELECT MAX(pat_id) as maxId FROM Pattern').first<{ maxId: number }>();
  const nextId = (maxRow?.maxId || 0) + 1;

  const recPath = await resolveAccountPath(c.env.DB, body.fromAccountId ? Number(body.fromAccountId) : null, 4);
  const payPath = await resolveAccountPath(c.env.DB, body.toAccountId ? Number(body.toAccountId) : null, 1);

  await c.env.DB.prepare(
    `INSERT INTO Pattern (
      pat_id, pat_title,
      pat_rec_accParentId, pat_rec_accChildId, pat_rec_accSubChildId,
      pat_pay_accParentId, pat_pay_accChildId, pat_pay_accSubChildId,
      pat_amount, pat_info, pat_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      nextId,
      body.title.trim(),
      recPath.rootId,
      recPath.subaccId,
      recPath.leafId,
      payPath.rootId,
      payPath.subaccId,
      payPath.leafId,
      Math.round(Number(body.amount || 0)),
      body.description || '',
      body.type === 'credit' ? 2 : 1
    )
    .run();

  return c.json({ success: true, data: { id: String(nextId), title: body.title.trim() } }, 201);
});

/**
 * حذف الگو
 */
patternsRouter.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) return c.json({ success: false, error: 'شناسه نامعتبر است' }, 400);
  await c.env.DB.prepare('DELETE FROM Pattern WHERE pat_id = ?').bind(id).run();
  return c.json({ success: true, message: 'الگو حذف شد' });
});
