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
 * حدس هوشمند دسته‌بندی هزینه بر اساس توضیحات یا نوع تراکنش
 */
function autoDetectCategory(description?: string, type?: 'debit' | 'credit'): string {
  if (type === 'credit') {
    return 'cat_transfer';
  }

  if (!description) return 'cat_other';
  const desc = description.toLowerCase();

  if (/فروشگاه|هایپر|کوروش|جانبو|سوپر|پروتئین|میوه|نان|نانوایی/.test(desc)) {
    return 'cat_supermarket';
  }
  if (/اسنپ|تپسی|بنزین|جایگاه|سوخت|تاکسی|کرایه|مترو/.test(desc)) {
    return 'cat_transport';
  }
  if (/رستوران|کافه|پیتزا|فست فود|فستفود|ساندویچ|کباب|چلو/.test(desc)) {
    return 'cat_restaurant';
  }
  if (/قبض|برق|گاز|آب|همراه اول|ایرانسل|رایتل|مخابرات|شارژ/.test(desc)) {
    return 'cat_bills';
  }
  if (/دیجی کالا|دیجیکالا|پوشاک|لباس|کفش|کیف|بازار/.test(desc)) {
    return 'cat_shopping';
  }
  if (/داروخانه|درمانگاه|بیمارستان|پزشک|دندان|آزمایشگاه/.test(desc)) {
    return 'cat_health';
  }

  return 'cat_other';
}

/**
 * دریافت گزارش پیامک‌های خام ثبت شده و وضعیت آن‌ها
 */
smsRouter.get('/logs', async (c) => {
  const userId = c.get('userId');
  const limit = Math.min(200, parseInt(c.req.query('limit') || '50', 10));
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM raw_sms WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(userId, limit, offset)
    .all();

  return c.json({ success: true, data: results });
});

/**
 * دریافت متن پیامک از اپ اندروید، استخراج پارامترها و ذخیره در پایگاه داده
 * همراه با تشخیص هش یکتا برای جلوگیری از ثبت تکراری و حفظ سابقه حذف‌های کاربر
 */
smsRouter.post('/ingest', async (c) => {
  const body = await c.req.json<{
    rawSms?: string;
    syncToken?: string;
    sender?: string;
    timestamp?: number;
  }>();
  const rawSms = body.rawSms;

  if (!rawSms || typeof rawSms !== 'string') {
    return c.json({ success: false, error: 'متن پیامک معتبر نیست' }, 400);
  }

  // ۱. اعتبارسنجی کاربر
  let userId = c.get('userId');
  if (body.syncToken) {
    const user = await c.env.DB.prepare('SELECT id FROM users WHERE sync_token = ?')
      .bind(body.syncToken)
      .first<{ id: string }>();
    if (user) {
      userId = user.id;
    }
  }

  // ۲. محاسبه هش یکتای پیامک
  const smsHash = await computeSmsHash(rawSms);
  const receivedAt = body.timestamp
    ? new Date(body.timestamp).toISOString()
    : new Date().toISOString();

  // ۳. بررسی دیتابیس پیامک‌های قبلی (Deduplication & Deleted Retention)
  const existingSms = await c.env.DB.prepare(
    'SELECT id, status, transaction_id FROM raw_sms WHERE sms_hash = ? AND user_id = ?'
  )
    .bind(smsHash, userId)
    .first<{ id: string; status: 'processed' | 'ignored' | 'deleted' | 'manual'; transaction_id: string | null }>();

  if (existingSms) {
    if (existingSms.status === 'deleted') {
      return c.json(
        {
          success: true,
          alreadyProcessed: true,
          status: 'deleted',
          message: 'این پیامک قبلاً توسط کاربر حذف شده و برای جلوگیری از بازگشت نادیده گرفته شد',
        },
        200
      );
    }

    if (existingSms.status === 'processed') {
      return c.json(
        {
          success: true,
          alreadyProcessed: true,
          status: 'processed',
          transactionId: existingSms.transaction_id,
          message: 'این پیامک قبلاً ثبت شده است (جلوگیری از رکورد تکراری)',
        },
        200
      );
    }

    if (existingSms.status === 'ignored') {
      return c.json(
        {
          success: false,
          alreadyProcessed: true,
          isBankSms: false,
          message: 'پیامک قبلاً غیربانکی تشخیص داده شده است',
        },
        200
      );
    }
  }

  // ۴. استخراج و پارس پیامک با موتور @jibban/sms-parser-ir
  const parsed = parseBankSms(rawSms);

  if (!parsed.isBankSms || parsed.amount <= 0) {
    // ثبت در پایگاه داده پیامک‌های خام با وضعیت نادیده‌گرفته‌شده (ignored)
    await c.env.DB.prepare(
      `INSERT INTO raw_sms (id, sms_hash, user_id, sender, raw_text, status, received_at)
       VALUES (?, ?, ?, ?, ?, 'ignored', ?)`
    )
      .bind(smsHash, smsHash, userId, body.sender ?? null, rawSms, receivedAt)
      .run();

    return c.json(
      {
        success: false,
        isBankSms: false,
        message: 'پیامک غیربانکی یا فاقد مبلغ تراکنش تشخیص داده شد',
      },
      200
    );
  }

  // ۵. حدس دسته‌بندی اولیه و ایجاد شناسه تراکنش
  const categoryId = autoDetectCategory(parsed.description, parsed.type);
  const transactionId = `tx_${crypto.randomUUID()}`;
  const transactionDate = parsed.transactionDate || receivedAt;

  // ۶. ثبت تراکنش و پیامک خام به صورت یکپارچه با DB.batch
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO transactions (
        id, user_id, bank_name, account_number, amount, type,
        balance, category_id, description, raw_sms, sms_hash, transaction_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      transactionId,
      userId,
      parsed.bankName,
      parsed.accountNumber ?? null,
      parsed.amount,
      parsed.type,
      parsed.balance ?? null,
      categoryId,
      parsed.description ?? null,
      rawSms,
      smsHash,
      transactionDate
    ),
    c.env.DB.prepare(
      `INSERT INTO raw_sms (
        id, sms_hash, user_id, sender, raw_text, status, transaction_id, received_at
      ) VALUES (?, ?, ?, ?, ?, 'processed', ?, ?)`
    ).bind(
      smsHash,
      smsHash,
      userId,
      body.sender ?? null,
      rawSms,
      transactionId,
      receivedAt
    ),
  ]);

  const createdTx = {
    id: transactionId,
    userId,
    bankName: parsed.bankName,
    accountNumber: parsed.accountNumber,
    amount: parsed.amount,
    type: parsed.type,
    balance: parsed.balance,
    categoryId,
    description: parsed.description,
    rawSms,
    smsHash,
    transactionDate,
  };

  return c.json(
    {
      success: true,
      isBankSms: true,
      message: 'پیامک بانکی با موفقیت پردازش و ذخیره شد',
      transaction: createdTx,
    },
    201
  );
});
