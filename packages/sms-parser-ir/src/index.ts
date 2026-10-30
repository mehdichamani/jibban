/**
 * پکیج رسمی استخراج و پردازش پیامک‌های بانکی ایران (sms-parser-ir)
 * بخشی از سامانه جیب‌بان (JibBan)
 */

export * from './types.js';
export * from './parser.js';
export * from './fallback.js';
export * from './banks/bank-definitions.js';
export {
  toEnglishDigits,
  normalizePersianText,
  parseNumber,
  detectCurrency,
  convertToToman,
} from './utils/cleaner.js';
export {
  extractTransactionDate,
  jalaliToGregorian,
} from './utils/date.js';
