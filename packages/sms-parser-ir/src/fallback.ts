import { ParsedBankSms, TransactionType } from './types.js';
import {
  normalizePersianText,
  parseNumber,
  detectCurrency,
  convertToToman,
} from './utils/cleaner.js';
import { extractTransactionDate } from './utils/date.js';

/**
 * کلیدواژه‌های مشخص‌کننده تراکنش‌های بدهکار (برداشت / خرج)
 */
const DEBIT_KEYWORDS = [
  'برداشت',
  'خرید',
  'کسر',
  'پرداخت',
  'انتقال به',
  'انتقال پایا',
  'انتقال ساتنا',
  'بدهکار',
  'کارمزد',
  'تسویه',
];

/**
 * کلیدواژه‌های مشخص‌کننده تراکنش‌های بستانکار (واریز / درآمد)
 */
const CREDIT_KEYWORDS = [
  'واریز',
  'بستانکار',
  'سود سپرده',
  'سود سهام',
  'سود',
  'واریز حقوق',
  'حقوق',
  'برگشت وجه',
  'اصلاحیه',
];

/**
 * بررسی اینکه آیا پیامک مربوط به تراکنش‌های بانکی است یا خیر
 */
export function isLikelyBankSms(text: string): boolean {
  if (!text || text.length < 10) return false;

  // پیامک‌های کد تایید و پیام‌های غیرمالی رد می‌شوند
  if (/کد تایید|کد فعالسازی|رمز یکبار مصرف|رمز پویا|ورود به همراه بانک|کد ورود/i.test(text)) {
    return false;
  }

  // پیامک‌های صورتحساب، قبض و بسته‌های اپراتورها (همراه اول، ایرانسل، مخابرات و...) تراکنش بانکی نیستند
  if (/همراه اول|همراه‌اول|ایرانسل|رایتل|مخابرات/i.test(text)) {
    if (/صورت[‌\s]*حساب|بدهی پیشین|مهلت پرداخت|پرداخت شما به مبلغ.*دریافت شد|بسته اینترنت|شارژ سیم[‌\s]*کارت|ش ق:|ش پ:/i.test(text)) {
      return false;
    }
  }

  // وجود کلیدواژه‌های مالی پایه
  const hasFinancialKeyword =
    /برداشت|واریز|خرید|مانده|موجودی|حساب|کارت|تراکنش|صورتحساب|پایانه|انتقال/i.test(text);

  // وجود ارقام همراه با نشانگر مبلغ یا واحد پولی
  const hasCurrencyOrAmount =
    /ریال|تومان|تومن|IRR|مبلغ|مانده|موجودی|[+-]\s*[\d,]{3,}/i.test(text);

  return hasFinancialKeyword && hasCurrencyOrAmount;
}

/**
 * تشخیص نوع تراکنش (برداشت یا واریز)
 */
export function detectTransactionType(text: string): TransactionType {
  // بررسی علامت‌های مثبت و منفی متداول در پیامک‌ها
  if (/[+]\s*[\d,]{3,}|[\d,]{3,}\s*[+]/.test(text)) {
    return 'credit';
  }
  if (/[-]\s*[\d,]{3,}|[\d,]{3,}\s*[-]/.test(text)) {
    return 'debit';
  }

  let debitScore = 0;
  for (const kw of DEBIT_KEYWORDS) {
    if (text.includes(kw)) debitScore += 2;
  }

  let creditScore = 0;
  for (const kw of CREDIT_KEYWORDS) {
    if (text.includes(kw)) creditScore += 2;
  }

  return creditScore > debitScore ? 'credit' : 'debit';
}

/**
 * استخراج مانده یا موجودی حساب
 */
export function extractBalance(
  text: string,
  defaultCurrency: 'rial' | 'toman' = 'rial'
): number | undefined {
  // الگوهایی مثل: مانده: 1,200,000 ریال یا موجودی 50000 تومان یا مانده حساب: ...
  const balanceRegex =
    /(?:مانده(?:\s*حساب|\s*کل|\s*فعلی)?|موجودی(?:\s*حساب|\s*جدید|\s*قابل\s*برداشت)?)\s*[:=]?\s*([+-]?\s*[\d,]+)\s*(ریال|تومان|تومن|IRR)?/i;

  const match = text.match(balanceRegex);
  if (!match) return undefined;

  const rawNumber = parseNumber(match[1]);
  if (rawNumber <= 0) return undefined;

  const currencyUnit = match[2]
    ? detectCurrency(match[2], defaultCurrency)
    : detectCurrency(text, defaultCurrency);

  return convertToToman(rawNumber, currencyUnit);
}

/**
 * استخراج مبلغ تراکنش
 */
