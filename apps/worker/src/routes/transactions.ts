import { Hono } from 'hono';
import { calculateEqualSplits } from '@jibban/debt-engine';
import { Bindings, Variables, Transaction, TransactionItem } from '../types.js';

export const transactionsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت لیست تراکنش‌ها با فیلتر سال مالی، دسته‌بندی، نوع، حساب مبدا یا مقصد، طرف‌حساب، تگ و بازه زمانی
 */
transactionsRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const fiscalYearId = c.req.query('fiscalYearId');
  const type = c.req.query('type'); // 'debit' | 'credit' | 'transfer' | 'compound'
  const categoryId = c.req.query('categoryId');
  const accountId = c.req.query('accountId'); // فیلتر تراکنش‌های یک حساب (مبدا یا مقصد یا در اقلام)
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
      t.id, t.user_id as userId, t.fiscal_year_id as fiscalYearId, t.type, t.amount,
      t.from_account_id as fromAccountId, t.to_account_id as toAccountId,
      t.category_id as categoryId, t.counterparty_id as counterpartyId,
      t.description, t.tag, t.raw_sms_id as rawSmsId,
      t.transaction_date as transactionDate, t.shamsi_date as shamsiDate, t.time,
      t.is_compound as isCompound, t.created_at as createdAt,
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

  if (fiscalYearId) {
    query += ` AND t.fiscal_year_id = ?`;
    params.push(fiscalYearId);
  }
  if (type) {
    query += ` AND t.type = ?`;
    params.push(type);
  }
  if (categoryId) {
    query += ` AND (t.category_id = ? OR EXISTS (SELECT 1 FROM transaction_items ti WHERE ti.transaction_id = t.id AND ti.category_id = ?))`;
    params.push(categoryId, categoryId);
  }
  if (accountId) {
    query += ` AND (t.from_account_id = ? OR t.to_account_id = ? OR EXISTS (SELECT 1 FROM transaction_items ti WHERE ti.transaction_id = t.id AND ti.account_id = ?))`;
    params.push(accountId, accountId, accountId);
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
    query += ` AND (t.counterparty_id = ? OR EXISTS (SELECT 1 FROM transaction_items ti WHERE ti.transaction_id = t.id AND ti.counterparty_id = ?))`;
    params.push(counterpartyId, counterpartyId);
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

  query += ` ORDER BY t.transaction_date DESC, t.time DESC, t.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...params).all<Transaction>();
  const txList = (results || []) as Transaction[];

  // الحاق آیتم‌های تراکنش‌های مرکب
  const compoundIds = txList.filter(t => t.is_compound || t.type === 'compound').map(t => t.id);
  if (compoundIds.length > 0) {
    const placeholders = compoundIds.map(() => '?').join(',');
    const itemsRes = await c.env.DB.prepare(`
      SELECT 
        ti.id, ti.transaction_id as transactionId, ti.user_id as userId,
        ti.entry_type as entryType, ti.account_id as accountId,
        ti.category_id as categoryId, ti.counterparty_id as counterpartyId,
        ti.amount, ti.description, ti.created_at as createdAt,
        a.name as accountName, c.name as categoryName, cp.name as counterpartyName
      FROM transaction_items ti
      LEFT JOIN accounts a ON ti.account_id = a.id
      LEFT JOIN categories c ON ti.category_id = c.id
      LEFT JOIN counterparties cp ON ti.counterparty_id = cp.id
      WHERE ti.transaction_id IN (${placeholders})
    `).bind(...compoundIds).all<TransactionItem>();

    const itemsMap = new Map<string, TransactionItem[]>();
    for (const item of (itemsRes.results || [])) {
      const list = itemsMap.get(item.transaction_id) || [];
      list.push(item);
      itemsMap.set(item.transaction_id, list);
    }

    for (const tx of txList) {
      if (itemsMap.has(tx.id)) {
        tx.items = itemsMap.get(tx.id);
      }
    }
  }

  return c.json({
    success: true,
    data: txList,
  });
});

/**
 * ثبت تراکنش جدید (تک‌مبدا/تک‌مقصد یا مرکب به سبک پارمیس)
 */
transactionsRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    amount: number; // جمع کل سند به ریال
    type: 'debit' | 'credit' | 'transfer' | 'compound';
    fiscalYearId?: string | null;
    fromAccountId?: string | null;
    toAccountId?: string | null;
    categoryId?: string | null;
    counterpartyId?: string | null;
    description?: string | null;
    tag?: string | null;
    rawSmsId?: string | null;
    transactionDate?: string;
    shamsiDate?: string | null;
    time?: string | null;
    items?: Array<{
      entryType: 'source' | 'destination';
      accountId?: string | null;
      categoryId?: string | null;
      counterpartyId?: string | null;
      amount: number;
      description?: string | null;
    }>;
  }>();

  if (!body.amount || body.amount <= 0 || !body.type) {
    return c.json({ success: false, error: 'مبلغ به ریال و نوع تراکنش الزامی است' }, 400);
  }

  const id = `tx_${crypto.randomUUID()}`;
  const amount = Math.round(body.amount);
  const transactionDate = body.transactionDate || new Date().toISOString();
  const time = body.time || new Date().toTimeString().slice(0, 8);
  const fromAccountId = body.fromAccountId ?? null;
  const toAccountId = body.toAccountId ?? null;
  const categoryId = body.categoryId ?? null;
  const counterpartyId = body.counterpartyId ?? null;
  const isCompound = (body.items && body.items.length > 0) || body.type === 'compound' ? 1 : 0;

  // دوره مالی پیش‌فرض اگر ارسال نشده بود
  let fiscalYearId = body.fiscalYearId ?? null;
  if (!fiscalYearId) {
    const activeFy = await c.env.DB.prepare('SELECT id FROM fiscal_years WHERE user_id = ? AND is_active = 1 LIMIT 1')
      .bind(userId)
      .first<{ id: string }>();
    fiscalYearId = activeFy?.id ?? 'fiscal_1405';
  }

  const statements: D1PreparedStatement[] = [];

  // ۱. ثبت سربرگ سند در جدول transactions
  statements.push(
    c.env.DB.prepare(
      `INSERT INTO transactions (
        id, user_id, fiscal_year_id, type, amount, from_account_id, to_account_id,
        category_id, counterparty_id, description, tag, raw_sms_id,
        transaction_date, shamsi_date, time, is_compound
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      userId,
      fiscalYearId,
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
      body.shamsiDate ?? null,
      time,
      isCompound
    )
  );

  // ۲. در صورتی که تراکنش مرکب (چند مبدا یا چند مقصد) باشد:
  if (isCompound && body.items && body.items.length > 0) {
    for (const it of body.items) {
      const itId = `txi_${crypto.randomUUID()}`;
      const itAmt = Math.round(it.amount);
      statements.push(
        c.env.DB.prepare(
          `INSERT INTO transaction_items (
            id, transaction_id, user_id, entry_type, account_id, category_id, counterparty_id, amount, description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          itId,
          id,
          userId,
          it.entryType,
          it.accountId ?? null,
          it.categoryId ?? null,
          it.counterpartyId ?? null,
          itAmt,
          it.description ?? null
        )
      );

      // بروزرسانی مانده حساب‌ها بر اساس نوع آیتم
      if (it.accountId) {
        if (it.entryType === 'source') {
          // مبدا پرداخت: کاهش مانده
          statements.push(
            c.env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?')
              .bind(itAmt, it.accountId, userId)
          );
        } else {
          // مقصد پرداخت: افزایش مانده
          statements.push(
            c.env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?')
              .bind(itAmt, it.accountId, userId)
          );
        }
      }

      // بروزرسانی مانده طرف‌حساب
      if (it.counterpartyId) {
        const cpDelta = it.entryType === 'destination' ? itAmt : -itAmt;
        statements.push(
          c.env.DB.prepare('UPDATE counterparties SET balance = balance + ? WHERE id = ? AND user_id = ?')
            .bind(cpDelta, it.counterpartyId, userId)
        );
      }
    }
  } else {
    // ۳. حالت تک‌مبدا / تک‌مقصد معمولی:
    if (fromAccountId && (body.type === 'debit' || body.type === 'transfer')) {
      statements.push(
        c.env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?')
          .bind(amount, fromAccountId, userId)
      );
    }
    if (toAccountId && (body.type === 'credit' || body.type === 'transfer')) {
      statements.push(
        c.env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?')
          .bind(amount, toAccountId, userId)
      );
    }
    if (counterpartyId) {
      const cpDelta = body.type === 'debit' ? amount : body.type === 'credit' ? -amount : 0;
      if (cpDelta !== 0) {
        statements.push(
          c.env.DB.prepare('UPDATE counterparties SET balance = balance + ? WHERE id = ? AND user_id = ?')
            .bind(cpDelta, counterpartyId, userId)
        );
      }
    }
  }

  await c.env.DB.batch(statements);

  return c.json({
    success: true,
    data: {
      id,
      userId,
      fiscalYearId,
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
      time,
      isCompound,
    },
  }, 201);
});

/**
 * دریافت جزئیات یک تراکنش همراه با ریز اقلام
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
    .first<Transaction>();

  if (!tx) {
    return c.json({ success: false, error: 'تراکنش پیدا نشد' }, 404);
  }

  // دریافت اقلام سند در صورت وجود
  const items = await c.env.DB.prepare(`
    SELECT 
      ti.id, ti.transaction_id as transactionId, ti.user_id as userId,
      ti.entry_type as entryType, ti.account_id as accountId,
      ti.category_id as categoryId, ti.counterparty_id as counterpartyId,
      ti.amount, ti.description, ti.created_at as createdAt,
      a.name as accountName, c.name as categoryName, cp.name as counterpartyName
    FROM transaction_items ti
    LEFT JOIN accounts a ON ti.account_id = a.id
    LEFT JOIN categories c ON ti.category_id = c.id
    LEFT JOIN counterparties cp ON ti.counterparty_id = cp.id
    WHERE ti.transaction_id = ?
  `).bind(id).all<TransactionItem>();

  tx.items = items.results || [];

  return c.json({ success: true, data: tx });
});

/**
 * حذف یک تراکنش با بازگرداندن دقیق مانده‌های حساب‌ها
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

  // بررسی اقلام مرکب
  const items = await c.env.DB.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?')
    .bind(id)
    .all<any>();

  if (items.results && items.results.length > 0) {
    for (const it of items.results) {
      if (it.account_id) {
        if (it.entry_type === 'source') {
          // بازگرداندن وجه به حساب مبدا (+)
          statements.push(
            c.env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?')
              .bind(it.amount, it.account_id, userId)
          );
        } else {
          // کسر وجه از حساب مقصد (-)
          statements.push(
            c.env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?')
              .bind(it.amount, it.account_id, userId)
          );
        }
      }
      if (it.counterparty_id) {
        const cpDelta = it.entry_type === 'destination' ? -it.amount : it.amount;
        statements.push(
          c.env.DB.prepare('UPDATE counterparties SET balance = balance + ? WHERE id = ? AND user_id = ?')
            .bind(cpDelta, it.counterparty_id, userId)
        );
      }
    }
    statements.push(c.env.DB.prepare('DELETE FROM transaction_items WHERE transaction_id = ?').bind(id));
  } else {
    // بازگردانی حالت ساده
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
    if (tx.counterparty_id) {
      const cpDelta = tx.type === 'debit' ? -tx.amount : tx.type === 'credit' ? tx.amount : 0;
      if (cpDelta !== 0) {
        statements.push(
          c.env.DB.prepare('UPDATE counterparties SET balance = balance + ? WHERE id = ? AND user_id = ?')
            .bind(cpDelta, tx.counterparty_id, userId)
        );
      }
    }
  }

  statements.push(c.env.DB.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').bind(id, userId));
  await c.env.DB.batch(statements);

  return c.json({ success: true, message: 'تراکنش با موفقیت حذف و مانده حساب‌ها اصلاح شد' });
});

/**
 * تبدیل یک تراکنش بانکی به خرج گروهی (دنگ)
 */
transactionsRouter.post('/:id/to-split', async (c) => {
  const txId = c.req.param('id');
  const userId = c.get('userId');
  const body = await c.req.json<{
    groupId: string;
    payerId?: string;
    participantIds?: string[];
    members?: string[];
    description?: string;
  }>();

  if (!body.groupId) {
    return c.json({ success: false, error: 'شناسه گروه دنگ الزامی است' }, 400);
  }

  const tx = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?')
    .bind(txId)
    .first<any>();

  if (!tx) {
    return c.json({ success: false, error: 'تراکنش پیدا نشد' }, 404);
  }

  let members = body.participantIds || body.members;
  if (!members || members.length === 0) {
    const groupMembers = await c.env.DB.prepare(
      'SELECT counterparty_id FROM group_members WHERE group_id = ?'
    )
      .bind(body.groupId)
      .all<{ counterparty_id: string }>();
    members = (groupMembers.results || []).map((m) => m.counterparty_id);
  }

  if (!members || members.length === 0) {
    return c.json({ success: false, error: 'عضوی برای تقسیم دنگ در این گروه یافت نشد' }, 400);
  }

  const payerId = body.payerId || members[0] || userId;
  const splits = calculateEqualSplits(tx.amount, members);
  const expenseId = `ge_${crypto.randomUUID()}`;
  const expenseDesc = body.description || tx.description || 'خرج حاصل از پیامک بانکی';
  const statements: D1PreparedStatement[] = [];

  statements.push(
    c.env.DB.prepare(
      `INSERT INTO group_expenses (id, group_id, payer_id, amount, description, linked_transaction_id, expense_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      expenseId,
      body.groupId,
      payerId,
      tx.amount,
      expenseDesc,
      txId,
      tx.transaction_date || new Date().toISOString()
    )
  );

  for (const s of splits) {
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO expense_splits (expense_id, counterparty_id, owed_amount)
         VALUES (?, ?, ?)`
      ).bind(expenseId, s.userId, s.owedAmount)
    );
  }

  statements.push(
    c.env.DB.prepare('UPDATE transactions SET tag = ? WHERE id = ?')
      .bind('دنگ', txId)
  );

  await c.env.DB.batch(statements);

  return c.json({
    success: true,
    data: {
      expenseId,
      groupId: body.groupId,
      amount: tx.amount,
      description: expenseDesc,
      splits,
    },
  }, 201);
});
