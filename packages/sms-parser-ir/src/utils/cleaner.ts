/**
 * ابزارهای تمیزسازی و نرمال‌سازی متون و ارقام پیامک‌های بانکی
 */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * تبدیل تمامی ارقام فارسی و عربی به ارقام انگلیسی (0-9)
 */
export function toEnglishDigits(text: string): string {
  if (!text) return '';
  let result = text;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(PERSIAN_DIGITS[i], 'g'), String(i));
    result = result.replace(new RegExp(ARABIC_DIGITS[i], 'g'), String(i));
  }
  return result;
}

/**
 * نرمال‌سازی نویسه‌های عربی به فارسی، حذف کاراکترهای مخفی و استانداردسازی فاصله‌ها
 */
export function normalizePersianText(text: string): string {
  if (!text) return '';

  return toEnglishDigits(text)
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/\u200c/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200E\u200F]/g, '')
    .replace(/،/g, ',')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * استخراج و تبدیل رشته عددی دارای جداکننده به عدد صحیح
 */
export function parseNumber(amountStr: string): number {
  if (!amountStr) return 0;
  const cleaned = amountStr.replace(/[^0-9-]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : Math.abs(num);
}

/**
 * تشخیص واحد پولی در متن
 */
export function detectCurrency(
  snippet: string,
  defaultCurrency: 'rial' | 'toman' = 'rial'
): 'rial' | 'toman' {
  if (/تومان|تومن|IRT/i.test(snippet)) {
    return 'toman';
  }
  if (/ریال|IRR|RLS/i.test(snippet)) {
    return 'rial';
  }
  return defaultCurrency;
}

/**
 * تبدیل تضمینی مبلغ به ریال (واحد رسمی دیتابیس)
 */
export function convertToRial(
  amount: number,
  currency: 'rial' | 'toman' = 'rial'
): number {
  if (currency === 'toman') {
    return Math.round(amount * 10);
  }
  return Math.round(amount);
}

/**
 * تبدیل مبلغ ریال به تومان (جهت نمایش فرانت‌اند)
 */
export function convertToToman(
  amountInRials: number
): number {
  return amountInRials / 10;
}
