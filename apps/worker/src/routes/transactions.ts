import { Hono } from 'hono';
import { Bindings, Variables, Transaction, TransactionItem } from '../types.js';

export const transactionsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت لیست تراکنش‌ها مستقیماً از Activity پارمیس
 */
transactionsRouter.get('/', async (c) => {
  const typeFilter = c.req.query('type'); // 'debit' | 'credit' | 'transfer' | 'compound'
  const accountId = c.req.query('accountId');
  const fiscalYearId = c.req.query('fiscalYearId');
  const limit = Math.min(1000, parseInt(c.req.query('limit') || '500', 10));
  const offset = parseInt(c.req.query('offset') || '0', 10);

  // کوئری جامع استخراج اسناد از Activity به همراه نام حساب‌ها
  let query = `
    SELECT 
      act.Act_id as id,
      act.Act_amount as amount,
      act.Act_date as shamsiDate,
      act.Act_time as time,
      act.Act_info as description,
      act.Act_multiId as multiId,
      act.Act_multiType as multiType,
      act.Act_Fiscal_id as fiscalYearId,
      act.Act_pay_Root_id as payRootId,
      act.Act_rec_Root_id as recRootId,
      CASE 
        WHEN act.Act_multiType = 1 THEN 'compound'
        WHEN act.Act_pay_Root_id = 1 THEN 'debit'
        WHEN act.Act_rec_Root_id = 2 THEN 'credit'
        ELSE 'transfer'
      END as inferredType,
      CASE 
        WHEN act.Act_accRecive_id > 0 THEN act.Act_accRecive_id
        WHEN act.Act_rec_Subacc_id > 0 THEN act.Act_rec_Subacc_id
        WHEN act.Act_rec_Root_id > 0 THEN act.Act_rec_Root_id
        ELSE NULL
      END as fromAccountId,
      CASE 
        WHEN act.Act_accPay_id > 0 THEN act.Act_accPay_id
        WHEN act.Act_pay_Subacc_id > 0 THEN act.Act_pay_Subacc_id
        WHEN act.Act_pay_Root_id > 0 THEN act.Act_pay_Root_id
        ELSE NULL
      END as toAccountId,
      fromAcc.Ac_title as fromAccountName,
      toAcc.Ac_title as toAccountName
    FROM Activity act
    LEFT JOIN accounts fromAcc ON fromAcc.Ac_id = (
      CASE 
        WHEN act.Act_accRecive_id > 0 THEN act.Act_accRecive_id
        WHEN act.Act_rec_Subacc_id > 0 THEN act.Act_rec_Subacc_id
        WHEN act.Act_rec_Root_id > 0 THEN act.Act_rec_Root_id
        ELSE NULL
      END
    )
    LEFT JOIN accounts toAcc ON toAcc.Ac_id = (
      CASE 
        WHEN act.Act_accPay_id > 0 THEN act.Act_accPay_id
        WHEN act.Act_pay_Subacc_id > 0 THEN act.Act_pay_Subacc_id
        WHEN act.Act_pay_Root_id > 0 THEN act.Act_pay_Root_id
        ELSE NULL
      END
    )
    WHERE (act.Act_multiType != 2 OR act.Act_multiType IS NULL)
  `;

  const params: unknown[] = [];

  if (fiscalYearId) {
    query += ` AND act.Act_Fiscal_id = ?`;
    params.push(Number(fiscalYearId));
  }

  if (accountId) {
    const accNum = Number(accountId);
    query += ` AND (
      act.Act_accRecive_id = ? OR act.Act_rec_Subacc_id = ? OR act.Act_rec_Root_id = ? OR
      act.Act_accPay_id = ? OR act.Act_pay_Subacc_id = ? OR act.Act_pay_Root_id = ?
    )`;
    params.push(accNum, accNum, accNum, accNum, accNum, accNum);
  }

  query += ` ORDER BY act.Act_date DESC, act.Act_time DESC, act.Act_id DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...params).all<any>();
  const rawList = results || [];

  // پیدا کردن سندهای مرکب برای الحاق اقلام (multiType = 2)
  const compoundMultiIds = rawList
    .filter(row => row.multiId > 0 && row.multiType === 1)
    .map(row => Number(row.multiId));

  const itemsByMultiId = new Map<number, TransactionItem[]>();

  if (compoundMultiIds.length > 0) {
    const placeholders = compoundMultiIds.map(() => '?').join(',');
    const itemQuery = `
      SELECT 
        act.Act_id as id,
        act.Act_multiId as multiId,
        act.Act_amount as amount,
        act.Act_info as description,
        CASE 
          WHEN act.Act_accPay_id > 0 THEN act.Act_accPay_id
          WHEN act.Act_pay_Subacc_id > 0 THEN act.Act_pay_Subacc_id
          ELSE NULL
        END as toAccountId,
        acc.Ac_title as toAccountName
      FROM Activity act
      LEFT JOIN accounts acc ON acc.Ac_id = (
        CASE 
          WHEN act.Act_accPay_id > 0 THEN act.Act_accPay_id
          WHEN act.Act_pay_Subacc_id > 0 THEN act.Act_pay_Subacc_id
          ELSE NULL
        END
      )
      WHERE act.Act_multiType = 2 AND act.Act_multiId IN (${placeholders})
      ORDER BY act.Act_id ASC
    `;
    const itemRes = await c.env.DB.prepare(itemQuery).bind(...compoundMultiIds).all<any>();
    (itemRes.results || []).forEach((row: any) => {
      const mId = Number(row.multiId);
      if (!itemsByMultiId.has(mId)) {
        itemsByMultiId.set(mId, []);
      }
      itemsByMultiId.get(mId)!.push({
        id: String(row.id),
        amount: Math.round(Number(row.amount || 0)),
        description: row.description || undefined,
        accountId: row.toAccountId ? String(row.toAccountId) : null,
        accountName: row.toAccountName || undefined,
        categoryName: row.toAccountName || undefined,
      });
    });
  }

  // مپینگ نهایی به مدل Transaction فرانت‌اند
  const transactions: Transaction[] = rawList.map((row: any) => {
    const isCompound = row.inferredType === 'compound' || (row.multiId > 0 && row.multiType === 1);
    const items = isCompound ? (itemsByMultiId.get(Number(row.multiId)) || []) : undefined;

    return {
      id: String(row.id),
      userId: 'user_default',
      fiscalYearId: row.fiscalYearId ? String(row.fiscalYearId) : '3',
      type: isCompound ? 'compound' : row.inferredType,
      amount: Math.round(Number(row.amount || 0)),
      fromAccountId: row.fromAccountId ? String(row.fromAccountId) : null,
      fromAccountName: row.fromAccountName || (row.inferredType === 'credit' ? 'درآمد' : undefined),
      toAccountId: row.toAccountId ? String(row.toAccountId) : null,
      toAccountName: row.toAccountName || (isCompound ? 'چند مقصدی' : undefined),
      categoryName: row.inferredType === 'debit' ? row.toAccountName : (row.inferredType === 'credit' ? row.toAccountName : undefined),
      description: row.description || '',
      shamsiDate: row.shamsiDate || '',
      transactionDate: row.shamsiDate ? row.shamsiDate.replace(/\//g, '-') : '',
      time: row.time || '',
      isCompound,
      items,
      createdAt: `${row.shamsiDate || '1405-01-01'}T${row.time || '12:00'}:00.000Z`,
    };
  });

  if (typeFilter) {
    return c.json({
      success: true,
      data: transactions.filter(t => t.type === typeFilter),
    });
  }

  return c.json({ success: true, data: transactions });
});

/**
 * ثبت تراکنش جدید (ساده یا چند حسابی مرکب) در جدول Activity
 */
transactionsRouter.post('/', async (c) => {
  const body = await c.req.json<{
    type?: 'debit' | 'credit' | 'transfer' | 'compound';
    amount: number;
    fromAccountId?: string | number;
    toAccountId?: string | number;
    description?: string;
    shamsiDate?: string;
    time?: string;
    isCompound?: boolean;
    items?: Array<{
      accountId: string | number;
      amount: number;
      description?: string;
    }>;
  }>();

  if (!body.amount || body.amount <= 0) {
    return c.json({ success: false, error: 'مبلغ تراکنش باید بزرگتر از صفر باشد' }, 400);
  }

  // تاریخ و ساعت شمسی پیش‌فرض
  const now = new Date();
  const time = body.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const shamsiDate = body.shamsiDate || '1405/08/15';

  const maxActRow = await c.env.DB.prepare('SELECT MAX(Act_id) as maxId FROM Activity').first<{ maxId: number }>();
  let nextActId = (maxActRow?.maxId || 5550) + 1;

  const isCompound = body.type === 'compound' || body.isCompound || (body.items && body.items.length > 1);

  if (isCompound && body.items && body.items.length > 0) {
    // سند چند مقصدی / مرکب
    const maxMultiRow = await c.env.DB.prepare('SELECT MAX(MultiId) as maxMId FROM MultiActivity').first<{ maxMId: number }>();
    const nextMultiId = (maxMultiRow?.maxMId || 440) + 1;

    // ۱. ثبت در MultiActivity
    await c.env.DB.prepare(
      'INSERT INTO MultiActivity (MultiId, Date, Time, Info, Serial, Type) VALUES (?, ?, ?, ?, ?, 1)'
    ).bind(nextMultiId, shamsiDate, time, body.description || '', nextActId).run();

    // ۲. ثبت رکورد سربرگ در Activity (نوع ۱)
    const fromAccId = Number(body.fromAccountId) || 173;
    await c.env.DB.prepare(
      `INSERT INTO Activity (
        Act_id, Act_amount, Act_date, Act_time, Act_info,
        Act_rec_Subacc_id, Act_rec_Root_id, Act_pay_Root_id, Act_accPay_id,
        Act_multiId, Act_multiType, Act_Fiscal_id, Act_iscash, Act_set
      ) VALUES (?, ?, ?, ?, ?, ?, 4, -1, -1, ?, 1, 3, 1, 1)`
    ).bind(
      nextActId,
      body.amount,
      shamsiDate,
      time,
      body.description || '',
      fromAccId,
      nextMultiId
    ).run();

    // به‌روزرسانی مانده حساب مبدا
    await c.env.DB.prepare(
      'UPDATE accounts SET Ac_balance = Ac_balance - ? WHERE Ac_id = ?'
    ).bind(body.amount, fromAccId).run();

    // ۳. ثبت اقلام ریزهزینه (نوع ۲)
    for (const item of body.items) {
      nextActId++;
      const itemAccId = Number(item.accountId);
      await c.env.DB.prepare(
        `INSERT INTO Activity (
          Act_id, Act_amount, Act_date, Act_time, Act_info,
          Act_accPay_id, Act_pay_Root_id, Act_rec_Root_id,
          Act_multiId, Act_multiType, Act_Fiscal_id, Act_iscash, Act_set
        ) VALUES (?, ?, ?, ?, ?, ?, 1, -1, ?, 2, 3, 1, 1)`
      ).bind(
        nextActId,
        item.amount,
        shamsiDate,
        time,
        item.description || body.description || '',
        itemAccId,
        nextMultiId
      ).run();

      // افزایش هزینه مربوطه
      await c.env.DB.prepare(
        'UPDATE accounts SET Ac_balance = Ac_balance + ? WHERE Ac_id = ?'
      ).bind(item.amount, itemAccId).run();
    }

    return c.json({
      success: true,
      data: {
        id: String(nextActId - body.items.length),
        amount: body.amount,
        type: 'compound',
        multiId: nextMultiId,
      },
    }, 201);
  }

  // سند ساده (هزینه، درآمد، انتقال)
  const txType = body.type || 'debit';
  let payRoot = -1;
  let recRoot = -1;
  let payAcc = -1;
  let recAcc = -1;

  if (txType === 'debit') {
    // برداشت از بانک/صندوق به حساب هزینه
    recRoot = 4;
    recAcc = Number(body.fromAccountId) || 173;
    payRoot = 1;
    payAcc = Number(body.toAccountId) || 51;
  } else if (txType === 'credit') {
    // درآمد به حساب بانک/صندوق
    recRoot = 4;
    recAcc = Number(body.toAccountId) || 173;
    payRoot = 2;
    payAcc = Number(body.fromAccountId) || 36;
  } else {
    // انتقال بین بانکی
    recRoot = 4;
    recAcc = Number(body.fromAccountId) || 173;
    payRoot = 4;
    payAcc = Number(body.toAccountId) || 174;
  }

  await c.env.DB.prepare(
    `INSERT INTO Activity (
      Act_id, Act_amount, Act_date, Act_time, Act_info,
      Act_rec_Subacc_id, Act_rec_Root_id, Act_accPay_id, Act_pay_Root_id,
      Act_multiId, Act_multiType, Act_Fiscal_id, Act_iscash, Act_set
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 3, 1, 1)`
  ).bind(
    nextActId,
    body.amount,
    shamsiDate,
    time,
    body.description || '',
    recAcc,
    recRoot,
    payAcc,
    payRoot
  ).run();

  // اعمال اثر بر مانده حساب‌ها
  if (txType === 'debit') {
    await c.env.DB.prepare('UPDATE accounts SET Ac_balance = Ac_balance - ? WHERE Ac_id = ?').bind(body.amount, recAcc).run();
  } else if (txType === 'credit') {
    await c.env.DB.prepare('UPDATE accounts SET Ac_balance = Ac_balance + ? WHERE Ac_id = ?').bind(body.amount, recAcc).run();
  } else if (txType === 'transfer') {
    await c.env.DB.prepare('UPDATE accounts SET Ac_balance = Ac_balance - ? WHERE Ac_id = ?').bind(body.amount, recAcc).run();
    await c.env.DB.prepare('UPDATE accounts SET Ac_balance = Ac_balance + ? WHERE Ac_id = ?').bind(body.amount, payAcc).run();
  }

  return c.json({
    success: true,
    data: {
      id: String(nextActId),
      amount: body.amount,
      type: txType,
      shamsiDate,
      time,
    },
  }, 201);
});

/**
 * دریافت جزئیات یک سند
 */
transactionsRouter.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) return c.json({ success: false, error: 'شناسه سند نامعتبر است' }, 400);

  const row = await c.env.DB.prepare(
    `SELECT act.*, fromAcc.Ac_title as fromTitle, toAcc.Ac_title as toTitle
     FROM Activity act
     LEFT JOIN accounts fromAcc ON fromAcc.Ac_id = act.Act_rec_Subacc_id
     LEFT JOIN accounts toAcc ON toAcc.Ac_id = act.Act_accPay_id
     WHERE act.Act_id = ?`
  ).bind(id).first<any>();

  if (!row) {
    return c.json({ success: false, error: 'سند یافت نشد' }, 404);
  }

  return c.json({ success: true, data: row });
});

/**
 * حذف یک سند
 */
transactionsRouter.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) return c.json({ success: false, error: 'شناسه نامعتبر است' }, 400);

  const act = await c.env.DB.prepare('SELECT * FROM Activity WHERE Act_id = ?').bind(id).first<any>();
  if (!act) return c.json({ success: false, error: 'سند پیدا نشد' }, 404);

  // اگر مرکب است، همه اقلام حذف شوند
  if (act.Act_multiId > 0) {
    await c.env.DB.prepare('DELETE FROM Activity WHERE Act_multiId = ?').bind(act.Act_multiId).run();
    await c.env.DB.prepare('DELETE FROM MultiActivity WHERE MultiId = ?').bind(act.Act_multiId).run();
  } else {
    await c.env.DB.prepare('DELETE FROM Activity WHERE Act_id = ?').bind(id).run();
  }

  return c.json({ success: true, message: 'سند با موفقیت حذف شد' });
});
