import { Hono } from 'hono';
import { calculateEqualSplits } from '@jibban/debt-engine';
import { Bindings, Variables } from '../types.js';

export const transactionsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت لیست تراکنش‌ها با فیلتر دسته‌بندی، نوع، حساب مبدا یا مقصد و بازه زمانی
 */
transactionsRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const type = c.req.query('type'); // 'debit' | 'credit' | 'transfer'
  const categoryId = c.req.query('categoryId');
  const accountId = c.req.query('accountId'); // فیلتر تراکنش‌های یک حساب (چه مبدا باشد چه مقصد)
  const fromAccountId = c.req.query('fromAccountId');
  const toAccountId = c.req.query('toAccountId');
  const limit = Math.min(200, parseInt(c.req.query('limit') || '100', 10));
  const offset = parseInt(c.req.query('offset') || '0', 10);

  let query = `
    SELECT 
      t.id, t.user_id as userId, t.bank_name as bankName,
      t.account_number as accountNumber, t.amount, t.type,
      t.balance, t.category_id as categoryId, t.description,
      t.tracking_code as trackingCode,
      t.from_account_id as fromAccountId, t.to_account_id as toAccountId,
      t.raw_sms as rawSms, t.sms_hash as smsHash,
      t.transaction_date as transactionDate, t.created_at as createdAt,
      c.name as categoryName, c.icon as categoryIcon, c.color as categoryColor,
      fa.name as fromAccountName, fa.color as fromAccountColor, fa.icon as fromAccountIcon, fa.bank_name as fromAccountBankName,
      ta.name as toAccountName, ta.color as toAccountColor, ta.icon as toAccountIcon, ta.bank_name as toAccountBankName
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts fa ON t.from_account_id = fa.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
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

  if (accountId) {
    query += ` AND (t.from_account_id = ? OR t.to_account_id = ?)`;
    params.push(accountId, accountId);
  }

  if (fromAccountId) {
    query += ` AND t.from_account_id = ?`;
    params.push(fromAccountId);
  }

  if (toAccountId) {
    query += ` AND t.to_account_id = ?`;
    params.push(toAccountId);
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
 * ثبت تراکنش جدید حسابداری (دستی یا سیستمی) با بروزرسانی موجودی حساب‌های مبدا و مقصد
 */
transactionsRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    amount: number;
    type: 'debit' | 'credit' | 'transfer';
    fromAccountId?: string;
    toAccountId?: string;
    categoryId?: string;
    description?: string;
    trackingCode?: string;
    bankName?: string;
    accountNumber?: string;
    transactionDate?: string;
  }>();

  if (!body.amount || body.amount <= 0 || !body.type) {
    return c.json({ success: false, error: 'مبلغ و نوع تراکنش الزامی است' }, 400);
  }

  const id = `tx_${crypto.randomUUID()}`;
  const transactionDate = body.transactionDate || new Date().toISOString();

  // اگر حساب مبدا ارسال نشده بود ولی نوع تراکنش debit یا transfer بود، تلاش برای تخصیص به حساب پیش‌فرض
  let fromAccountId = body.fromAccountId ?? null;
  let toAccountId = body.toAccountId ?? null;

  const statements: D1PreparedStatement[] = [];

  // ۱. ثبت رکورد تراکنش
  statements.push(
    c.env.DB.prepare(
      `INSERT INTO transactions (
        id, user_id, from_account_id, to_account_id, bank_name, account_number,
        amount, type, category_id, description, tracking_code, transaction_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      userId,
      fromAccountId,
      toAccountId,
      body.bankName ?? null,
      body.accountNumber ?? null,
      body.amount,
      body.type,
      body.categoryId ?? (body.type === 'transfer' ? 'cat_transfer' : body.type === 'credit' ? 'cat_income_other' : 'cat_other'),
      body.description ?? null,
      body.trackingCode ?? null,
      transactionDate
    )
  );

  // ۲. بروزرسانی تراز حساب مبدا در صورت وجود (کاهش مانده)
  if (fromAccountId && (body.type === 'debit' || body.type === 'transfer')) {
    statements.push(
      c.env.DB.prepare(
        'UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?'
      ).bind(body.amount, fromAccountId, userId)
    );
  }

  // ۳. بروزرسانی تراز حساب مقصد در صورت وجود (افزایش مانده)
  if (toAccountId && (body.type === 'credit' || body.type === 'transfer')) {
    statements.push(
      c.env.DB.prepare(
        'UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?'
      ).bind(body.amount, toAccountId, userId)
    );
  }

  await c.env.DB.batch(statements);

  // دریافت اطلاعات تکمیلی تراکنش ثبت‌شده جهت بازگشت به فرانت‌اند
  const savedTx = await c.env.DB.prepare(
    `SELECT 
      t.id, t.user_id as userId, t.bank_name as bankName,
      t.account_number as accountNumber, t.amount, t.type,
      t.balance, t.category_id as categoryId, t.description,
      t.tracking_code as trackingCode,
      t.from_account_id as fromAccountId, t.to_account_id as toAccountId,
      t.transaction_date as transactionDate, t.created_at as createdAt,
      c.name as categoryName, c.icon as categoryIcon, c.color as categoryColor,
      fa.name as fromAccountName, fa.color as fromAccountColor, fa.icon as fromAccountIcon,
      ta.name as toAccountName, ta.color as toAccountColor, ta.icon as toAccountIcon
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts fa ON t.from_account_id = fa.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    WHERE t.id = ?`
  )
    .bind(id)
    .first();

  return c.json({
    success: true,
    data: savedTx,
  }, 201);
});

