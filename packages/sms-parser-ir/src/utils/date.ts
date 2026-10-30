/**
 * تبدیل تاریخ و ساعت شمسی در پیامک‌ها به فرمت استاندارد ISO 8601
 */

/**
 * تبدیل سال، ماه و روز جلالی (شمسی) به سال، ماه و روز میلادی
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy: number;
  let adjustedJy = jy;

  if (adjustedJy > 979) {
    gy = 1600;
    adjustedJy -= 979;
  } else {
    gy = 621;
  }

  let days =
    365 * adjustedJy +
    Math.floor(adjustedJy / 33) * 8 +
    Math.floor(((adjustedJy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);

  gy += 400 * Math.floor(days / 146097);
  days %= 146097;

  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }

  gy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  let gd = days + 1;
  const isLeap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const daysInMonths = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  let gm = 0;
  for (gm = 1; gm <= 12; gm++) {
    const v = daysInMonths[gm];
    if (gd <= v) break;
    gd -= v;
  }

  return [gy, gm, gd];
}

/**
 * استخراج تاریخ و زمان شمسی از متن و تبدیل آن به ISO 8601
 */
export function extractTransactionDate(text: string): string | undefined {
  if (!text) return undefined;

  // ۱. الگوهای تاریخ شمسی: 1403/08/09 یا 03/08/09 با جداکننده‌های / یا - یا .
  const dateMatch = text.match(/\b(13\d{2}|14\d{2}|0\d|\d{2})[/.-](\d{1,2})[/.-](\d{1,2})\b/);
  if (!dateMatch) {
    // ۲. الگوی فشرده ماه و روز (مانند بانک ملی: 0804-20:24)
    const compactMatch = text.match(/\b(0[1-9]|1[0-2])([0-2][0-9]|3[01])-(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
    if (compactMatch) {
      const month = parseInt(compactMatch[1], 10);
      const day = parseInt(compactMatch[2], 10);
      const hour = parseInt(compactMatch[3], 10);
      const minute = parseInt(compactMatch[4], 10);
      const second = compactMatch[5] ? parseInt(compactMatch[5], 10) : 0;
      const currentYear = new Date().getFullYear();
      const jalaliYear = currentYear >= 2026 ? 1405 : (currentYear >= 2025 ? 1404 : 1403);
      try {
        const [gy, gm, gd] = jalaliToGregorian(jalaliYear, month, day);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${gy}-${pad(gm)}-${pad(gd)}T${pad(hour)}:${pad(minute)}:${pad(second)}+03:30`;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  let year = parseInt(dateMatch[1], 10);
  const month = parseInt(dateMatch[2], 10);
  const day = parseInt(dateMatch[3], 10);

  // اگر سال دو رقمی باشد (مثلاً 03 یا 04)
  if (year < 100) {
    year += 1400;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return undefined;
  }

  // ۲. استخراج ساعت و دقیقه: 14:35 یا 14:35:10
  const timeMatch = text.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
  let hour = 12;
  let minute = 0;
  let second = 0;

  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    minute = parseInt(timeMatch[2], 10);
    if (timeMatch[3]) {
      second = parseInt(timeMatch[3], 10);
    }
  }

  try {
    const [gy, gm, gd] = jalaliToGregorian(year, month, day);
    const pad = (n: number) => String(n).padStart(2, '0');
    // ذخیره تاریخ به صورت ISO با منطقه زمانی ایران (+03:30)
    return `${gy}-${pad(gm)}-${pad(gd)}T${pad(hour)}:${pad(minute)}:${pad(second)}+03:30`;
  } catch {
    return undefined;
  }
}
