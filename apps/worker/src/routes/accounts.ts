import { Hono } from 'hono';
import { Bindings, Variables } from '../types.js';

export const accountsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت لیست تمام حساب‌های کاربر
 */
accountsRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const type = c.req.query('type');
  const isSource = c.req.query('isSource');
  const isDestination = c.req.query('isDestination');

  let query = `
    SELECT 
      id, user_id as userId, name, type, bank_name as bankName,
      account_number as accountNumber, card_number as cardNumber,
      color, icon, balance, initial_balance as initialBalance,
      is_source as isSource, is_destination as isDestination,
      is_archived as isArchived, created_at as createdAt
    FROM accounts
    WHERE user_id = ? AND is_archived = 0
  `;
  const params: unknown[] = [userId];

  if (type) {
    query += ` AND type = ?`;
    params.push(type);
  }
  if (isSource !== undefined) {
    query += ` AND is_source = ?`;
    params.push(isSource === 'true' || isSource === '1' ? 1 : 0);
  }
  if (isDestination !== undefined) {
    query += ` AND is_destination = ?`;
    params.push(isDestination === 'true' || isDestination === '1' ? 1 : 0);
  }

  query += ` ORDER BY type ASC, name ASC`;

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  return c.json({
    success: true,
    data: results.map((row: any) => ({
      ...row,
      isSource: Boolean(row.isSource),
      isDestination: Boolean(row.isDestination),
      isArchived: Boolean(row.isArchived),
    })),
  });
});

/**
 * ایجاد حساب مالی جدید
 */
accountsRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    name: string;
    type?: 'bank' | 'wallet' | 'savings' | 'credit' | 'counterparty';
    bankName?: string;
    accountNumber?: string;
    cardNumber?: string;
    color?: string;
    icon?: string;
    balance?: number;
    initialBalance?: number;
    isSource?: boolean;
    isDestination?: boolean;
  }>();

  if (!body.name || !body.name.trim()) {
    return c.json({ success: false, error: 'نام حساب الزامی است' }, 400);
  }

  const id = `acc_${crypto.randomUUID()}`;
  const initialBalance = body.initialBalance ?? body.balance ?? 0;
  const balance = body.balance ?? initialBalance;
  const type = body.type || 'bank';
  const color = body.color || '#0284c7';
  const icon = body.icon || (type === 'wallet' ? 'wallet' : type === 'savings' ? 'piggy-bank' : 'credit-card');
  const isSource = body.isSource !== false ? 1 : 0;
  const isDestination = body.isDestination !== false ? 1 : 0;

  await c.env.DB.prepare(
    `INSERT INTO accounts (
      id, user_id, name, type, bank_name, account_number, card_number,
      color, icon, balance, initial_balance, is_source, is_destination
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      userId,
      body.name.trim(),
      type,
      body.bankName ?? null,
      body.accountNumber ?? null,
      body.cardNumber ?? null,
      color,
      icon,
      balance,
      initialBalance,
      isSource,
      isDestination
    )
    .run();

  return c.json(
    {
      success: true,
      data: {
        id,
        userId,
        name: body.name.trim(),
        type,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        cardNumber: body.cardNumber,
        color,
        icon,
        balance,
        initialBalance,
        isSource: Boolean(isSource),
        isDestination: Boolean(isDestination),
      },
    },
    201
  );
});

/**
 * دریافت جزئیات یک حساب مالی و تراکنش‌های اخیر آن
 */
accountsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');

  const acc = await c.env.DB.prepare(
    `SELECT 
      id, user_id as userId, name, type, bank_name as bankName,
      account_number as accountNumber, card_number as cardNumber,
      color, icon, balance, initial_balance as initialBalance,
      is_source as isSource, is_destination as isDestination,
      is_archived as isArchived, created_at as createdAt
    FROM accounts WHERE id = ? AND user_id = ?`
  )
    .bind(id, userId)
    .first<any>();

  if (!acc) {
    return c.json({ success: false, error: 'حساب مالی پیدا نشد' }, 404);
  }

  // دریافت ۱۰ تراکنش اخیر این حساب
  const { results: recentTxs } = await c.env.DB.prepare(
    `SELECT 
      t.id, t.amount, t.type, t.description, t.transaction_date as transactionDate,
      c.name as categoryName, c.icon as categoryIcon,
      fa.name as fromAccountName, ta.name as toAccountName
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts fa ON t.from_account_id = fa.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    WHERE (t.from_account_id = ? OR t.to_account_id = ?) AND t.user_id = ?
    ORDER BY t.transaction_date DESC LIMIT 15`
  )
    .bind(id, id, userId)
    .all();

  return c.json({
    success: true,
    data: {
      ...acc,
      isSource: Boolean(acc.isSource),
      isDestination: Boolean(acc.isDestination),
      isArchived: Boolean(acc.isArchived),
      recentTransactions: recentTxs,
    },
  });
});

/**
 * ویرایش اطلاعات یک حساب مالی
 */
accountsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');
  const body = await c.req.json<{
    name?: string;
    type?: 'bank' | 'wallet' | 'savings' | 'credit' | 'counterparty';
    bankName?: string;
    accountNumber?: string;
    cardNumber?: string;
    color?: string;
    icon?: string;
    balance?: number;
    initialBalance?: number;
    isSource?: boolean;
    isDestination?: boolean;
    isArchived?: boolean;
  }>();

  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.name !== undefined) {
    updates.push('name = ?');
    params.push(body.name.trim());
  }
  if (body.type !== undefined) {
    updates.push('type = ?');
    params.push(body.type);
  }
  if (body.bankName !== undefined) {
    updates.push('bank_name = ?');
    params.push(body.bankName);
  }
  if (body.accountNumber !== undefined) {
    updates.push('account_number = ?');
    params.push(body.accountNumber);
  }
  if (body.cardNumber !== undefined) {
    updates.push('card_number = ?');
    params.push(body.cardNumber);
  }
  if (body.color !== undefined) {
    updates.push('color = ?');
    params.push(body.color);
  }
  if (body.icon !== undefined) {
    updates.push('icon = ?');
    params.push(body.icon);
  }
  if (body.balance !== undefined) {
    updates.push('balance = ?');
    params.push(body.balance);
  }
  if (body.initialBalance !== undefined) {
    updates.push('initial_balance = ?');
    params.push(body.initialBalance);
  }
  if (body.isSource !== undefined) {
    updates.push('is_source = ?');
    params.push(body.isSource ? 1 : 0);
  }
  if (body.isDestination !== undefined) {
    updates.push('is_destination = ?');
    params.push(body.isDestination ? 1 : 0);
  }
  if (body.isArchived !== undefined) {
    updates.push('is_archived = ?');
    params.push(body.isArchived ? 1 : 0);
  }

  if (updates.length === 0) {
    return c.json({ success: false, error: 'هیچ فیلدی برای تغییر ارسال نشده است' }, 400);
  }

  params.push(id, userId);
  const query = `UPDATE accounts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
  const result = await c.env.DB.prepare(query).bind(...params).run();

  if (result.meta?.changes === 0) {
    return c.json({ success: false, error: 'حساب پیدا نشد یا دسترسی غیرمجاز است' }, 404);
  }

  return c.json({ success: true, message: 'حساب با موفقیت ویرایش شد' });
});

/**
 * حذف یک حساب مالی (اگر تراکنش داشته باشد، آرشیو می‌شود)
 */
accountsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');

  // بررسی وجود تراکنش متصل به حساب
  const txCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM transactions WHERE (from_account_id = ? OR to_account_id = ?) AND user_id = ?'
  )
    .bind(id, id, userId)
    .first<{ count: number }>();

  if (txCount && txCount.count > 0) {
    // برای جلوگیری از شکستن تاریخچه حسابداری، حساب آرشیو می‌شود
    await c.env.DB.prepare('UPDATE accounts SET is_archived = 1 WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run();

    return c.json({
      success: true,
      archived: true,
      message: 'این حساب دارای تراکنش است و جهت حفظ دفاتر مالی به جای حذف کامل، آرشیو شد',
    });
  }

  await c.env.DB.prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .run();

  return c.json({ success: true, message: 'حساب با موفقیت حذف شد' });
});
