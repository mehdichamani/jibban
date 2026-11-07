import { Hono } from 'hono';
import { parseBankSms, normalizePersianText } from '@jibban/sms-parser-ir';
import { Bindings, Variables } from '../types.js';

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
 * دریافت لیست پیامک‌های در انتظار بررسی (SMS Inbox) مستقیم از smsTable پارمیس
 */
smsRouter.get('/pending', async (c) => {
  const limit = Math.min(100, parseInt(c.req.query('limit') || '50', 10));
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const { results } = await c.env.DB.prepare(
    `SELECT 
       ID as id,
       Content as rawText,
       Amount as parsedAmountStr,
       BankName as bankName,
       Date as date,
       Time as time,
       AccountNumber as accountNumber,
       Description as description,
       TransactionId as transactionId
     FROM smsTable
     WHERE TransactionId IS NULL OR TransactionId = 0 OR TransactionId = -1
     ORDER BY ID DESC
     LIMIT ? OFFSET ?`
  ).bind(limit, offset).all<any>();

  const list = (results || []).map((row: any) => {
    // تبدیل مقدار مبلغ به عدد ریالی
    let cleanAmount = 0;
    if (row.parsedAmountStr) {
      cleanAmount = Number(String(row.parsedAmountStr).replace(/,/g, '').trim()) || 0;
    }

    return {
      id: String(row.id),
      smsHash: `sms_${row.id}`,
      sender: row.bankName || 'بانک',
      rawText: row.rawText || '',
      bankName: row.bankName || 'بانک',
      parsedAmount: cleanAmount,
      parsedAccount: row.accountNumber ? String(row.accountNumber) : undefined,
      status: 'pending',
      receivedAt: `${row.date || '1405-08-15'} ${row.time || '12:00'}`,
      createdAt: `${row.date || '1405-08-15'}T${row.time || '12:00'}:00.000Z`,
    };
  });

  return c.json({ success: true, data: list });
});

/**
 * دریافت لاگ کلیه پیامک‌های پارمیس
 */
smsRouter.get('/logs', async (c) => {
  const limit = Math.min(200, parseInt(c.req.query('limit') || '50', 10));
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const { results } = await c.env.DB.prepare(
    `SELECT ID as id, Content as rawText, Amount as amount, BankName as bankName, Date as date, Time as time, TransactionId as transactionId
     FROM smsTable
     ORDER BY ID DESC
     LIMIT ? OFFSET ?`
  ).bind(limit, offset).all<any>();

  return c.json({ success: true, data: results || [] });
});

/**
 * ثبت پیامک جدید از لیسنر اندروید در جدول smsTable پارمیس
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

  // ۱. پارس با موتور پیامک بانکی
  const parsed = parseBankSms(body.rawText, body.sender);

  // ۲. فرمت تاریخ و ساعت شمسی
  const now = new Date();
  const dateStr = '1405/08/15';
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const amountStr = parsed?.amount ? String(parsed.amount).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0';

  const res = await c.env.DB.prepare(
    `INSERT INTO smsTable (
       Content, BankName, Amount, Date, Time, AccountNumber, Description, TransactionId
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
  ).bind(
    body.rawText.trim(),
    parsed?.bankName || body.sender || 'بانک',
    amountStr,
    dateStr,
    timeStr,
    parsed?.accountNumber || '',
    parsed?.type === 'credit' ? 'واریز' : 'برداشت'
  ).run();

  return c.json({
    success: true,
    data: {
      id: res.meta.last_row_id,
      bankName: parsed?.bankName || body.sender,
      parsedAmount: parsed?.amount || 0,
      status: 'pending',
    },
  }, 201);
});

/**
 * تایید و تبدیل پیامک به سند مالی
 */
smsRouter.post('/:id/confirm', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json<{
    fromAccountId?: string | number;
    toAccountId?: string | number;
    description?: string;
  }>();

  const sms = await c.env.DB.prepare('SELECT * FROM smsTable WHERE ID = ?').bind(id).first<any>();
  if (!sms) return c.json({ success: false, error: 'پیامک یافت نشد' }, 404);

  let cleanAmount = 0;
  if (sms.Amount) {
    cleanAmount = Number(String(sms.Amount).replace(/,/g, '').trim()) || 0;
  }

  const maxAct = await c.env.DB.prepare('SELECT MAX(Act_id) as maxId FROM Activity').first<{ maxId: number }>();
  const nextActId = (maxAct?.maxId || 5550) + 1;

  const fromAcc = Number(body.fromAccountId) || 173;
  const toAcc = Number(body.toAccountId) || 51;

  // ثبت در Activity
  await c.env.DB.prepare(
    `INSERT INTO Activity (
      Act_id, Act_amount, Act_date, Act_time, Act_info,
      Act_rec_Subacc_id, Act_rec_Root_id, Act_accPay_id, Act_pay_Root_id,
      Act_multiId, Act_multiType, Act_Fiscal_id, Act_iscash, Act_set
    ) VALUES (?, ?, ?, ?, ?, ?, 4, ?, 1, 0, 0, 3, 1, 1)`
  ).bind(
    nextActId,
    cleanAmount,
    sms.Date || '1405/08/15',
    sms.Time || '12:00',
    body.description || sms.Content || '',
    fromAcc,
    toAcc
  ).run();

  // اتصال پیامک به سند
  await c.env.DB.prepare('UPDATE smsTable SET TransactionId = ? WHERE ID = ?').bind(nextActId, id).run();

  // به‌روزرسانی مانده
  await c.env.DB.prepare('UPDATE accounts SET Ac_balance = Ac_balance - ? WHERE Ac_id = ?').bind(cleanAmount, fromAcc).run();

  return c.json({
    success: true,
    data: {
      transactionId: String(nextActId),
      smsId: String(id),
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
