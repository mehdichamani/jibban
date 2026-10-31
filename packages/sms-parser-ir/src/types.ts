export type TransactionType = 'debit' | 'credit';

/**
 * خروجی استاندارد و نرمال‌شده پارسر پیامک بانکی جیب‌بان ۲.۰ (مبالغ همیشه به ریال)
 */
export interface ParsedBankSms {
  /**
   * آیا پیامک ورودی یک پیامک تراکنش بانکی معتبر است یا خیر
   */
  isBankSms: boolean;

  /**
   * نام بانک شناسایی شده (مثلاً 'ملی', 'سامان', 'بلوبانک', 'تجارت', 'پاسارگاد')
   */
  bankName: string;

  /**
   * نوع تراکنش: برداشت (debit) یا واریز (credit)
   */
  type: TransactionType;

  /**
   * مبلغ تراکنش (همیشه به ریال و به صورت عدد صحیح)
   */
  amount: number;

  /**
   * مانده حساب پس از تراکنش به ریال (در صورت وجود در پیامک)
   */
  balance?: number;

  /**
   * شماره حساب، شماره کارت یا ۴ رقم آخر
   */
  accountNumber?: string;

  /**
   * تاریخ و ساعت استاندارد ISO 8601
   */
  transactionDate?: string;

  /**
   * تاریخ شمسی (مانند: 1403/08/10)
   */
  shamsiDate?: string;

  /**
   * زمان تراکنش (مانند: 14:30)
   */
  time?: string;

  /**
   * توضیحات، نام فروشگاه/پذیرنده، یا بابت تراکنش
   */
  description?: string;

  /**
   * متن خام اولیه پیامک
   */
  rawText: string;
}

export interface BankRule {
  id: string;
  name: string;
  aliases: string[];
  defaultCurrency?: 'rial' | 'toman';
  customParser?: (cleanedText: string, rawText: string) => Partial<ParsedBankSms> | null;
}

export interface BankPattern {
  Name: string;
  Numbers: string[];
  TransactionTypes: Array<{
    Type: number; // 0: debit, 1: credit, 2: balance/other
    TypeName: string;
    TypeIdentity?: string | null;
    Template: string;
    Amount?: { Regex: string; Format?: string };
    AccountNumber?: { Regex: string; Format?: string };
    Date?: { Regex: string; Format?: string };
    Time?: { Regex: string; Format?: string };
  }>;
}
