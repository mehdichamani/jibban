import { Hono } from 'hono';
import { calculateEqualSplits } from '@jibban/debt-engine';
import { Bindings, Variables, Transaction } from '../types.js';

export const transactionsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت لیست تراکنش‌ها با فیلتر دسته‌بندی، نوع، حساب مبدا یا مقصد، طرف‌حساب، تگ و بازه زمانی
 */
transactionsRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const type = c.req.query('type'); // 'debit' | 'credit' | 'transfer'
  const categoryId = c.req.query('categoryId');
  const accountId = c.req.query('accountId'); // فیلتر تراکنش‌های یک حساب (مبدا یا مقصد)
  const fromAccountId = c.req.query('fromAccountId');
  const toAccountId = c.req.query('toAccountId');
  const counterpartyId = c.req.query('counterpartyId');
  const tag = c.req.query('tag');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const limit = Math.min(500, parseInt(c.req.query('limit') || '100', 10));
  const offset = parseInt(c.req.query('offset') || '0', 10);

  let query = `
    SELECT 
      t.id, t.user_id as userId, t.type, t.amount,
      t.from_account_id as fromAccountId, t.to_account_id as toAccountId,
      t.category_id as categoryId, t.counterparty_id as counterpartyId,
      t.description, t.tag, t.raw_sms_id as rawSmsId,
      t.transaction_date as transactionDate, t.shamsi_date as shamsiDate, t.created_at as createdAt,
      c.name as categoryName, c.icon as categoryIcon, c.color as categoryColor,
      fa.name as fromAccountName, fa.color as fromAccountColor, fa.icon as fromAccountIcon, fa.bank_name as fromAccountBankName,
      ta.name as toAccountName, ta.color as toAccountColor, ta.icon as toAccountIcon, ta.bank_name as toAccountBankName,
      cp.name as counterpartyName
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts fa ON t.from_account_id = fa.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    LEFT JOIN counterparties cp ON t.counterparty_id = cp.id
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
  if (counterpartyId) {
    query += ` AND t.counterparty_id = ?`;
    params.push(counterpartyId);
  }
  if (tag) {
    query += ` AND t.tag = ?`;
    params.push(tag);
  }
  if (startDate) {
    query += ` AND t.transaction_date >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND t.transaction_date <= ?`;
    params.push(endDate);
  }

  query += ` ORDER BY t.transaction_date DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  return c.json({
    success: true,
    data: results || [],
  });
});

/**
 * ثبت تراکنش جدید (مبالغ همگی به ریال) و بروزرسانی مانده حساب‌ها و طرف‌حساب‌ها
 */
transactionsRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    amount: number; // ریال
    type: 'debit' | 'credit' | 'transfer';
    fromAccountId?: string | null;
    toAccountId?: string | null;
    categoryId?: string | null;
    counterpartyId?: string | null;
    description?: string | null;
    tag?: string | null;
    rawSmsId?: string | null;
    transactionDate?: string;
    shamsiDate?: string | null;
  }>();

  if (!body.amount || body.amount <= 0 || !body.type) {
    return c.json({ success: false, error: 'مبلغ به ریال و نوع تراکنش الزامی است' }, 400);
  }

  const id = `tx_${crypto.randomUUID()}`;
  const amount = Math.round(body.amount);
  const transactionDate = body.transactionDate || new Date().toISOString();
  const fromAccountId = body.fromAccountId ?? null;
  const toAccountId = body.toAccountId ?? null;
  const categoryId = body.categoryId ?? null;
  const counterpartyId = body.counterpartyId ?? null;

  const statements: D1PreparedStatement[] = [];

  // ۱. ثبت رکورد در جدول تراکنش‌ها
  statements.push(
    c.env.DB.prepare(
      `INSERT INTO transactions (
        id, user_id, type, amount, from_account_id, to_account_id,
        category_id, counterparty_id, description, tag, raw_sms_id,
        transaction_date, shamsi_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      userId,
      body.type,
      amount,
      fromAccountId,
      toAccountId,
      categoryId,
      counterpartyId,
      body.description ?? null,
      body.tag ?? null,
      body.rawSmsId ?? null,
      transactionDate,
      body.shamsiDate ?? null
    )
  );

  // ۲. بروزرسانی مانده حساب مبدا (کاهش مانده)
  if (fromAccountId && (body.type === 'debit' || body.type === 'transfer')) {
    statements.push(
      c.env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?')
        .bind(amount, fromAccountId, userId)
    );
  }

  // ۳. بروزرسانی مانده حساب مقصد (افزایش مانده)
  if (toAccountId && (body.type === 'credit' || body.type === 'transfer')) {
    statements.push(
      c.env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?')
        .bind(amount, toAccountId, userId)
    );
  }

  // ۴. بروزرسانی مانده شخص/طرف‌حساب در صورت وجود
  if (counterpartyId) {
    // اگر برداشت (هزینه) برای شخص بوده یعنی طلبکار می‌شویم (+)، اگر واریز از شخص بوده بدهکار می‌شویم یا طلب تسویه می‌شود (-)
    const cpDelta = body.type === 'debit' ? amount : body.type === 'credit' ? -amount : 0;
    if (cpDelta !== 0) {
      statements.push(
        c.env.DB.prepare('UPDATE counterparties SET balance = balance + ? WHERE id = ? AND user_id = ?')
          .bind(cpDelta, counterpartyId, userId)
      );
    }
  }

  await c.env.DB.batch(statements);

  return c.json({
    success: true,
    data: {
      id,
      userId,
      type: body.type,
      amount,
      fromAccountId,
      toAccountId,
      categoryId,
      counterpartyId,
      description: body.description,
      tag: body.tag,
      rawSmsId: body.rawSmsId,
      transactionDate,
      shamsiDate: body.shamsiDate,
    },
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
      ta.name as toAccountName, ta.color as toAccountColor, ta.icon as toAccountIcon,
      cp.name as counterpartyName
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN accounts fa ON t.from_account_id = fa.id
     LEFT JOIN accounts ta ON t.to_account_id = ta.id
     LEFT JOIN counterparties cp ON t.counterparty_id = cp.id
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
 * حذف یک تراکنش با بازگرداندن مانده‌های حساب‌ها
 */
transactionsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');

  const tx = await c.env.DB.prepare(
    'SELECT * FROM transactions WHERE id = ? AND user_id = ?'
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

  // ۲. برگشت اثر مالی طرف‌حساب
  if (tx.counterparty_id) {
    const cpDelta = tx.type === 'debit' ? -tx.amount : tx.type === 'credit' ? tx.amount : 0;
    if (cpDelta !== 0) {
      statements.push(
        c.env.DB.prepare('UPDATE counterparties SET balance = balance + ? WHERE id = ? AND user_id = ?')
          .bind(cpDelta, tx.counterparty_id, userId)
      );
    }
  }

  // ۳. در صورت وجود پیامک متصل
  if (tx.raw_sms_id) {
    statements.push(
      c.env.DB.prepare("UPDATE raw_sms SET status = 'ignored', transaction_id = NULL WHERE id = ? AND user_id = ?")
        .bind(tx.raw_sms_id, userId)
    );
  }

  // ۴. حذف خود تراکنش
  statements.push(
    c.env.DB.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').bind(id, userId)
  );

  await c.env.DB.batch(statements);

  return c.json({ success: true, message: 'تراکنش با موفقیت حذف و مانده‌ها تعدیل شدند' });
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

  const tx = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?')
    .bind(id)
    .first<any>();

  if (!tx) {
    return c.json({ success: false, error: 'تراکنش پیدا نشد' }, 404);
  }

  let participants = body.participantIds;
  if (!participants || participants.length === 0) {
    const members = await c.env.DB.prepare(
      'SELECT counterparty_id FROM group_members WHERE group_id = ?'
    )
      .bind(body.groupId)
      .all<{ counterparty_id: string }>();
    participants = (members.results || []).map((m) => m.counterparty_id);
  }

  if (!participants || participants.length === 0) {
    return c.json({ success: false, error: 'عضوی برای تقسیم دنگ در این گروه یافت نشد' }, 400);
  }

  const splits = calculateEqualSplits(tx.amount, participants);
  const expenseId = `exp_${crypto.randomUUID()}`;
  const expenseDesc = body.description || tx.description || 'خرج دنگ از تراکنش بانکی';

  await c.env.DB.prepare(
    `INSERT INTO group_expenses (
      id, group_id, payer_id, amount, description, linked_transaction_id, expense_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      expenseId,
      body.groupId,
      participants[0] || userId,
      tx.amount,
      expenseDesc,
      tx.id,
      tx.transaction_date || new Date().toISOString()
    )
    .run();

  const splitStatements = splits.map((s) =>
    c.env.DB.prepare(
      'INSERT INTO expense_splits (expense_id, counterparty_id, owed_amount) VALUES (?, ?, ?)'
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
        amount: tx.amount,
        description: expenseDesc,
        splits,
      },
    },
    201
  );
});

