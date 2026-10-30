export type TransactionType = 'debit' | 'credit';

/**
 * خروجی استاندارد و نرمال‌شده پارسر پیامک بانکی
 */
export interface ParsedBankSms {
  /**
   * آیا پیامک ورودی یک پیامک تراکنش بانکی معتبر است یا خیر
   */
  isBankSms: boolean;

  /**
   * نام بانک شناسایی شده (مثلاً 'ملی', 'سامان', 'بلو', 'بانک ناشناس')
   */
  bankName: string;

  /**
   * نوع تراکنش: برداشت (debit) یا واریز (credit)
   */
  type: TransactionType;

  /**
   * مبلغ تراکنش (همیشه به تومان و به صورت عدد صحیح)
   */
  amount: number;

  /**
   * مانده حساب پس از تراکنش به تومان (در صورت وجود در پیامک)
   */
  balance?: number;

  /**
   * ۴ رقم آخر کارت یا شماره حساب مبدأ/مقصد
   */
  accountNumber?: string;

  /**
   * تاریخ و ساعت تراکنش به صورت رشته استاندارد ISO 8601 (در صورت امکان تبدیل)
   */
  transactionDate?: string;

  /**
   * توضیحات، نام فروشگاه/پذیرنده، بابت یا طرف حساب
   */
  description?: string;

  /**
   * متن خام اولیه پیامک
   */
  rawText: string;
}

/**
 * ساختار تعریف و الگوهای هر بانک در سیستم
 */
export interface BankRule {
  id: string;
  name: string;
  aliases: string[];
  defaultCurrency?: 'rial' | 'toman';
  /**
   * الگوهای اختصاصی استخراج فیلدها در صورتی که ساختار بانک با الگوی متداول فرق داشته باشد
   */
  customParser?: (cleanedText: string, rawText: string) => Partial<ParsedBankSms> | null;
}
