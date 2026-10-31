/**
 * پکیج رسمی استخراج و پردازش پیامک‌های بانکی ایران (sms-parser-ir)
 * بخشی از سامانه جیب‌بان ۲.۰ (JibBan Clean Slate)
 */

export * from './types.js';
export * from './parser.js';
export * from './matcher.js';
export * from './fallback.js';
export * from './banks/bank-definitions.js';
export {
  toEnglishDigits,
  normalizePersianText,
  parseNumber,
  detectCurrency,
  convertToRial,
  convertToToman,
} from './utils/cleaner.js';
export {
  extractTransactionDate,
  jalaliToGregorian,
  shamsiToGregorianIso,
} from './utils/date.js';
