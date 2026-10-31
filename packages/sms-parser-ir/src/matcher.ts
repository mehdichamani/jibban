import { BankPattern, ParsedBankSms, TransactionType } from './types.js';
import { normalizePersianText, parseNumber, detectCurrency, convertToRial } from './utils/cleaner.js';
import { shamsiToGregorianIso } from './utils/date.js';
// @ts-ignore
import rawPatterns from './data/patterns.json' with { type: 'json' };

const banksData = rawPatterns as BankPattern[];

interface CompiledPattern {
  bankName: string;
  type: TransactionType;
  regex: RegExp;
  template: string;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function templateToRegex(template: string): RegExp | null {
  try {
    const normTmpl = normalizePersianText(template);
    const parts = normTmpl.split(/(\[\[(?:var|tType|amount|accountNumber|date|time)\]\])/g);
    let regexStr = '^';
    for (const part of parts) {
      if (part === '[[var]]') {
        regexStr += '[\\s\\S]*?';
      } else if (part === '[[tType]]') {
        regexStr += '(?<tType>[^\\n\\r:,]+?)';
      } else if (part === '[[amount]]') {
        regexStr += '(?<amount>[0-9,]+)';
      } else if (part === '[[accountNumber]]') {
        regexStr += '(?<accountNumber>[0-9*\\-\\.]+)';
      } else if (part === '[[date]]') {
        regexStr += '(?<date>[0-9]{2,4}[\\/\\-.][0-9]{1,2}(?:[\\/\\-.][0-9]{1,2})?)';
      } else if (part === '[[time]]') {
        regexStr += '(?<time>[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)';
      } else if (part.length > 0) {
        const escaped = escapeRegex(part).replace(/\\s+/g, '\\s*');
        regexStr += escaped;
      }
    }
    regexStr += '$';
    return new RegExp(regexStr, 'i');
  } catch {
    return null;
  }
}

// ایندکس‌گذاری الگوها بر اساس فرستنده و نام بانک برای سرعت فوق‌العاده بالا
const senderToPatterns = new Map<string, CompiledPattern[]>();
const bankNameToPatterns = new Map<string, CompiledPattern[]>();
const allCompiledPatterns: CompiledPattern[] = [];

// کامپایل اولیه الگوها
for (const bank of banksData) {
  const bankPatterns: CompiledPattern[] = [];
  for (const tt of bank.TransactionTypes) {
    const rx = templateToRegex(tt.Template);
    if (!rx) continue;

    const type: TransactionType = tt.Type === 1 ? 'credit' : 'debit';
    const compiled: CompiledPattern = {
      bankName: bank.Name,
      type,
      regex: rx,
      template: tt.Template,
    };

    bankPatterns.push(compiled);
    allCompiledPatterns.push(compiled);
  }

  bankNameToPatterns.set(bank.Name, bankPatterns);

  if (bank.Numbers) {
    for (const num of bank.Numbers) {
      const cleanNum = num.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanNum) {
        const existing = senderToPatterns.get(cleanNum) || [];
        senderToPatterns.set(cleanNum, existing.concat(bankPatterns));
      }
    }
  }
}

/**
 * تلاش برای تطبیق متن پیامک با ۱۰۷۷ الگوی تست‌شده پارمیس
 */
export function matchParmisPattern(
  smsText: string,
  sender?: string
): Partial<ParsedBankSms> | null {
  if (!smsText) return null;

  const normalized = normalizePersianText(smsText);

  // ۱. پیدا کردن الگوهای کاندید بر اساس شماره فرستنده
  let candidates: CompiledPattern[] = [];
  if (sender) {
    const cleanSender = sender.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (senderToPatterns.has(cleanSender)) {
      candidates = senderToPatterns.get(cleanSender)!;
    }
  }

  // ۲. در صورت نیافتن فرستنده، جستجوی نام بانک در متن پیامک
  if (candidates.length === 0) {
    for (const [bName, patterns] of bankNameToPatterns.entries()) {
      if (normalized.includes(bName)) {
        candidates = patterns;
        break;
      }
    }
  }

  // اگر هنوز کاندیدی نبود، تست روی کل الگوها
  const testList = candidates.length > 0 ? candidates : allCompiledPatterns;

  for (const p of testList) {
    const match = p.regex.exec(normalized);
    if (match && match.groups?.amount) {
      const rawAmountStr = match.groups.amount;
      const parsedRawAmount = parseNumber(rawAmountStr);
      if (parsedRawAmount <= 0) continue;

      // تشخیص ریال یا تومان بر اساس متن پیامک یا تمپلیت
      const currency = detectCurrency(p.template + ' ' + normalized, 'rial');
      const amountInRials = convertToRial(parsedRawAmount, currency);

      // نوع تراکنش
      let txType = p.type;
      if (match.groups.tType) {
        const tTypeWord = match.groups.tType;
        if (/واریز|نشست|افزایش/i.test(tTypeWord)) {
          txType = 'credit';
        } else if (/برداشت|خرید|پرید|کاهش/i.test(tTypeWord)) {
          txType = 'debit';
        }
      }

      const dateStr = match.groups.date;
      const timeStr = match.groups.time;
      let isoDate: string | undefined;

      if (dateStr) {
        isoDate = shamsiToGregorianIso(dateStr, timeStr);
      }

      return {
        isBankSms: true,
        bankName: p.bankName,
        type: txType,
        amount: amountInRials,
        accountNumber: match.groups.accountNumber,
        shamsiDate: dateStr,
        time: timeStr,
        transactionDate: isoDate,
        rawText: smsText,
      };
    }
  }

  return null;
}
