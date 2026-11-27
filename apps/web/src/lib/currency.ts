/**
 * سیستم جامع تبدیل و قالب‌بندی واحدهای پولی جیب‌بان ۲.۰
 * در دیتابیس و بک‌اند: ریال (INTEGER)
 * در رابط کاربری فرانت‌اند: تومان (با پشتیبانی از ۱ رقم اعشار در صورت نیاز)
 */

export interface FormatOptions {
  showUnit?: boolean;
  unitText?: string;
  forceDecimals?: boolean;
}

/**
 * تبدیل مبلغ از ریال به تومان
 */
export function rialToToman(rialAmount: number): number {
  if (isNaN(rialAmount) || !isFinite(rialAmount)) return 0;
  return rialAmount / 10;
}

/**
 * تبدیل ورودی کاربر از تومان به ریال جهت ارسال به API
 */
export function tomanToRial(tomanAmount: number | string): number {
  if (typeof tomanAmount === 'string') {
    const cleaned = tomanAmount.replace(/,/g, '').replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num * 10);
  }
  return Math.round(tomanAmount * 10);
}

function normalizeFaSeparators(str: string): string {
  // جایگزینی جداکننده هزارگان عربی (٬) با کامای استاندارد (,) و ممیز (٫) با نقطه (.)
  // جهت خوانایی بسیار بهتر در فونت وزیرمتن
  return str.replace(/\u066C/g, ',').replace(/\u066B/g, '.');
}

/**
 * فرمت‌بندی هوشمند مبلغ به تومان با پشتیبانی از ۱ رقم اعشار
 * مثال:
 * ۱۵۰,۰۰۰ ریال -> «۱۵,۰۰۰ تومان»
 * ۱۵۲,۲۵۵ ریال -> «۱۵,۲۲۵.۵ تومان»
 */
export function formatToman(rialAmount: number, options: FormatOptions = {}): string {
  const { showUnit = true, unitText = 'تومان', forceDecimals = false } = options;
  if (isNaN(rialAmount) || !isFinite(rialAmount)) {
    return showUnit ? `۰ ${unitText}` : '۰';
  }

  const toman = rialAmount / 10;
  const isNegative = toman < 0;
  const absToman = Math.abs(toman);
  const isDecimal = forceDecimals || Math.round(Math.abs(rialAmount)) % 10 !== 0;

  const rawNumber = isDecimal
    ? absToman.toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : Math.round(absToman).toLocaleString('fa-IR');

  const formattedNumber = `${isNegative ? '\u200E-' : ''}${normalizeFaSeparators(rawNumber)}`;

  return showUnit ? `${formattedNumber} ${unitText}` : formattedNumber;
}

/**
 * فرمت‌بندی مستقیم بر اساس ریال
 */
export function formatRial(rialAmount: number, showUnit: boolean = true): string {
  const val = Math.round(rialAmount || 0);
  const isNegative = val < 0;
  const raw = Math.abs(val).toLocaleString('fa-IR');
  const formatted = `${isNegative ? '\u200E-' : ''}${normalizeFaSeparators(raw)}`;
  return showUnit ? `${formatted} ریال` : formatted;
}
