/**
 * تعاریف بایندینگ‌ها و تایپ‌های سرورلس Cloudflare Worker در Hono (JibBan 2.0)
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

// ۴. تراکنش‌های مالی
export interface Transaction {
  id: string;
  user_id: string;
  type: 'debit' | 'credit' | 'transfer';
  amount: number; // ریال
  from_account_id?: string | null;
  to_account_id?: string | null;
  category_id?: string | null;
  counterparty_id?: string | null;
  description?: string;
  tag?: string;
  raw_sms_id?: string | null;
  transaction_date: string;
  shamsi_date?: string;
  created_at?: string;
  // فیلدهای کمکی حاصل از Join
  from_account_name?: string;
  to_account_name?: string;
  category_name?: string;
  counterparty_name?: string;
}

// ۵. وام‌ها و اقساط
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

// ۶. پیامک‌های خام بانکی
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
