import { Hono } from 'hono';
import { Bindings, Variables, Counterparty } from '../types.js';

export const counterpartiesRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت لیست طرف‌حساب‌ها و اشخاص
 */
counterpartiesRouter.get('/', async (c) => {
  const userId = c.get('userId');

  const { results } = await c.env.DB.prepare(
    `SELECT 
      id, user_id as userId, name, phone, balance, notes, created_at as createdAt
    FROM counterparties
    WHERE user_id = ?
    ORDER BY name ASC`
  )
    .bind(userId)
    .all();

  return c.json({
    success: true,
    data: results || [],
  });
});

/**
 * ایجاد شخص یا طرف‌حساب جدید
 */
counterpartiesRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    name: string;
    phone?: string | null;
    initialBalance?: number; // مبالغ به ریال (مثبت: طلب، منفی: بدهی)
    notes?: string | null;
  }>();

  if (!body.name || !body.name.trim()) {
    return c.json({ success: false, error: 'نام طرف‌حساب الزامی است' }, 400);
  }

  const id = `cp_${crypto.randomUUID()}`;
  const balance = Math.round(body.initialBalance || 0);

  await c.env.DB.prepare(
    'INSERT INTO counterparties (id, user_id, name, phone, balance, notes) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(id, userId, body.name.trim(), body.phone ?? null, balance, body.notes ?? null)
    .run();

  return c.json(
    {
      success: true,
      data: {
        id,
        userId,
        name: body.name.trim(),
        phone: body.phone,
        balance,
        notes: body.notes,
      },
    },
    201
  );
});

/**
 * دریافت جزئیات شخص و تراکنش‌های متصل
 */
counterpartiesRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');

  const cp = await c.env.DB.prepare(
    'SELECT * FROM counterparties WHERE id = ? AND user_id = ?'
  )
    .bind(id, userId)
    .first<any>();

  if (!cp) {
    return c.json({ success: false, error: 'طرف‌حساب پیدا نشد' }, 404);
  }

  const { results: recentTxs } = await c.env.DB.prepare(
    `SELECT 
      t.id, t.amount, t.type, t.description, t.transaction_date as transactionDate,
      c.name as categoryName
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.counterparty_id = ? AND t.user_id = ?
    ORDER BY t.transaction_date DESC LIMIT 20`
  )
    .bind(id, userId)
    .all();

  return c.json({
    success: true,
    data: {
      ...cp,
      recentTransactions: recentTxs || [],
    },
  });
});

/**
 * ویرایش شخص
 */
counterpartiesRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');
  const body = await c.req.json<{
    name?: string;
    phone?: string | null;
    notes?: string | null;
  }>();

  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.name !== undefined) {
    updates.push('name = ?');
    params.push(body.name.trim());
  }
  if (body.phone !== undefined) {
    updates.push('phone = ?');
    params.push(body.phone);
  }
  if (body.notes !== undefined) {
    updates.push('notes = ?');
    params.push(body.notes);
  }

  if (updates.length === 0) {
    return c.json({ success: false, error: 'هیچ فیلدی برای تغییر ارسال نشده است' }, 400);
  }

  params.push(id, userId);
  const query = `UPDATE counterparties SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
  const result = await c.env.DB.prepare(query).bind(...params).run();

  if (result.meta?.changes === 0) {
    return c.json({ success: false, error: 'طرف‌حساب پیدا نشد' }, 404);
  }

  return c.json({ success: true, message: 'طرف‌حساب با موفقیت ویرایش شد' });
});

/**
 * حذف شخص
 */
counterpartiesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');

  const txCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM transactions WHERE counterparty_id = ? AND user_id = ?'
  )
    .bind(id, userId)
    .first<{ count: number }>();

  if (txCount && txCount.count > 0) {
    return c.json({ success: false, error: 'این شخص در تراکنش‌ها ثبت شده و قابل حذف نیست' }, 400);
  }

  await c.env.DB.prepare('DELETE FROM counterparties WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .run();

  return c.json({ success: true, message: 'شخص با موفقیت حذف شد' });
});
