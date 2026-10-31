export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'bank' | 'wallet' | 'savings' | 'credit' | 'debt' | 'counterparty';
  bankName?: string;
  accountNumber?: string;
  cardNumber?: string;
  sheba?: string;
  color: string;
  icon: string;
  balance: number; // مانده به ریال در دیتابیس
  initialBalance: number;
  isSource?: boolean;
  isDestination?: boolean;
  isArchived?: boolean;
  createdAt?: string;
  recentTransactions?: Transaction[];
}

export interface Transaction {
  id: string;
  userId: string;
  bankName?: string;
  accountNumber?: string;
  amount: number; // به ریال در دیتابیس
  type: 'debit' | 'credit' | 'transfer';
  balance?: number;
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  fromAccountId?: string;
  fromAccountName?: string;
  fromAccountColor?: string;
  fromAccountIcon?: string;
  fromAccountBankName?: string;
  toAccountId?: string;
  toAccountName?: string;
  toAccountColor?: string;
  toAccountIcon?: string;
  toAccountBankName?: string;
  counterpartyId?: string;
  counterpartyName?: string;
  description?: string;
  tag?: string;
  trackingCode?: string;
  rawSms?: string;
  rawSmsId?: string;
  transactionDate: string;
  shamsiDate?: string;
}

export interface Category {
  id: string;
  userId?: string;
  parentId?: string | null;
  name: string;
  icon?: string;
  color?: string;
  type?: 'expense' | 'income' | 'transfer';
  isIncome?: boolean;
  children?: Category[];
}

export interface Counterparty {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  balance: number; // ریال
  notes?: string;
  createdAt?: string;
}

export interface Loan {
  id: string;
  userId: string;
  title: string;
  accountId?: string;
  accountName?: string;
  totalAmount: number; // ریال
  totalProfit: number; // ریال
  installmentAmount: number; // ریال
  totalInstallments: number;
  paidInstallments: number;
  startDate: string;
  status: 'active' | 'completed' | 'overdue';
  installments?: LoanInstallment[];
}

export interface LoanInstallment {
  id: string;
  loanId: string;
  installmentNumber: number;
  amount: number; // ریال
  dueDate: string;
  paidDate?: string | null;
  isPaid: boolean;
  linkedTransactionId?: string | null;
}

export interface Group {
  id: string;
  name: string;
  createdBy: string;
  memberCount?: number;
}

export interface UserBalanceWithInfo {
  counterpartyId: string;
  name: string;
  netBalance: number;
  totalPaid: number;
  totalShare: number;
}

export interface SettlementWithInfo {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface GroupSummaryData {
  groupId: string;
  totalExpenses: number;
  balances: UserBalanceWithInfo[];
  settlements: SettlementWithInfo[];
}