/**
 * دریافت جزئیات یک تراکنش
 */
transactionsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');

  const tx = await c.env.DB.prepare(
    `SELECT 
      t.*,
      c.name as categoryName, c.icon as categoryIcon, c.color as categoryColor,
      fa.name as fromAccountName, fa.color as fromAccountColor, fa.icon as fromAccountIcon,
      ta.name as toAccountName, ta.color as toAccountColor, ta.icon as toAccountIcon
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN accounts fa ON t.from_account_id = fa.id
     LEFT JOIN accounts ta ON t.to_account_id = ta.id
     WHERE t.id = ? AND t.user_id = ?`
  )
    .bind(id, userId)
    .first();

  if (!tx) {
    return c.json({ success: false, error: 'تراکنش پیدا نشد' }, 404);
  }

  return c.json({ success: true, data: tx });
});

/**
 * ویرایش اطلاعات یک تراکنش
 */
transactionsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');
  const body = await c.req.json<{
    categoryId?: string;
    description?: string;
    fromAccountId?: string | null;
    toAccountId?: string | null;
    trackingCode?: string;
    amount?: number;
    type?: 'debit' | 'credit' | 'transfer';
    bankName?: string;
    transactionDate?: string;
  }>();

  // دریافت تراکنش قبلی
  const oldTx = await c.env.DB.prepare(
    'SELECT * FROM transactions WHERE id = ? AND user_id = ?'
  )
    .bind(id, userId)
    .first<any>();

  if (!oldTx) {
    return c.json({ success: false, error: 'تراکنش پیدا نشد یا دسترسی غیرمجاز است' }, 404);
  }

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
  if (body.fromAccountId !== undefined) {
    updates.push('from_account_id = ?');
    params.push(body.fromAccountId);
  }
  if (body.toAccountId !== undefined) {
    updates.push('to_account_id = ?');
    params.push(body.toAccountId);
  }
  if (body.trackingCode !== undefined) {
    updates.push('tracking_code = ?');
    params.push(body.trackingCode);
  }
  if (body.amount !== undefined && body.amount > 0) {
    updates.push('amount = ?');
    params.push(body.amount);
  }
  if (body.type !== undefined && ['debit', 'credit', 'transfer'].includes(body.type)) {
    updates.push('type = ?');
    params.push(body.type);
  }
  if (body.bankName !== undefined) {
    updates.push('bank_name = ?');
    params.push(body.bankName);
  }
  if (body.transactionDate !== undefined) {
    updates.push('transaction_date = ?');
    params.push(body.transactionDate);
  }

  if (updates.length === 0) {
    return c.json({ success: false, error: 'هیچ فیلدی برای تغییر ارسال نشده است' }, 400);
  }

  // در صورت تغییر در مبلغ، حساب‌ها یا نوع، مانده‌ها تعدیل شوند
  const newAmount = body.amount ?? oldTx.amount;
  const newType = body.type ?? oldTx.type;
  const newFromId = body.fromAccountId !== undefined ? body.fromAccountId : oldTx.from_account_id;
  const newToId = body.toAccountId !== undefined ? body.toAccountId : oldTx.to_account_id;

  const statements: D1PreparedStatement[] = [];

  // برگشت اثر تراکنش قبلی بر حساب‌ها:
  if (oldTx.from_account_id && (oldTx.type === 'debit' || oldTx.type === 'transfer')) {
    statements.push(
      c.env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?')
        .bind(oldTx.amount, oldTx.from_account_id, userId)
    );
  }
  if (oldTx.to_account_id && (oldTx.type === 'credit' || oldTx.type === 'transfer')) {
    statements.push(
      c.env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?')
        .bind(oldTx.amount, oldTx.to_account_id, userId)
    );
  }

  // اعمال اثر جدید:
  if (newFromId && (newType === 'debit' || newType === 'transfer')) {
    statements.push(
      c.env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?')
        .bind(newAmount, newFromId, userId)
    );
  }
  if (newToId && (newType === 'credit' || newType === 'transfer')) {
    statements.push(
      c.env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?')
        .bind(newAmount, newToId, userId)
    );
  }

  params.push(id, userId);
  const updateQuery = `UPDATE transactions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
  statements.push(c.env.DB.prepare(updateQuery).bind(...params));

  await c.env.DB.batch(statements);

  return c.json({ success: true, message: 'تراکنش با موفقیت بروزرسانی شد' });
});

/**
 * حذف یک تراکنش و تعدیل مجدد مانده حساب‌ها و علامت‌گذاری در raw_sms
 */
transactionsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');

  const tx = await c.env.DB.prepare(
    'SELECT id, amount, type, from_account_id, to_account_id, sms_hash FROM transactions WHERE id = ? AND user_id = ?'
  )
    .bind(id, userId)
    .first<any>();

  if (!tx) {
    return c.json({ success: false, error: 'تراکنش پیدا نشد' }, 404);
  }

  const statements: D1PreparedStatement[] = [];

  // ۱. برگشت اثر مالی به حساب‌ها
  if (tx.from_account_id && (tx.type === 'debit' || tx.type === 'transfer')) {
    statements.push(
      c.env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?')
        .bind(tx.amount, tx.from_account_id, userId)
    );
  }
  if (tx.to_account_id && (tx.type === 'credit' || tx.type === 'transfer')) {
    statements.push(
      c.env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?')
        .bind(tx.amount, tx.to_account_id, userId)
    );
  }

  // ۲. بروزرسانی سابقه در raw_sms برای ماندگاری حذف
  if (tx.sms_hash) {
    statements.push(
      c.env.DB.prepare(
        "UPDATE raw_sms SET status = 'deleted', transaction_id = NULL WHERE sms_hash = ? AND user_id = ?"
      ).bind(tx.sms_hash, userId)
    );
  } else {
    statements.push(
      c.env.DB.prepare(
        "UPDATE raw_sms SET status = 'deleted', transaction_id = NULL WHERE transaction_id = ? AND user_id = ?"
      ).bind(id, userId)
    );
  }

  // ۳. حذف رکورد از جدول تراکنش‌ها
  statements.push(
    c.env.DB.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').bind(id, userId)
  );

  await c.env.DB.batch(statements);

  return c.json({
    success: true,
    message: 'تراکنش با موفقیت حذف شد و در صورت اسکن مجدد موبایل ثبت نخواهد شد',
  });
});

/**
 * تبدیل آنی یک تراکنش پیامکی یا حسابداری به یک خرج در گروه دنگ (Magic Button)
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

  const tx = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
    .bind(id, userId)
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

  const splits = calculateEqualSplits(tx.amount, participants);

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

  const splitStatements = splits.map((s) =>
    c.env.DB.prepare(
      'INSERT INTO expense_splits (expense_id, user_id, owed_amount) VALUES (?, ?, ?)'
    ).bind(expenseId, s.userId, s.owedAmount)
  );
  await c.env.DB.batch(splitStatements);

  return c.json(
    {
      success: true,
      message: 'تراکنش با موفقیت به هزینه گروهی دنگ تبدیل شد',
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
