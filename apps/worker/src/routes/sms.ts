import { Hono } from 'hono';
import { parseBankSms, normalizePersianText } from '@jibban/sms-parser-ir';
import { Bindings, Variables } from '../types.js';
import {
  getActiveFiscalYear,
  getCurrentShamsiDateTime,
  resolveAccountPath,
} from '../lib/parmis-core.js';

export const smsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * محاسبه هش پایدار SHA-256 برای متن پیامک نرمالایز شده
 */
export async function computeSmsHash(rawSms: string): Promise<string> {
  const normalized = normalizePersianText(rawSms).replace(/\s+/g, ' ').trim();
  const msgUint8 = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * تطبیق هوشمند پیامک با جدول BankAccounts و Bank پارمیس
 */
async function matchBankAccountFromSms(
  db: D1Database,
  bankName?: string,
  accountNumber?: string
): Promise<{ accountId: number; accountName: string } | null> {
  const cleanAcc = (accountNumber || '').replace(/[^\d]/g, '');
  const cleanBank = (bankName || '').trim();

  if (cleanAcc.length >= 4) {
    const tail = cleanAcc.slice(-4);
    const byNumber = await db
      .prepare(
        `SELECT b.BAc_ac_id as accountId, a.Ac_title as accountName
         FROM BankAccounts b
         INNER JOIN accounts a ON a.Ac_id = b.BAc_ac_id
         WHERE b.BAc_isenable = 1 AND b.read_sms = 1
           AND (
             REPLACE(b.BAc_account_cod, '''', '') LIKE ? OR
             REPLACE(b.BAc_cart_number, '-', '') LIKE ? OR
             REPLACE(b.BAc_sheba, '''', '') LIKE ?
           )
         LIMIT 1`
      )
      .bind(`%${tail}%`, `%${tail}%`, `%${tail}%`)
      .first<{ accountId: number; accountName: string }>();

    if (byNumber) return byNumber;
  }

  if (cleanBank) {
    const byBank = await db
      .prepare(
        `SELECT b.BAc_ac_id as accountId, a.Ac_title as accountName
         FROM BankAccounts b
         INNER JOIN Bank k ON k.id = b.BAc_bank_id
         INNER JOIN accounts a ON a.Ac_id = b.BAc_ac_id
         WHERE b.BAc_isenable = 1 AND b.read_sms = 1
           AND (k.Bank_name LIKE ? OR a.Ac_title LIKE ?)
         LIMIT 1`
      )
      .bind(`%${cleanBank}%`, `%${cleanBank}%`)
      .first<{ accountId: number; accountName: string }>();

    if (byBank) return byBank;
  }

  return null;
}

/**
 * دریافت لیست پیامک‌های در انتظار بررسی (SMS Inbox) همراه با پیشنهاد حساب بانکی متناظر
 */
smsRouter.get('/pending', async (c) => {
  const limit = Math.min(100, parseInt(c.req.query('limit') || '50', 10));
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const { results } = await c.env.DB.prepare(
    `SELECT 
       ID as id,
       Content as rawText,
       Type as smsType,
       Amount as parsedAmountStr,
       BankName as bankName,
       Date as date,
       Time as time,
       AccountNumber as accountNumber,
       Description as description,
       TransactionId as transactionId
     FROM smsTable
     WHERE TransactionId IS NULL OR TransactionId = 0
     ORDER BY ID DESC
     LIMIT ? OFFSET ?`
  )
    .bind(limit, offset)
    .all<any>();

  const list = await Promise.all(
    (results || []).map(async (row: any) => {
      const cleanAmount = row.parsedAmountStr
        ? Number(String(row.parsedAmountStr).replace(/,/g, '').trim()) || 0
        : 0;
      const matched = await matchBankAccountFromSms(c.env.DB, row.bankName, row.accountNumber);

      return {
        id: String(row.id),
        smsHash: `sms_${row.id}`,
        sender: row.bankName || 'بانک',
        rawText: row.rawText || '',
        bankName: row.bankName || 'بانک',
        txType: row.smsType === 3 ? 'credit' : 'debit',
        parsedAmount: cleanAmount,
        parsedAccount: row.accountNumber ? String(row.accountNumber) : undefined,
        suggestedAccountId: matched ? String(matched.accountId) : undefined,
        suggestedAccountName: matched?.accountName,
        status: 'pending',
        receivedAt: `${row.date || ''} ${row.time || ''}`.trim(),
        createdAt: `${row.date || '1405/01/01'}T${row.time || '12:00'}:00.000Z`,
      };
    })
  );

  return c.json({ success: true, data: list });
});

/**
 * دریافت لاگ کلیه پیامک‌های پارمیس
 */
smsRouter.get('/logs', async (c) => {
  const limit = Math.min(200, parseInt(c.req.query('limit') || '50', 10));
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const { results } = await c.env.DB.prepare(
    `SELECT ID as id, Content as rawText, Type as smsType, Amount as amount, BankName as bankName,
            AccountNumber as accountNumber, Date as date, Time as time, TransactionId as transactionId
     FROM smsTable
     ORDER BY ID DESC
     LIMIT ? OFFSET ?`
  )
    .bind(limit, offset)
    .all<any>();

  return c.json({ success: true, data: results || [] });
});

/**
 * ثبت پیامک جدید از لیسنر اندروید در جدول smsTable پارمیس با تطبیق خودکار حساب بانکی
 */
smsRouter.post('/ingest', async (c) => {
  const body = await c.req.json<{
    sender?: string;
    rawText: string;
    receivedAt?: string;
  }>();

  if (!body.rawText || !body.rawText.trim()) {
    return c.json({ success: false, error: 'متن پیامک ارسالی نمی‌تواند خالی باشد' }, 400);
  }

  const rawText = body.rawText.trim();
  const parsed = parseBankSms(rawText, body.sender);

  if (!parsed.isBankSms || parsed.amount <= 0) {
    return c.json({
      success: false,
      isBankSms: false,
      reason: 'non_bank_or_otp',
      message: 'پیامک غیربانکی یا بدون مبلغ تراکنش تشخیص داده شد',
    });
  }

  // جلوگیری از ثبت تکراری پیامک مشابه
  const duplicate = await c.env.DB.prepare('SELECT ID, TransactionId FROM smsTable WHERE Content = ? LIMIT 1')
    .bind(rawText)
    .first<{ ID: number; TransactionId: number }>();

  if (duplicate) {
    return c.json({
      success: true,
      isBankSms: true,
      alreadyProcessed: true,
      data: {
        id: String(duplicate.ID),
        bankName: parsed.bankName,
        parsedAmount: parsed.amount,
        status: duplicate.TransactionId > 0 ? 'processed' : 'pending',
      },
    });
  }

  const { shamsiDate, time } = getCurrentShamsiDateTime(body.receivedAt);
  const dateStr = (parsed.shamsiDate || shamsiDate).replace(/-/g, '/');
  const timeStr = parsed.time || time;
  const amountStr = String(parsed.amount).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const smsType = parsed.type === 'credit' ? 3 : 2; // قرارداد پارمیس: 2=برداشت، 3=واریز

  const matched = await matchBankAccountFromSms(c.env.DB, parsed.bankName, parsed.accountNumber);
  if (!matched && parsed.bankName) {
    const existingUnreg = await c.env.DB.prepare(
      'SELECT id FROM UnregisteredBankSms WHERE bank_name = ? AND COALESCE(bank_account_number, "") = ? LIMIT 1'
    )
      .bind(parsed.bankName, parsed.accountNumber || '')
      .first();
    if (!existingUnreg) {
      await c.env.DB.prepare(
        'INSERT INTO UnregisteredBankSms (bank_name, bank_account_number, read_sms) VALUES (?, ?, 1)'
      )
        .bind(parsed.bankName, parsed.accountNumber || '')
        .run();
    }
  }

  const res = await c.env.DB.prepare(
    `INSERT INTO smsTable (
       Content, Type, BankName, Amount, Date, Time, AccountNumber, Description, TransactionId
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
  )
    .bind(
      rawText,
      smsType,
      parsed.bankName || body.sender || 'بانک',
      amountStr,
      dateStr,
      timeStr,
      parsed.accountNumber || '',
      parsed.description || (parsed.type === 'credit' ? 'واریز' : 'برداشت')
    )
    .run();

  return c.json(
    {
      success: true,
      isBankSms: true,
      alreadyProcessed: false,
      matchedAccountId: matched ? String(matched.accountId) : null,
      matchedAccountName: matched?.accountName ?? null,
      transaction: {
        bankName: parsed.bankName,
        amount: parsed.amount,
        type: parsed.type,
      },
      data: {
        id: String(res.meta.last_row_id),
        bankName: parsed.bankName || body.sender,
        parsedAmount: parsed.amount,
        status: 'pending',
      },
    },
    201
  );
});

/**
 * تایید و تبدیل پیامک به سند مالی واقعی در Activity پارمیس
 */
smsRouter.post('/:id/confirm', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json<{
    type?: 'debit' | 'credit' | 'transfer';
    fromAccountId?: string | number;
    toAccountId?: string | number;
    description?: string;
  }>();

  const sms = await c.env.DB.prepare('SELECT * FROM smsTable WHERE ID = ?').bind(id).first<any>();
  if (!sms) return c.json({ success: false, error: 'پیامک یافت نشد' }, 404);

  const cleanAmount = sms.Amount ? Number(String(sms.Amount).replace(/,/g, '').trim()) || 0 : 0;
  const activeFy = await getActiveFiscalYear(c.env.DB);
  const maxAct = await c.env.DB.prepare('SELECT MAX(Act_id) as maxId FROM Activity').first<{ maxId: number }>();
  const nextActId = (maxAct?.maxId || 0) + 1;

  const txType = body.type || (sms.Type === 3 ? 'credit' : 'debit');
  const matched = await matchBankAccountFromSms(c.env.DB, sms.BankName, sms.AccountNumber);

  const fromAccId = body.fromAccountId
    ? Number(body.fromAccountId)
    : txType === 'credit'
    ? 36
    : matched?.accountId || 4;
  const toAccId = body.toAccountId
    ? Number(body.toAccountId)
    : txType === 'credit'
    ? matched?.accountId || 4
    : 12;

  const recPath = await resolveAccountPath(c.env.DB, fromAccId, txType === 'credit' ? 2 : 4);
  const payPath = await resolveAccountPath(c.env.DB, toAccId, txType === 'debit' ? 1 : 4);

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
      cleanAmount,
      sms.Date || getCurrentShamsiDateTime().shamsiDate,
      sms.Time || '12:00',
      body.description || sms.Description || sms.Content || '',
      recPath.rootId,
      recPath.subaccId,
      recPath.leafId,
      recPath.path,
      payPath.rootId,
      payPath.subaccId,
      payPath.leafId,
      payPath.path,
      activeFy.id
    )
    .run();

  await c.env.DB.prepare('UPDATE smsTable SET TransactionId = ? WHERE ID = ?').bind(nextActId, id).run();

  return c.json({
    success: true,
    data: {
      transactionId: String(nextActId),
      smsId: String(id),
      fiscalYearId: String(activeFy.id),
    },
  });
});

/**
 * رد یا نادیده گرفتن پیامک
 */
smsRouter.post('/:id/ignore', async (c) => {
  const id = Number(c.req.param('id'));
  await c.env.DB.prepare('UPDATE smsTable SET TransactionId = -1 WHERE ID = ?').bind(id).run();
  return c.json({ success: true, message: 'پیامک نادیده گرفته شد' });
});

/**
 * دریافت لیست شماره حساب‌ها/بانک‌های شناسایی‌شده بدون اتصال در BankAccounts
 */
smsRouter.get('/unregistered', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, bank_name as bankName, bank_account_number as accountNumber, read_sms as readSms FROM UnregisteredBankSms ORDER BY id DESC'
  ).all<any>();
  return c.json({ success: true, data: results || [] });
});

/**
 * اتصال یک شماره حساب پیامکی ناشناس به حساب بانکی کاربر در BankAccounts
 */
smsRouter.post('/unregistered/:id/link', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json<{ accountId: string | number }>();
  const accId = Number(body.accountId);
  if (isNaN(accId)) return c.json({ success: false, error: 'شناسه حساب نامعتبر است' }, 400);

  const unreg = await c.env.DB.prepare('SELECT * FROM UnregisteredBankSms WHERE id = ?').bind(id).first<any>();
  if (!unreg) return c.json({ success: false, error: 'مورد یافت نشد' }, 404);

  const bank = await c.env.DB.prepare('SELECT id FROM Bank WHERE Bank_name LIKE ? LIMIT 1')
    .bind(`%${unreg.bank_name || ''}%`)
    .first<{ id: number }>();

  const maxB = await c.env.DB.prepare('SELECT MAX(BAc_id) as maxId FROM BankAccounts').first<{ maxId: number }>();
  const nextBId = (maxB?.maxId || 0) + 1;

  await c.env.DB.prepare(
    `INSERT INTO BankAccounts (BAc_id, BAc_bank_id, BAc_ac_id, BAc_account_cod, BAc_isenable, read_sms)
     VALUES (?, ?, ?, ?, 1, 1)`
  )
    .bind(nextBId, bank?.id || 0, accId, unreg.bank_account_number || '')
    .run();

  await c.env.DB.prepare('DELETE FROM UnregisteredBankSms WHERE id = ?').bind(id).run();

  return c.json({ success: true, message: 'شماره حساب پیامکی با موفقیت به حساب بانکی متصل شد' });
});
