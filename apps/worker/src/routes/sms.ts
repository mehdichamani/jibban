import { Hono } from 'hono';
import { parseBankSms } from '@jibban/sms-parser-ir';
import { Bindings, Variables } from '../types.js';

export const smsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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
 * دریافت متن پیامک از اپ اندروید، استخراج پارامترها و ذخیره در پایگاه داده
 */
smsRouter.post('/ingest', async (c) => {
  const body = await c.req.json<{ rawSms?: string; syncToken?: string }>();
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

  // ۲. استخراج و پارس پیامک با موتور @jibban/sms-parser-ir
  const parsed = parseBankSms(rawSms);

  if (!parsed.isBankSms || parsed.amount <= 0) {
    return c.json(
      {
        success: false,
        isBankSms: false,
        message: 'پیامک غیربانکی یا فاقد مبلغ تراکنش تشخیص داده شد',
      },
      200
    );
  }

  // ۳. حدس دسته‌بندی اولیه
  const categoryId = autoDetectCategory(parsed.description, parsed.type);
  const transactionId = `tx_${crypto.randomUUID()}`;
  const transactionDate = parsed.transactionDate || new Date().toISOString();

  // ۴. ثبت تراکنش در پایگاه داده D1
  await c.env.DB.prepare(
    `INSERT INTO transactions (
      id, user_id, bank_name, account_number, amount, type,
      balance, category_id, description, raw_sms, transaction_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
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
      transactionDate
    )
    .run();

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
