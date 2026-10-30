import { ParsedBankSms } from './types.js';
import { identifyBank } from './banks/bank-definitions.js';
import {
  parseWithFallback,
  isLikelyBankSms,
  extractAmount,
  extractBalance,
  extractAccountNumber,
  detectTransactionType,
  extractDescription,
} from './fallback.js';
import { normalizePersianText } from './utils/cleaner.js';
import { extractTransactionDate } from './utils/date.js';

/**
 * تابع اصلی پردازش و استخراج اطلاعات پیامک‌های بانکی
 * @param smsText متن خام پیامک دریافتی
 * @returns نتیجه ساختاریافته شامل مشخصات بانک، نوع تراکنش، مبلغ به تومان و مانده
 */
export function parseBankSms(smsText: string): ParsedBankSms {
  if (!smsText || typeof smsText !== 'string') {
    return {
      isBankSms: false,
      bankName: '',
      type: 'debit',
      amount: 0,
      rawText: String(smsText ?? ''),
    };
  }

  const cleaned = normalizePersianText(smsText);

  // در صورتی که پیامک غیربانکی باشد (مانند رمز پویا یا تبلیغات)
  if (!isLikelyBankSms(cleaned)) {
    return {
      isBankSms: false,
      bankName: '',
      type: 'debit',
      amount: 0,
      rawText: smsText,
    };
  }

  // ۱. شناسایی نام بانک از متن
  const bankRule = identifyBank(cleaned);
  const bankName = bankRule ? bankRule.name : 'بانک ناشناس';
  const defaultCurrency = bankRule?.defaultCurrency ?? 'rial';

  // ۲. در صورت وجود پارسر اختصاصی برای بانک
  if (bankRule?.customParser) {
    try {
      const customResult = bankRule.customParser(cleaned, smsText);
      if (customResult && customResult.amount && customResult.amount > 0) {
        return {
          isBankSms: true,
          bankName,
          type: customResult.type ?? 'debit',
          amount: customResult.amount,
          balance: customResult.balance,
          accountNumber: customResult.accountNumber ?? extractAccountNumber(cleaned),
          transactionDate: customResult.transactionDate ?? extractTransactionDate(cleaned),
          description: customResult.description ?? extractDescription(cleaned),
          rawText: smsText,
        };
      }
    } catch {
      // در صورت بروز خطا در پارسر اختصاصی، به موتور فال‌بک سوئیچ می‌کنیم
    }
  }

  // ۳. استخراج به کمک الگوهای جامع و تنظیمات ارز پیش‌فرض بانک
  const amount = extractAmount(cleaned, defaultCurrency);
  if (amount <= 0) {
    // تلاش مجدد با موتور فال‌بک
    return parseWithFallback(smsText, bankName, defaultCurrency);
  }

  const type = detectTransactionType(cleaned);
  const balance = extractBalance(cleaned, defaultCurrency);
  const accountNumber = extractAccountNumber(cleaned);
  const transactionDate = extractTransactionDate(cleaned);
  const description = extractDescription(cleaned);

  return {
    isBankSms: true,
    bankName,
    type,
    amount,
    balance,
    accountNumber,
    transactionDate,
    description,
    rawText: smsText,
  };
}
