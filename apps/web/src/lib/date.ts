/**
 * توابع کمکی تقویم جلالی (شمسی) و تبدیل تاریخ برای سامانه جیب‌بان
 */

export const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export interface JalaliDateParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
  hour: number;  // 0-23
  minute: number;// 0-59
}

/**
 * تبدیل تاریخ میلادی به جلالی
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): { year: number; month: number; day: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { year: jy, month: jm, day: jd };
}

/**
 * تبدیل تاریخ جلالی به میلادی
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): { year: number; month: number; day: number } {
  jy = jy - 979;
  jm = jm - 1;
  jd = jd - 1;
  let j_day_no = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4);
  for (let i = 0; i < jm; ++i) {
    j_day_no += i < 6 ? 31 : 30;
  }
  j_day_no += jd;

  let g_day_no = j_day_no + 79;
  let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
  g_day_no = g_day_no % 146097;

  let leap = true;
  if (g_day_no >= 36525) {
    g_day_no--;
    gy += 100 * Math.floor(g_day_no / 36524);
    g_day_no = g_day_no % 36524;
    if (g_day_no >= 365) {
      g_day_no++;
    } else {
      leap = false;
    }
  }

  gy += 4 * Math.floor(g_day_no / 1461);
  g_day_no %= 1461;

  if (g_day_no >= 366) {
    leap = false;
    g_day_no--;
    gy += Math.floor(g_day_no / 365);
    g_day_no = g_day_no % 365;
  }

  const g_days_in_month = [31, (leap ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 12 && g_day_no >= g_days_in_month[gm]) {
    g_day_no -= g_days_in_month[gm];
    gm++;
  }
  return { year: gy, month: gm + 1, day: g_day_no + 1 };
}

/**
 * تشخیص سال کبیسه شمسی
 */
export function isJalaliLeapYear(year: number): boolean {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  let jp = breaks[0];
  let jump = 0;
  for (let j = 1; j < breaks.length; j++) {
    const jm = breaks[j];
    jump = jm - jp;
    if (year < jm) break;
    jp = jm;
  }
  let n = year - jp;
  if (jump - n < 6) n = n - jump + Math.floor((jump + 4) / 33) * 33;
  let leap = ((n + 1) % 33) - 1;
  if (leap === -1) leap = 4;
  return leap % 4 === 0;
}

/**
 * تعداد روزهای ماه در تقویم شمسی
 */
export function getDaysInJalaliMonth(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isJalaliLeapYear(year) ? 30 : 29;
}

/**
 * تبدیل شیء Date به اجزای جلالی
 */
export function dateToJalaliParts(date: Date): JalaliDateParts {
  const { year, month, day } = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return {
    year,
    month,
    day,
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

/**
 * ساخت تاریخ استاندارد میلادی (ISO string) از اجزای جلالی
 */
export function jalaliToIso(year: number, month: number, day: number, hour: number = 12, minute: number = 0): string {
  const { year: gy, month: gm, day: gd } = jalaliToGregorian(year, month, day);
  const date = new Date(gy, gm - 1, gd, hour, minute, 0);
  return date.toISOString();
}

/**
 * دریافت اجزای تاریخ جلالی امروز
 */
export function getTodayJalali(): JalaliDateParts {
  return dateToJalaliParts(new Date());
}

/**
 * فرمت‌بندی تاریخ شمسی برای نمایش در سراسر رابط کاربری
 */
export function formatJalali(
  dateInput: string | Date | number,
  mode: 'relative' | 'full' | 'dateOnly' | 'timeOnly' | 'shortNumeric' = 'relative'
): string {
  if (!dateInput) return '';

  const date = typeof dateInput === 'object' && dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  const parts = dateToJalaliParts(date);
  const hourStr = String(parts.hour).padStart(2, '0');
  const minStr = String(parts.minute).padStart(2, '0');
  const monthName = JALALI_MONTH_NAMES[parts.month - 1] || '';

  const now = new Date();
  const todayParts = dateToJalaliParts(now);

  if (mode === 'timeOnly') {
    return `${hourStr}:${minStr}`;
  }

  if (mode === 'shortNumeric') {
    return `${parts.year}/${String(parts.month).padStart(2, '0')}/${String(parts.day).padStart(2, '0')}`;
  }

  if (mode === 'dateOnly') {
    return `${parts.day} ${monthName} ${parts.year}`;
  }

  if (mode === 'full') {
    try {
      const weekday = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long' }).format(date);
      return `${weekday}، ${parts.day} ${monthName} ${parts.year} - ساعت ${hourStr}:${minStr}`;
    } catch {
      return `${parts.day} ${monthName} ${parts.year} - ساعت ${hourStr}:${minStr}`;
    }
  }

  // Relative mode
  const isToday =
    parts.year === todayParts.year &&
    parts.month === todayParts.month &&
    parts.day === todayParts.day;

  if (isToday) {
    return `امروز، ${hourStr}:${minStr}`;
  }

  // دیروز
  const yesterday = new Date(now.getTime() - 86400000);
  const yParts = dateToJalaliParts(yesterday);
  const isYesterday =
    parts.year === yParts.year &&
    parts.month === yParts.month &&
    parts.day === yParts.day;

  if (isYesterday) {
    return `دیروز، ${hourStr}:${minStr}`;
  }

  // امسال
  if (parts.year === todayParts.year) {
    return `${parts.day} ${monthName}، ${hourStr}:${minStr}`;
  }

  return `${parts.day} ${monthName} ${parts.year}، ${hourStr}:${minStr}`;
}
