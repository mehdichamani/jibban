import { Hono } from 'hono';
import { Bindings, Variables, Transaction, TransactionItem } from '../types.js';
import {
  getActiveFiscalYear,
  getCurrentShamsiDateTime,
  resolveAccountPath,
  pickLeafAccountId,
} from '../lib/parmis-core.js';

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

  const compoundMultiIds = rawList
    .filter((row) => row.multiId > 0 && row.multiType === 1)
    .map((row) => Number(row.multiId));

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
          WHEN act.Act_pay_Root_id > 0 THEN act.Act_pay_Root_id
          ELSE NULL
        END as toAccountId,
        acc.Ac_title as toAccountName
      FROM Activity act
      LEFT JOIN accounts acc ON acc.Ac_id = (
        CASE 
          WHEN act.Act_accPay_id > 0 THEN act.Act_accPay_id
          WHEN act.Act_pay_Subacc_id > 0 THEN act.Act_pay_Subacc_id
          WHEN act.Act_pay_Root_id > 0 THEN act.Act_pay_Root_id
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

  const transactions: Transaction[] = rawList.map((row: any) => {
    const isCompound = row.inferredType === 'compound' || (row.multiId > 0 && row.multiType === 1);
    const items = isCompound ? itemsByMultiId.get(Number(row.multiId)) || [] : undefined;

    return {
      id: String(row.id),
      userId: 'user_default',
      fiscalYearId: row.fiscalYearId ? String(row.fiscalYearId) : '1',
      type: isCompound ? 'compound' : row.inferredType,
      amount: Math.round(Number(row.amount || 0)),
      fromAccountId: row.fromAccountId ? String(row.fromAccountId) : null,
      fromAccountName: row.fromAccountName || (row.inferredType === 'credit' ? 'درآمد' : undefined),
      toAccountId: row.toAccountId ? String(row.toAccountId) : null,
      toAccountName: row.toAccountName || (isCompound ? 'چند مقصدی' : undefined),
      categoryName:
        row.inferredType === 'debit'
          ? row.toAccountName
          : row.inferredType === 'credit'
          ? row.fromAccountName
          : undefined,
      description: row.description || '',
      shamsiDate: row.shamsiDate || '',
      transactionDate: row.shamsiDate ? row.shamsiDate.replace(/\//g, '-') : '',
      time: row.time || '',
      isCompound,
      items,
      createdAt: `${row.shamsiDate || '1405/01/01'}T${row.time || '12:00'}:00.000Z`,
    };
  });

  if (typeFilter) {
    return c.json({
      success: true,
      data: transactions.filter((t) => t.type === typeFilter),
    });
  }

  return c.json({ success: true, data: transactions });
});

/**
 * ثبت تراکنش جدید (ساده یا چند حسابی مرکب) با رعایت کامل سلسله‌مراتب ۳ سطحی و سال مالی فعال پارمیس
 */
