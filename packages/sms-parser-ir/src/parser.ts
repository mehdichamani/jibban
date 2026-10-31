import { ParsedBankSms } from './types.js';
import { identifyBank } from './banks/bank-definitions.js';
import { matchParmisPattern } from './matcher.js';
import {
  parseWithFallback,
  isLikelyBankSms,
  extractBalance,
  extractAccountNumber,
  detectTransactionType,
  extractDescription,
} from './fallback.js';
import { normalizePersianText } from './utils/cleaner.js';
import { extractTransactionDate } from './utils/date.js';

/**
 * تابع اصلی پردازش و استخراج پیامک‌های بانکی ایران بر اساس ۱۰۷۷ الگوی تست‌شده پارمیس
 * همراه با موتور فال‌بک معنایی (مبالغ خروجی همیشه به ریال هستند)
 * 
 * @param smsText متن خام پیامک دریافتی
 * @param sender شماره یا نام فرستنده پیامک (اختیاری جهت تطبیق سریع‌تر و دقیق‌تر)
 */
export function parseBankSms(smsText: string, sender?: string): ParsedBankSms {
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

  // پیامک‌های کد تایید یا پیام‌های غیرمالی رد می‌شوند
  if (!isLikelyBankSms(cleaned)) {
    return {
      isBankSms: false,
      bankName: '',
      type: 'debit',
      amount: 0,
      rawText: smsText,
    };
  }

  // ۱. اولویت اول: تطبیق با ۱۰۷۷ الگوی رسمی و تست‌شده پارمیس
  const parmisMatch = matchParmisPattern(smsText, sender);
  if (parmisMatch && parmisMatch.amount && parmisMatch.amount > 0) {
    const balance = parmisMatch.balance ?? extractBalance(cleaned);
    const accountNumber = parmisMatch.accountNumber ?? extractAccountNumber(cleaned);
    const description = parmisMatch.description ?? extractDescription(cleaned);
    const transactionDate = parmisMatch.transactionDate ?? extractTransactionDate(cleaned);

    return {
      isBankSms: true,
      bankName: parmisMatch.bankName || 'بانک',
      type: parmisMatch.type || 'debit',
      amount: parmisMatch.amount,
      balance,
      accountNumber,
      transactionDate,
      shamsiDate: parmisMatch.shamsiDate,
      time: parmisMatch.time,
      description,
      rawText: smsText,
    };
  }

  // ۲. اولویت دوم: استخراج با موتور فال‌بک معنایی
  const bankRule = identifyBank(cleaned);
  const bankName = bankRule ? bankRule.name : 'بانک ناشناس';
  const defaultCurrency = bankRule?.defaultCurrency ?? 'rial';

  return parseWithFallback(smsText, bankName, defaultCurrency);
}
