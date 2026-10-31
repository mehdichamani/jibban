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
 * حدس هوشمند سرفصل هزینه
 */
function autoDetectCategory(description?: string, type?: 'debit' | 'credit'): string {
  if (type === 'credit') {
    return 'cat_salary';
  }
  if (!description) return 'cat_other_exp';
  const desc = description.toLowerCase();

  if (/فروشگاه|هایپر|کوروش|جانبو|سوپر|پروتئین|میوه|نان|نانوایی/.test(desc)) {
    return 'cat_supermarket';
  }
  if (/اسنپ|تپسی|بنزین|جایگاه|سوخت|تاکسی|کرایه|مترو/.test(desc)) {
    return 'cat_taxi';
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
    return 'cat_loan_pay';
  }
  if (/اجاره|رهن|پول پیش/.test(desc)) {
    return 'cat_rent';
  }

  return 'cat_other_exp';
}

/**
 * دریافت لاگ پیامک‌های خام
 */
smsRouter.get('/logs', async (c) => {
  const userId = c.get('userId');
  const limit = Math.min(200, parseInt(c.req.query('limit') || '50', 10));
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM raw_sms WHERE user_id = ? ORDER BY received_at DESC LIMIT ? OFFSET ?`
  )
    .bind(userId, limit, offset)
    .all();

  return c.json({ success: true, data: results || [] });
});

/**
 * دریافت و پردازش پیامک خام بانکی از اندروید یا وب
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

  let userId = c.get('userId');
  if (body.syncToken) {
    const user = await c.env.DB.prepare('SELECT id FROM users WHERE sync_token = ?')
      .bind(body.syncToken)
      .first<{ id: string }>();
    if (user) {
      userId = user.id;
    }
  }

  const smsHash = await computeSmsHash(rawSms);
  const receivedAt = body.timestamp
    ? new Date(body.timestamp).toISOString()
    : new Date().toISOString();

  // بررسی عدم تکرار
  const existingSms = await c.env.DB.prepare(
    'SELECT id, status, transaction_id FROM raw_sms WHERE sms_hash = ? AND user_id = ?'
  )
    .bind(smsHash, userId)
    .first<{ id: string; status: string; transaction_id: string | null }>();

  if (existingSms) {
    if (existingSms.status === 'processed') {
      return c.json({
        success: true,
        alreadyProcessed: true,
        status: 'processed',
        transactionId: existingSms.transaction_id,
        message: 'این پیامک قبلاً ثبت شده است',
      });
    }
    if (existingSms.status === 'ignored') {
      return c.json({
        success: false,
        alreadyProcessed: true,
        message: 'پیامک قبلاً غیربانکی تشخیص داده شده است',
      });
    }
  }

  // پارس با موتور پیامک
  const parsed = parseBankSms(rawSms, body.sender);

  if (!parsed.isBankSms || parsed.amount <= 0) {
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO raw_sms (id, sms_hash, user_id, sender, raw_text, status, received_at)
       VALUES (?, ?, ?, ?, ?, 'ignored', ?)`
    )
      .bind(smsHash, smsHash, userId, body.sender ?? null, rawSms, receivedAt)
      .run();

    return c.json({
      success: false,
      isBankSms: false,
      message: 'پیامک غیربانکی یا فاقد مبلغ تراکنش تشخیص داده شد',
    });
  }

  // تبدیل مبلغ به ریال در صورتی که پارسر به ریال بازنگردانده باشد
  // (موتور جدید پارمیس مبالغ را مستقیماً به ریال استخراج می‌کند)
  const amountInRials = Math.round(parsed.amount);

  // جستجوی حساب منطبق
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

  // ایجاد حساب در صورت عدم وجود
  if (!matchedAccount) {
    const newAccId = `acc_${crypto.randomUUID().slice(0, 8)}`;
    const accName = parsed.bankName ? `بانک ${parsed.bankName}` : 'حساب بانکی';
    await c.env.DB.prepare(
      `INSERT INTO accounts (id, user_id, name, type, bank_name, account_number, balance, initial_balance)
       VALUES (?, ?, ?, 'bank', ?, ?, 0, 0)`
    )
      .bind(newAccId, userId, accName, parsed.bankName ?? null, parsed.accountNumber ?? null)
      .run();

    matchedAccount = { id: newAccId, name: accName, balance: 0 };
  }

  const fromAccountId = parsed.type === 'debit' ? matchedAccount.id : null;
  const toAccountId = parsed.type === 'credit' ? matchedAccount.id : null;
  const categoryId = autoDetectCategory(parsed.description, parsed.type);
  const transactionId = `tx_${crypto.randomUUID()}`;
  const transactionDate = parsed.transactionDate || receivedAt;

  const batchStatements: D1PreparedStatement[] = [
    // ۱. ثبت تراکنش
    c.env.DB.prepare(
      `INSERT INTO transactions (
        id, user_id, type, amount, from_account_id, to_account_id,
        category_id, description, raw_sms_id, transaction_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      transactionId,
      userId,
      parsed.type,
      amountInRials,
      fromAccountId,
      toAccountId,
      categoryId,
      parsed.description ?? (parsed.bankName ? `تراکنش ${parsed.bankName}` : null),
      smsHash,
      transactionDate
    ),
    // ۲. ثبت پیامک در آرشیو خام
    c.env.DB.prepare(
      `INSERT OR REPLACE INTO raw_sms (
        id, sms_hash, user_id, sender, raw_text, bank_name, parsed_amount, parsed_account, status, transaction_id, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processed', ?, ?)`
    ).bind(
      smsHash,
      smsHash,
      userId,
      body.sender ?? null,
      rawSms,
      parsed.bankName ?? null,
      amountInRials,
      parsed.accountNumber ?? null,
      transactionId,
      receivedAt
    ),
  ];

  // ۳. تعدیل مانده حساب
  if (parsed.type === 'debit') {
    batchStatements.push(
      c.env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?')
        .bind(amountInRials, matchedAccount.id, userId)
    );
  } else if (parsed.type === 'credit') {
    batchStatements.push(
      c.env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?')
        .bind(amountInRials, matchedAccount.id, userId)
    );
  }

  await c.env.DB.batch(batchStatements);

  return c.json(
    {
      success: true,
      isBankSms: true,
      message: 'پیامک بانکی با موفقیت پردازش شد',
      transaction: {
        id: transactionId,
        amount: amountInRials,
        type: parsed.type,
        bankName: parsed.bankName,
        accountName: matchedAccount.name,
        balance: parsed.balance,
        categoryId,
        transactionDate,
      },
    },
    201
  );
});