transactionsRouter.post('/', async (c) => {
  const body = await c.req.json<{
    type?: 'debit' | 'credit' | 'transfer' | 'compound';
    amount: number;
    fromAccountId?: string | number | null;
    toAccountId?: string | number | null;
    fiscalYearId?: string | number;
    description?: string;
    shamsiDate?: string;
    transactionDate?: string;
    time?: string;
    isCompound?: boolean;
    items?: Array<{
      accountId?: string | number | null;
      amount: number;
      description?: string | null;
    }>;
  }>();

  if (!body.amount || body.amount <= 0) {
    return c.json({ success: false, error: 'مبلغ تراکنش باید بزرگتر از صفر باشد' }, 400);
  }

  const activeFy = await getActiveFiscalYear(c.env.DB);
  const fiscalId = body.fiscalYearId ? Number(body.fiscalYearId) : activeFy.id;
  const nowShamsi = getCurrentShamsiDateTime(body.transactionDate);
  const shamsiDate = (body.shamsiDate || nowShamsi.shamsiDate).replace(/-/g, '/');
  const time = body.time || nowShamsi.time;

  const maxActRow = await c.env.DB.prepare('SELECT MAX(Act_id) as maxId FROM Activity').first<{ maxId: number }>();
  let nextActId = (maxActRow?.maxId || 0) + 1;

  const isCompound = body.type === 'compound' || body.isCompound || (body.items && body.items.length > 1);

  if (isCompound && body.items && body.items.length > 0) {
    const maxMultiRow = await c.env.DB.prepare('SELECT MAX(MultiId) as maxMId FROM MultiActivity').first<{ maxMId: number }>();
    const nextMultiId = (maxMultiRow?.maxMId || 0) + 1;

    await c.env.DB.prepare(
      'INSERT INTO MultiActivity (MultiId, Date, Time, Info, Serial, Type) VALUES (?, ?, ?, ?, ?, 1)'
    ).bind(nextMultiId, shamsiDate, time, body.description || '', nextActId).run();

    const fromAccId = body.fromAccountId ? Number(body.fromAccountId) : null;
    const fromPath = await resolveAccountPath(c.env.DB, fromAccId, 4);
    const headerActId = nextActId;

    await c.env.DB.prepare(
      `INSERT INTO Activity (
        Act_id, Act_amount, Act_date, Act_time, Act_info,
        Act_rec_Root_id, Act_rec_Subacc_id, Act_accRecive_id, RecivePath,
        Act_pay_Root_id, Act_pay_Subacc_id, Act_accPay_id, PayPath,
        Act_multiId, Act_multiType, Act_Fiscal_id, Act_iscash, Act_set
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, -1, -1, -1, '', ?, 1, ?, 1, 1)`
    )
      .bind(
        headerActId,
        body.amount,
        shamsiDate,
        time,
        body.description || '',
        fromPath.rootId,
        fromPath.subaccId,
        fromPath.leafId,
        fromPath.path,
        nextMultiId,
        fiscalId
      )
      .run();

    for (const item of body.items) {
      nextActId++;
      const itemAccId = item.accountId ? Number(item.accountId) : null;
      const itemPath = await resolveAccountPath(c.env.DB, itemAccId, 1);

      await c.env.DB.prepare(
        `INSERT INTO Activity (
          Act_id, Act_amount, Act_date, Act_time, Act_info,
          Act_rec_Root_id, Act_rec_Subacc_id, Act_accRecive_id, RecivePath,
          Act_pay_Root_id, Act_pay_Subacc_id, Act_accPay_id, PayPath,
          Act_multiId, Act_multiType, Act_Fiscal_id, Act_iscash, Act_set
        ) VALUES (?, ?, ?, ?, ?, -1, -1, -1, '', ?, ?, ?, ?, ?, 2, ?, 1, 1)`
      )
        .bind(
          nextActId,
          item.amount,
          shamsiDate,
          time,
          item.description || body.description || '',
          itemPath.rootId,
          itemPath.subaccId,
          itemPath.leafId,
          itemPath.path,
          nextMultiId,
          fiscalId
        )
        .run();
    }

    return c.json(
      {
        success: true,
        data: {
          id: String(headerActId),
          amount: body.amount,
          type: 'compound',
          fiscalYearId: String(fiscalId),
          multiId: nextMultiId,
          shamsiDate,
          time,
        },
      },
      201
    );
  }

  // سند ساده: قرارداد پارمیس همیشه Rec = مبدا (منبع پول) ، Pay = مقصد (مصرف/واریز)
  const txType = body.type || 'debit';
  const fromAccId = body.fromAccountId ? Number(body.fromAccountId) : null;
  const toAccId = body.toAccountId ? Number(body.toAccountId) : null;

  const fallbackFromRoot = txType === 'credit' ? 2 : 4;
  const fallbackToRoot = txType === 'debit' ? 1 : 4;

  const recPath = await resolveAccountPath(c.env.DB, fromAccId, fallbackFromRoot);
  const payPath = await resolveAccountPath(c.env.DB, toAccId, fallbackToRoot);

  await c.env.DB.prepare(
    `INSERT INTO Activity (
      Act_id, Act_amount, Act_date, Act_time, Act_info,
      Act_rec_Root_id, Act_rec_Subacc_id, Act_accRecive_id, RecivePath,
      Act_pay_Root_id, Act_pay_Subacc_id, Act_accPay_id, PayPath,
      Act_multiId, Act_multiType, Act_Fiscal_id, Act_iscash, Act_set
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 1, 1)`
  )
    .bind(
      nextActId,
      body.amount,
      shamsiDate,
      time,
      body.description || '',
      recPath.rootId,
      recPath.subaccId,
      recPath.leafId,
      recPath.path,
      payPath.rootId,
      payPath.subaccId,
      payPath.leafId,
      payPath.path,
      fiscalId
    )
    .run();

  return c.json(
    {
      success: true,
      data: {
        id: String(nextActId),
        amount: body.amount,
        type: txType,
        fiscalYearId: String(fiscalId),
        shamsiDate,
        time,
      },
    },
    201
  );
});

/**
 * ویرایش و اصلاح سند مالی با بازمحاسبه دقیق مانده حساب‌ها
 */
