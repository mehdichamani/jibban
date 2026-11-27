/**
 * هسته مرکزی حسابداری پارمیس (Parmis Core Engine)
 * شامل: تقویم جلالی، سال مالی فعال، سلسله‌مراتب ۳ سطحی حساب‌ها و تراز دوطرفه
 */

export interface AccountPathInfo {
  accountId: number;
  rootId: number;
  subaccId: number;
  leafId: number;
  path: string;
}

export interface ActiveFiscalYear {
  id: number;
  name: string;
  beginDate: string;
  endDate: string;
  status: number;
}

/**
 * تبدیل تاریخ میلادی به جلالی
 */
export function gregorianToJalali(
  gy: number,
  gm: number,
  gd: number
): { year: number; month: number; day: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
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
 * دریافت تاریخ و ساعت جاری ایران (تهران UTC+3:30) به فرمت استاندارد پارمیس
 */
export function getCurrentShamsiDateTime(dateInput?: Date | string): {
  year: number;
  month: number;
  day: number;
  shamsiDate: string;
  time: string;
} {
  const baseDate = dateInput ? new Date(dateInput) : new Date();
  const validDate = isNaN(baseDate.getTime()) ? new Date() : baseDate;
  // تبدیل به زمان ایران (+03:30)
  const tehranMs = validDate.getTime() + 3.5 * 60 * 60 * 1000;
  const tehran = new Date(tehranMs);

  const { year, month, day } = gregorianToJalali(
    tehran.getUTCFullYear(),
    tehran.getUTCMonth() + 1,
    tehran.getUTCDate()
  );

  const shamsiDate = `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
  const time = `${String(tehran.getUTCHours()).padStart(2, '0')}:${String(tehran.getUTCMinutes()).padStart(2, '0')}`;

  return { year, month, day, shamsiDate, time };
}

/**
 * دریافت سال مالی فعال جاری (یا ایجاد خودکار در دیتابیس خالی)
 */
export async function getActiveFiscalYear(db: D1Database): Promise<ActiveFiscalYear> {
  const active = await db
    .prepare(
      `SELECT fiscal_id as id, fiscal_name as name, fiscal_beginDate as beginDate,
              fiscal_endDate as endDate, fiscal_status as status
       FROM FiscalYear
       WHERE fiscal_status = 1
       ORDER BY fiscal_id DESC
       LIMIT 1`
    )
    .first<ActiveFiscalYear>();

  if (active) {
    return {
      ...active,
      name: String(active.name || '').replace(/'/g, '').trim(),
    };
  }

  const latest = await db
    .prepare(
      `SELECT fiscal_id as id, fiscal_name as name, fiscal_beginDate as beginDate,
              fiscal_endDate as endDate, fiscal_status as status
       FROM FiscalYear
       ORDER BY fiscal_id DESC
       LIMIT 1`
    )
    .first<ActiveFiscalYear>();

  if (latest) {
    return {
      ...latest,
      name: String(latest.name || '').replace(/'/g, '').trim(),
    };
  }

  // دیتابیس کاملاً سفید: ایجاد سال مالی جاری
  const { year } = getCurrentShamsiDateTime();
  const beginDate = `${year}/01/01`;
  const endDate = `${year}/12/30`;
  await db
    .prepare(
      `INSERT OR IGNORE INTO FiscalYear (fiscal_id, fiscal_name, fiscal_beginDate, fiscal_endDate, fiscal_status)
       VALUES (1, ?, ?, ?, 1)`
    )
    .bind(String(year), beginDate, endDate)
    .run();

  return {
    id: 1,
    name: String(year),
    beginDate,
    endDate,
    status: 1,
  };
}

/**
 * استخراج مسیر ۳ سطحی حساب در درخت پارمیس (Root -> Subacc -> Leaf)
 */
export async function resolveAccountPath(
  db: D1Database,
  accountId: number | null | undefined,
  fallbackRootId = -1
): Promise<AccountPathInfo> {
  if (!accountId || accountId <= 0) {
    return {
      accountId: -1,
      rootId: fallbackRootId,
      subaccId: -1,
      leafId: -1,
      path: fallbackRootId > 0 ? `${fallbackRootId},-1,-1` : '',
    };
  }

  const acc = await db
    .prepare('SELECT Ac_id, Ac_parent_id FROM accounts WHERE Ac_id = ?')
    .bind(accountId)
    .first<{ Ac_id: number; Ac_parent_id: number }>();

  if (!acc) {
    return {
      accountId,
      rootId: fallbackRootId > 0 ? fallbackRootId : accountId,
      subaccId: accountId,
      leafId: -1,
      path: `${fallbackRootId > 0 ? fallbackRootId : accountId},${accountId},-1`,
    };
  }

  // سطح ۱ (ریشه)
  if (acc.Ac_parent_id === 0) {
    return {
      accountId: acc.Ac_id,
      rootId: acc.Ac_id,
      subaccId: -1,
      leafId: -1,
      path: `${acc.Ac_id},-1,-1`,
    };
  }

  const parent = await db
    .prepare('SELECT Ac_id, Ac_parent_id FROM accounts WHERE Ac_id = ?')
    .bind(acc.Ac_parent_id)
    .first<{ Ac_id: number; Ac_parent_id: number }>();

  // سطح ۲ (معین)
  if (!parent || parent.Ac_parent_id === 0) {
    const rootId = parent ? parent.Ac_id : acc.Ac_parent_id;
    return {
      accountId: acc.Ac_id,
      rootId,
      subaccId: acc.Ac_id,
      leafId: -1,
      path: `${rootId},${acc.Ac_id},-1`,
    };
  }

  // سطح ۳ (تفصیلی)
  const grandParent = await db
    .prepare('SELECT Ac_id, Ac_parent_id FROM accounts WHERE Ac_id = ?')
    .bind(parent.Ac_parent_id)
    .first<{ Ac_id: number; Ac_parent_id: number }>();

  const rootId = grandParent ? grandParent.Ac_id : parent.Ac_parent_id;
  return {
    accountId: acc.Ac_id,
    rootId,
    subaccId: parent.Ac_id,
    leafId: acc.Ac_id,
    path: `${rootId},${parent.Ac_id},${acc.Ac_id}`,
  };
}

/**
 * استخراج عمیق‌ترین شناسه حساب از یک ردیف Activity
 */
export function pickLeafAccountId(
  leafId: number | null | undefined,
  subId: number | null | undefined,
  rootId: number | null | undefined
): number | null {
  if (leafId && leafId > 0) return leafId;
  if (subId && subId > 0) return subId;
  if (rootId && rootId > 0) return rootId;
  return null;
}

/**
 * به‌روزرسانی مانده حساب و انتشار تغییر به حساب‌های والد در درخت پارمیس
 */
export async function applyAccountDelta(
  db: D1Database,
  accountId: number | null | undefined,
  delta: number
): Promise<void> {
  if (!accountId || accountId <= 0 || !delta) return;

  let currentId: number | null = accountId;
  const visited = new Set<number>();

  while (currentId && currentId > 0 && !visited.has(currentId)) {
    visited.add(currentId);
    await db
      .prepare('UPDATE accounts SET Ac_balance = COALESCE(Ac_balance, 0) + ? WHERE Ac_id = ?')
      .bind(delta, currentId)
      .run();

    const row: { Ac_parent_id: number } | null = await db
      .prepare('SELECT Ac_parent_id FROM accounts WHERE Ac_id = ?')
      .bind(currentId)
      .first<{ Ac_parent_id: number }>();

    currentId = row && row.Ac_parent_id > 0 ? row.Ac_parent_id : null;
  }
}

/**
 * اعمال اثر مالی یک سند روی حساب مبدا (کاهش) و حساب مقصد (افزایش)
 */
export async function applyActivityBalances(
  db: D1Database,
  fromAccountId: number | null | undefined,
  toAccountId: number | null | undefined,
  amount: number
): Promise<void> {
  if (!amount) return;
  if (fromAccountId && fromAccountId > 0) {
    await applyAccountDelta(db, fromAccountId, -amount);
  }
  if (toAccountId && toAccountId > 0) {
    await applyAccountDelta(db, toAccountId, amount);
  }
}

/**
 * معکوس کردن اثر مالی یک ردیف Activity (برای ویرایش یا حذف سند)
 */
export async function reverseActivityRowBalances(
  db: D1Database,
  act: {
    Act_amount?: number;
    Act_accRecive_id?: number;
    Act_rec_Subacc_id?: number;
    Act_rec_Root_id?: number;
    Act_accPay_id?: number;
    Act_pay_Subacc_id?: number;
    Act_pay_Root_id?: number;
  }
): Promise<void> {
  const amount = Number(act.Act_amount || 0);
  if (!amount) return;

  const fromAccId = pickLeafAccountId(act.Act_accRecive_id, act.Act_rec_Subacc_id, act.Act_rec_Root_id);
  const toAccId = pickLeafAccountId(act.Act_accPay_id, act.Act_pay_Subacc_id, act.Act_pay_Root_id);

  if (fromAccId) {
    await applyAccountDelta(db, fromAccId, amount);
  }
  if (toAccId) {
    await applyAccountDelta(db, toAccId, -amount);
  }
}
