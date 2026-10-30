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
    return 'cat_salary';
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
  if (/قسط|وام|تسهیلات|چک/.test(desc)) {
    return 'cat_installment';
  }
  if (/اجاره|رهن|پول پیش/.test(desc)) {
    return 'cat_housing';
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
 * دریافت متن پیامک از اپ اندروید، استخراج پارامترها و ذخیره در پایگاه داده حسابداری
 * همراه با اتصال خودکار به حساب مبدا یا مقصد و همگام‌سازی موجودی
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

  // ۵. شناسایی یا ایجاد خودکار حساب مبدأ / مقصد متناسب با بانک
  let matchedAccount: { id: string; name: string; balance: number } | null = null;
  if (parsed.accountNumber) {
    matchedAccount = await c.env.DB.prepare(
      'SELECT id, name, balance FROM accounts WHERE user_id = ? AND (account_number = ? OR card_number LIKE ?)'
    )
      .bind(userId, parsed.accountNumber, `%${parsed.accountNumber}%`)
      .first<{ id: string; name: string; balance: number }>();
  }

  if (!matchedAccount && parsed.bankName) {
    matchedAccount = await c.env.DB.prepare(
      'SELECT id, name, balance FROM accounts WHERE user_id = ? AND bank_name LIKE ?'
    )
      .bind(userId, `%${parsed.bankName}%`)
      .first<{ id: string; name: string; balance: number }>();
  }

  // اگر حساب متناظری وجود نداشت، یک حساب جدید برای این بانک تعریف می‌شود
  if (!matchedAccount) {
    const newAccId = `acc_${crypto.randomUUID().slice(0, 8)}`;
    const accName = parsed.bankName ? `بانک ${parsed.bankName}` : 'حساب بانکی';
    const initBal = parsed.balance ?? (parsed.type === 'credit' ? parsed.amount : 0);

    await c.env.DB.prepare(
      `INSERT INTO accounts (id, user_id, name, type, bank_name, account_number, balance, initial_balance, is_source, is_destination)
       VALUES (?, ?, ?, 'bank', ?, ?, ?, ?, 1, 1)`
    )
      .bind(newAccId, userId, accName, parsed.bankName ?? null, parsed.accountNumber ?? null, initBal, initBal)
      .run();

    matchedAccount = { id: newAccId, name: accName, balance: initBal };
  }

  const fromAccountId = parsed.type === 'debit' ? matchedAccount.id : null;
  const toAccountId = parsed.type === 'credit' ? matchedAccount.id : null;

  // ۶. حدس دسته‌بندی اولیه و ایجاد شناسه تراکنش
  const categoryId = autoDetectCategory(parsed.description, parsed.type);
  const transactionId = `tx_${crypto.randomUUID()}`;
  const transactionDate = parsed.transactionDate || receivedAt;

  // ۷. اجرای دسته‌ای ثبت تراکنش، ذخیره پیامک خام و همگام‌سازی موجودی حساب
  const batchStatements: D1PreparedStatement[] = [
    c.env.DB.prepare(
      `INSERT INTO transactions (
        id, user_id, from_account_id, to_account_id, bank_name, account_number, amount, type,
        balance, category_id, description, raw_sms, sms_hash, transaction_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      transactionId,
      userId,
      fromAccountId,
      toAccountId,
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
  ];

  // همگام‌سازی موجودی حساب
  if (parsed.balance !== undefined && parsed.balance !== null) {
    batchStatements.push(
      c.env.DB.prepare('UPDATE accounts SET balance = ? WHERE id = ? AND user_id = ?')
        .bind(parsed.balance, matchedAccount.id, userId)
    );
  } else if (parsed.type === 'debit') {
    batchStatements.push(
      c.env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?')
        .bind(parsed.amount, matchedAccount.id, userId)
    );
  } else if (parsed.type === 'credit') {
    batchStatements.push(
      c.env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?')
        .bind(parsed.amount, matchedAccount.id, userId)
    );
  }

  await c.env.DB.batch(batchStatements);

  const createdTx = {
    id: transactionId,
    userId,
    fromAccountId,
    toAccountId,
    fromAccountName: parsed.type === 'debit' ? matchedAccount.name : undefined,
    toAccountName: parsed.type === 'credit' ? matchedAccount.name : undefined,
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
      message: 'پیامک بانکی با موفقیت پردازش و در دفتر حسابداری ثبت شد',
      transaction: createdTx,
    },
    201
  );
});