transactionsRouter.patch('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) return c.json({ success: false, error: 'شناسه سند نامعتبر است' }, 400);

  const existing = await c.env.DB.prepare('SELECT * FROM Activity WHERE Act_id = ?').bind(id).first<any>();
  if (!existing) return c.json({ success: false, error: 'سند یافت نشد' }, 404);

  const body = await c.req.json<{
    amount?: number;
    type?: 'debit' | 'credit' | 'transfer' | 'compound';
    fromAccountId?: string | number | null;
    toAccountId?: string | number | null;
    description?: string;
    shamsiDate?: string;
    transactionDate?: string;
    time?: string;
  }>();

  const newAmount = body.amount !== undefined ? Number(body.amount) : Number(existing.Act_amount || 0);
  const newDesc = body.description !== undefined ? body.description : existing.Act_info || '';
  const newDate = (body.shamsiDate || body.transactionDate || existing.Act_date || '').replace(/-/g, '/');
  const newTime = body.time || existing.Act_time || '12:00';

  const oldFromId = pickLeafAccountId(existing.Act_accRecive_id, existing.Act_rec_Subacc_id, existing.Act_rec_Root_id);
  const oldToId = pickLeafAccountId(existing.Act_accPay_id, existing.Act_pay_Subacc_id, existing.Act_pay_Root_id);

  const newFromId = body.fromAccountId !== undefined ? (body.fromAccountId ? Number(body.fromAccountId) : null) : oldFromId;
  const newToId = body.toAccountId !== undefined ? (body.toAccountId ? Number(body.toAccountId) : null) : oldToId;

  const recPath = await resolveAccountPath(c.env.DB, newFromId, existing.Act_rec_Root_id ?? -1);
  const payPath = await resolveAccountPath(c.env.DB, newToId, existing.Act_pay_Root_id ?? -1);

  await c.env.DB.prepare(
    `UPDATE Activity
     SET Act_amount = ?, Act_info = ?, Act_date = ?, Act_time = ?,
         Act_rec_Root_id = ?, Act_rec_Subacc_id = ?, Act_accRecive_id = ?, RecivePath = ?,
         Act_pay_Root_id = ?, Act_pay_Subacc_id = ?, Act_accPay_id = ?, PayPath = ?
     WHERE Act_id = ?`
  )
    .bind(
      newAmount,
      newDesc,
      newDate,
      newTime,
      recPath.rootId,
      recPath.subaccId,
      recPath.leafId,
      recPath.path,
      payPath.rootId,
      payPath.subaccId,
      payPath.leafId,
      payPath.path,
      id
    )
    .run();

  return c.json({ success: true, message: 'سند با موفقیت اصلاح و مانده حساب‌ها بروزرسانی شد' });
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
     LEFT JOIN accounts fromAcc ON fromAcc.Ac_id = (
       CASE WHEN act.Act_accRecive_id > 0 THEN act.Act_accRecive_id
            WHEN act.Act_rec_Subacc_id > 0 THEN act.Act_rec_Subacc_id
            ELSE act.Act_rec_Root_id END
     )
     LEFT JOIN accounts toAcc ON toAcc.Ac_id = (
       CASE WHEN act.Act_accPay_id > 0 THEN act.Act_accPay_id
            WHEN act.Act_pay_Subacc_id > 0 THEN act.Act_pay_Subacc_id
            ELSE act.Act_pay_Root_id END
     )
     WHERE act.Act_id = ?`
  )
    .bind(id)
    .first<any>();

  if (!row) {
    return c.json({ success: false, error: 'سند یافت نشد' }, 404);
  }

  return c.json({ success: true, data: row });
});

/**
 * حذف یک سند همراه با برگرداندن مانده حساب‌ها و آزادسازی پیامک متصل
 */
transactionsRouter.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) return c.json({ success: false, error: 'شناسه نامعتبر است' }, 400);

  const act = await c.env.DB.prepare('SELECT * FROM Activity WHERE Act_id = ?').bind(id).first<any>();
  if (!act) return c.json({ success: false, error: 'سند پیدا نشد' }, 404);

  if (act.Act_multiId > 0) {
    await c.env.DB.prepare('DELETE FROM Activity WHERE Act_multiId = ?').bind(act.Act_multiId).run();
    await c.env.DB.prepare('DELETE FROM MultiActivity WHERE MultiId = ?').bind(act.Act_multiId).run();
  } else {
    await c.env.DB.prepare('DELETE FROM Activity WHERE Act_id = ?').bind(id).run();
  }

  await c.env.DB.prepare('UPDATE smsTable SET TransactionId = 0 WHERE TransactionId = ?').bind(id).run();

  return c.json({ success: true, message: 'سند با موفقیت حذف شد' });
});