export function extractAmount(
  text: string,
  defaultCurrency: 'rial' | 'toman' = 'rial'
): number {
  // ۱. الگو با عبارت صریح «مبلغ» یا «به مبلغ» یا «خرید/واریز/برداشت/انتقال»
  const explicitAmountRegex =
    /(?:مبلغ(?:\s*تراکنش)?|به\s*مبلغ|(?:واریز|برداشت|خرید|پرداخت|انتقال)\s*[:=]|(?:واریز|برداشت|خرید|پرداخت)(?!\s*(?:از|به|حساب|کارت)))\s*[:=]?\s*([+-]?[ \t]*[\d,]{3,})\s*(ریال|تومان|تومن|IRR)?/i;
  const explicitMatch = text.match(explicitAmountRegex);

  if (explicitMatch) {
    const rawNumber = parseNumber(explicitMatch[1]);
    if (rawNumber > 0) {
      const currency = explicitMatch[2]
        ? detectCurrency(explicitMatch[2], defaultCurrency)
        : detectCurrency(text, defaultCurrency);
      return convertToToman(rawNumber, currency);
    }
  }

  // ۲. عدد قبل از کلمه ریال یا تومان (به استثنای کلمه مانده و موجودی)
  const currencyAmountRegex = /([+-]?[ \t]*[\d,]{3,}[ \t]*[+-]?)\s*(ریال|تومان|تومن|IRR)/i;
  const currencyMatches = text.matchAll(new RegExp(currencyAmountRegex, 'gi'));
  for (const m of currencyMatches) {
    const precedingIndex = Math.max(0, (m.index ?? 0) - 15);
    const contextBefore = text.slice(precedingIndex, m.index);
    // اگر مربوط به مانده یا موجودی نبود، مبلغ تراکنش است
    if (!/مانده|موجودی/.test(contextBefore)) {
      const rawNumber = parseNumber(m[1]);
      if (rawNumber > 0) {
        const currency = detectCurrency(m[2], defaultCurrency);
        return convertToToman(rawNumber, currency);
      }
    }
  }

  // ۳. الگو با علامت‌های منفی و مثبت در همان خط (شامل دونقطه و فواصل)
  const signedAmountRegex = /(?:^|[ \t\n:：])([+-][ \t]*[\d,]{3,}|[\d,]{3,}[ \t]*[+-])(?=[ \t\r\n]|$)/m;
  const signedMatch = text.match(signedAmountRegex);
  if (signedMatch) {
    const rawNumber = parseNumber(signedMatch[1]);
    if (rawNumber > 0) {
      const currency = detectCurrency(text, defaultCurrency);
      return convertToToman(rawNumber, currency);
    }
  }

  return 0;
}

/**
 * استخراج ۴ رقم آخر کارت یا شماره حساب
 */
export function extractAccountNumber(text: string): string | undefined {
  // ۱. الگوهای کارت: کارت 6037...1234 یا کارت: *1234 یا کارت 1234
  const cardMatch = text.match(/کارت\s*[:=]?\s*(?:[0-9]{4,6}[.*]+)?([0-9]{4})\b/i);
  if (cardMatch) {
    return cardMatch[1];
  }

  // ۲. الگوهای کارت با نقاط یا ستاره: مثلاً ...5678 یا *5678
  const maskedCardMatch = text.match(/(?:[.]{2,}|\*{2,})([0-9]{4})\b/);
  if (maskedCardMatch) {
    return maskedCardMatch[1];
  }

  // ۳. الگوهای حساب: حساب: 12345678 یا از حساب 010...
  const accountMatch = text.match(/(?:از\s*|به\s*)?حساب\s*[:=]?\s*([0-9.-]+)/i);
  if (accountMatch) {
    const cleanedAcc = accountMatch[1].replace(/[^0-9]/g, '');
    if (cleanedAcc.length >= 4) {
      return cleanedAcc.slice(-4);
    }
  }

  return undefined;
}

/**
 * استخراج پذیرنده یا شرح تراکنش
 */
export function extractDescription(text: string): string | undefined {
  const descRegex =
    /(?:پذیرنده|فروشگاه|پایانه|خرید از|طرف حساب|بابت|انتقال به|به نام|شرح)\s*[:=]?\s*([^\n\r,]+)/i;
  const match = text.match(descRegex);
  if (match) {
    const desc = match[1].trim();
    // حذف موارد نامعتبر یا کوتاه
    if (desc.length > 2 && !/^\d+$/.test(desc)) {
      return desc;
    }
  }
  return undefined;
}

/**
 * موتور فال‌بک عمومی (Generic Fallback Engine)
 * زمانی که پیامک الگوی اختصاصی ندارد یا از بانکی ناشناس است
 */
export function parseWithFallback(
  rawText: string,
  bankName: string = 'بانک ناشناس',
  defaultCurrency: 'rial' | 'toman' = 'rial'
): ParsedBankSms {
  const cleaned = normalizePersianText(rawText);

  if (!isLikelyBankSms(cleaned)) {
    return {
      isBankSms: false,
      bankName: '',
      type: 'debit',
      amount: 0,
      rawText,
    };
  }

  const type = detectTransactionType(cleaned);
  const amount = extractAmount(cleaned, defaultCurrency);
  const balance = extractBalance(cleaned, defaultCurrency);
  const accountNumber = extractAccountNumber(cleaned);
  const transactionDate = extractTransactionDate(cleaned);
  const description = extractDescription(cleaned);

  // اگر مبلغ معتبری پیدا نشد، پیامک تراکنش تلقی نمی‌شود
  if (amount <= 0) {
    return {
      isBankSms: false,
      bankName: '',
      type: 'debit',
      amount: 0,
      rawText,
    };
  }

  return {
    isBankSms: true,
    bankName,
    type,
    amount,
    balance,
    accountNumber,
    transactionDate,
    description,
    rawText,
  };
}
