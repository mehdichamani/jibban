/**
 * تعاریف بایندینگ‌ها و تایپ‌های سرورلس Cloudflare Worker در Hono (JibBan 2.5 - دفتر روزنامه به سبک پارمیس)
 */

export type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  ENVIRONMENT?: string;
};

export type Variables = {
  userId?: string;
  user?: {
    id: string;
    name: string;
    syncToken: string;
  };
};

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ۰. سال‌های مالی (Fiscal Years)
export interface FiscalYear {
  id: string;
  user_id: string;
  name: string;
  begin_date: string;
  end_date: string;
  status: 'open' | 'closed';
  is_active: number;
  created_at?: string;
}

// ۱. حساب‌های مالی (مبالغ به ریال)
export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: 'bank' | 'wallet' | 'savings' | 'credit' | 'debt';
  bank_name?: string;
  account_number?: string;
  card_number?: string;
  sheba?: string;
  balance: number; // ریال
  initial_balance: number; // ریال
  color?: string;
  icon?: string;
  is_archived?: number;
  created_at?: string;
}

// ۲. دسته‌بندی‌های درختی
export interface Category {
  id: string;
  user_id?: string;
  parent_id?: string | null;
  name: string;
  type: 'expense' | 'income';
  icon?: string;
  color?: string;
  created_at?: string;
  children?: Category[];
}

// ۳. طرف‌حساب‌ها و اشخاص
export interface Counterparty {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  balance: number; // طلب مثبت، بدهی منفی (ریال)
  notes?: string;
  created_at?: string;
}

// ۴. اقلام اسناد مرکب / ریزآیتم‌های چندگانه (معادل MultiActivity پارمیس)
export interface TransactionItem {
  id: string;
  transactionId?: string;
  transaction_id?: string;
  userId?: string;
  user_id?: string;
  entryType?: 'source' | 'destination';
  entry_type?: 'source' | 'destination';
  accountId?: string | null;
  account_id?: string | null;
  categoryId?: string | null;
  category_id?: string | null;
  counterpartyId?: string | null;
  counterparty_id?: string | null;
  amount: number; // ریال
  description?: string | null;
  createdAt?: string;
  created_at?: string;
  // فیلدهای نام الحاقی
  accountName?: string;
  account_name?: string;
  categoryName?: string;
  category_name?: string;
  counterpartyName?: string;
  counterparty_name?: string;
}

// ۵. تراکنش‌ها و اسناد مالی (دفتر روزنامه)
export interface Transaction {
  id: string;
  userId?: string;
  user_id?: string;
  fiscalYearId?: string | null;
  fiscal_year_id?: string | null;
  type: 'debit' | 'credit' | 'transfer' | 'compound';
  amount: number; // ریال
  fromAccountId?: string | null;
  from_account_id?: string | null;
  toAccountId?: string | null;
  to_account_id?: string | null;
  categoryId?: string | null;
  category_id?: string | null;
  counterpartyId?: string | null;
  counterparty_id?: string | null;
  description?: string;
  tag?: string;
  rawSmsId?: string | null;
  raw_sms_id?: string | null;
  transactionDate?: string;
  transaction_date?: string;
  shamsiDate?: string;
  shamsi_date?: string;
  time?: string;
  isCompound?: number | boolean;
  is_compound?: number | boolean;
  items?: TransactionItem[];
  createdAt?: string;
  created_at?: string;
  // فیلدهای کمکی حاصل از Join
  fromAccountName?: string;
  from_account_name?: string;
  fromAccountColor?: string;
  fromAccountIcon?: string;
  fromAccountBankName?: string;
  toAccountName?: string;
  to_account_name?: string;
  toAccountColor?: string;
  toAccountIcon?: string;
  toAccountBankName?: string;
  categoryName?: string;
  category_name?: string;
  categoryIcon?: string;
  categoryColor?: string;
  counterpartyName?: string;
  counterparty_name?: string;
}

// ۶. وام‌ها و اقساط
export interface Loan {
  id: string;
  user_id: string;
  title: string;
  account_id?: string;
  total_amount: number; // ریال
  total_profit: number; // ریال
  installment_amount: number; // ریال
  total_installments: number;
  paid_installments: number;
  start_date: string;
  status: 'active' | 'completed' | 'overdue';
  created_at?: string;
  installments?: LoanInstallment[];
}

export interface LoanInstallment {
  id: string;
  loan_id: string;
  installment_number: number;
  amount: number; // ریال
  due_date: string;
  paid_date?: string | null;
  is_paid: number;
  linked_transaction_id?: string | null;
}

// ۷. پیامک‌های خام بانکی
export interface RawSms {
  id: string;
  sms_hash: string;
  user_id: string;
  sender?: string;
  raw_text: string;
  bank_name?: string;
  parsed_amount?: number; // ریال
  parsed_account?: string;
  status: 'processed' | 'ignored' | 'manual';
  transaction_id?: string;
  received_at?: string;
  created_at?: string;
}
