import { Hono } from 'hono';
import { calculateEqualSplits } from '@jibban/debt-engine';
import { Bindings, Variables } from '../types.js';

export const transactionsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت لیست تراکنش‌ها با فیلتر دسته‌بندی، نوع و بازه زمانی
 */
transactionsRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const type = c.req.query('type'); // 'debit' | 'credit'
  const categoryId = c.req.query('categoryId');
  const limit = Math.min(100, parseInt(c.req.query('limit') || '50', 10));
  const offset = parseInt(c.req.query('offset') || '0', 10);

  let query = `
    SELECT 
      t.id, t.user_id as userId, t.bank_name as bankName,
      t.account_number as accountNumber, t.amount, t.type,
      t.balance, t.category_id as categoryId, t.description,
      t.transaction_date as transactionDate, t.created_at as createdAt,
      c.name as categoryName, c.icon as categoryIcon, c.color as categoryColor
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ?
  `;

  const params: unknown[] = [userId];

  if (type) {
    query += ` AND t.type = ?`;
    params.push(type);
  }

  if (categoryId) {
    query += ` AND t.category_id = ?`;
    params.push(categoryId);
  }

  query += ` ORDER BY t.transaction_date DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const stmt = c.env.DB.prepare(query);
  const { results } = await stmt.bind(...params).all();

  return c.json({
    success: true,
    data: results,
  });
});

/**
 * ثبت دستی تراکنش جدید (غیرپیامکی)
 */
transactionsRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    amount: number;
    type: 'debit' | 'credit';
    categoryId?: string;
    description?: string;
    bankName?: string;
    transactionDate?: string;
  }>();

  if (!body.amount || body.amount <= 0 || !body.type) {
    return c.json({ success: false, error: 'مبلغ و نوع تراکنش الزامی است' }, 400);
  }

  const id = `tx_${crypto.randomUUID()}`;
  const transactionDate = body.transactionDate || new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO transactions (
      id, user_id, bank_name, amount, type, category_id, description, transaction_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      userId,
      body.bankName ?? 'ثبت دستی',
      body.amount,
      body.type,
      body.categoryId ?? 'cat_other',
      body.description ?? null,
      transactionDate
    )
    .run();

  return c.json({
    success: true,
    data: {
      id,
      userId,
      amount: body.amount,
      type: body.type,
      categoryId: body.categoryId,
      description: body.description,
      transactionDate,
    },
  }, 201);
});

/**
 * دریافت جزئیات یک تراکنش
 */
transactionsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const tx = await c.env.DB.prepare(
    `SELECT t.*, c.name as categoryName, c.icon as categoryIcon
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.id = ?`
  )
    .bind(id)
    .first();

  if (!tx) {
    return c.json({ success: false, error: 'تراکنش پیدا نشد' }, 404);
  }

  return c.json({ success: true, data: tx });
});

/**
 * ویرایش دسته‌بندی و یادداشت شخصی یک تراکنش
 */
transactionsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    categoryId?: string;
    description?: string;
    amount?: number;
  }>();

  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.categoryId !== undefined) {
    updates.push('category_id = ?');
    params.push(body.categoryId);
  }
  if (body.description !== undefined) {
    updates.push('description = ?');
    params.push(body.description);
  }
  if (body.amount !== undefined && body.amount > 0) {
    updates.push('amount = ?');
    params.push(body.amount);
  }

  if (updates.length === 0) {
    return c.json({ success: false, error: 'هیچ فیلدی برای تغییر ارسال نشده است' }, 400);
  }

  params.push(id);
  const query = `UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`;
  await c.env.DB.prepare(query).bind(...params).run();

  return c.json({ success: true, message: 'تراکنش با موفقیت بروزرسانی شد' });
});

/**
 * تبدیل آنی یک تراکنش پیامکی به یک خرج در گروه دنگ (Magic Button)
 */
transactionsRouter.post('/:id/to-split', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');
  const body = await c.req.json<{
    groupId: string;
    participantIds?: string[];
    description?: string;
  }>();

  if (!body.groupId) {
    return c.json({ success: false, error: 'شناسه گروه دنگ الزامی است' }, 400);
  }

  // ۱. دریافت تراکنش مربوطه
  const tx = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?')
    .bind(id)
    .first<{
      id: string;
      user_id: string;
      amount: number;
      description: string | null;
      bank_name: string | null;
      transaction_date: string;
    }>();

  if (!tx) {
    return c.json({ success: false, error: 'تراکنش مورد نظر پیدا نشد' }, 404);
  }

  // ۲. تعیین اعضای سهیم در این هزینه
  let participants = body.participantIds;
  if (!participants || participants.length === 0) {
    const members = await c.env.DB.prepare(
      'SELECT user_id FROM group_members WHERE group_id = ?'
    )
      .bind(body.groupId)
      .all<{ user_id: string }>();

    participants = members.results.map((m) => m.user_id);
  }

  if (participants.length === 0) {
    return c.json({ success: false, error: 'عضوی برای تقسیم دنگ در این گروه یافت نشد' }, 400);
  }

  // ۳. محاسبه سهم مساوی به کمک موتور @jibban/debt-engine
  const splits = calculateEqualSplits(tx.amount, participants);

  // ۴. ثبت هزینه جدید در گروه
  const expenseId = `exp_${crypto.randomUUID()}`;
  const expenseDesc =
    body.description ||
    tx.description ||
    `خرج تراکنش بانکی (${tx.bank_name ?? 'بانک'})`;

  await c.env.DB.prepare(
    `INSERT INTO group_expenses (
      id, group_id, payer_id, amount, description, linked_transaction_id, expense_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      expenseId,
      body.groupId,
      userId,
      tx.amount,
      expenseDesc,
      tx.id,
      tx.transaction_date
    )
    .run();

  // ۵. ثبت سهم‌های تفکیک‌شده
  const splitStatements = splits.map((s) =>
    c.env.DB.prepare(
      'INSERT INTO expense_splits (expense_id, user_id, owed_amount) VALUES (?, ?, ?)'
    ).bind(expenseId, s.userId, s.owedAmount)
  );
  await c.env.DB.batch(splitStatements);

  return c.json(
    {
      success: true,
      message: 'تراکنش پیامک بانکی با موفقیت به هزینه گروهی دنگ تبدیل شد',
      data: {
        expenseId,
        groupId: body.groupId,
        payerId: userId,
        amount: tx.amount,
        description: expenseDesc,
        splits,
      },
    },
    201
  );
});
