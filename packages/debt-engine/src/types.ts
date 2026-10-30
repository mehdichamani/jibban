/**
 * تعاریف تایپ‌های محاسبات دنگ و تسویه بدهی‌ها (Debt Engine Types)
 */

/**
 * تراکنش تسویه ساده‌سازی‌شده بین دو کاربر
 */
export interface Settlement {
  /**
   * شناسه کاربری که باید پول را بپردازد (بدهکار)
   */
  fromUser: string;

  /**
   * شناسه کاربری که پول را دریافت می‌کند (طلبکار)
   */
  toUser: string;

  /**
   * مبلغ تسویه به تومان
   */
  amount: number;
}

/**
 * سهم یک عضو از یک هزینه مشخص
 */
export interface ExpenseSplit {
  userId: string;
  owedAmount: number;
}

/**
 * هزینه ثبت‌شده در گروه
 */
export interface Expense {
  id?: string;
  payerId: string;
  amount: number;
  description?: string;
  splits: ExpenseSplit[];
  date?: string;
}

/**
 * تسویه‌حساب پرداخت‌شده و ثبت‌شده پیشین در دیتابیس
 */
export interface PastSettlement {
  id?: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  settledAt?: string;
}

/**
 * خلاصه تراز مالی یک کاربر در گروه
 */
export interface UserBalance {
  userId: string;
  /**
   * تراز نهایی: مثبت نشان‌دهنده طلبکار بودن و منفی نشان‌دهنده بدهکار بودن است
   */
  netBalance: number;
  /**
   * مجموع کل مبالغی که این کاربر پرداخت کرده است
   */
  totalPaid: number;
  /**
   * مجموع کل سهمی که به پای این کاربر نوشته شده است
   */
  totalShare: number;
}

/**
 * خلاصه وضعیت مالی کل گروه
 */
export interface GroupSummary {
  /**
   * مجموع کل هزینه‌های گروه
   */
  totalExpenses: number;
  /**
   * تراز مالی تفکیک‌شده به ازای هر کاربر
   */
  balances: Record<string, UserBalance>;
  /**
   * بهینه‌ترین لیست تراکنش‌های تسویه بدهی با حداقل تراکنش (Debt Simplification)
   */
  settlements: Settlement[];
}
