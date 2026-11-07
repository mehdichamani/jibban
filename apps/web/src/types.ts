export interface Account {
  id: string;
  userId: string;
  parentId?: string | null;
  name: string;
  type: 'bank' | 'wallet' | 'savings' | 'credit' | 'debt' | 'counterparty' | 'expense' | 'income';
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
  children?: Account[];
  recentTransactions?: Transaction[];
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  userId: string;
  entryType: 'source' | 'destination';
  accountId?: string | null;
  categoryId?: string | null;
  counterpartyId?: string | null;
  amount: number; // ریال
  description?: string | null;
  createdAt?: string;
  accountName?: string;
  categoryName?: string;
  counterpartyName?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  fiscalYearId?: string;
  bankName?: string;
  accountNumber?: string;
  amount: number; // به ریال در دیتابیس
  type: 'debit' | 'credit' | 'transfer' | 'compound';
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
  time?: string;
  isCompound?: boolean | number;
  items?: TransactionItem[];
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
}

export interface PendingSms {
  id: string;
  smsHash: string;
  sender?: string;
  rawText: string;
  bankName?: string;
  parsedAmount?: number;
  parsedAccount?: string;
  status: 'pending' | 'processed' | 'ignored';
  receivedAt?: string;
  createdAt?: string;
}

export interface GroupMember {
  id: string;
  name: string;
  phone?: string;
  avatar?: string;
}

export interface ExpenseSplit {
  userId: string;
  owedAmount: number; // ریال
  percentage?: number;
}

export interface Expense {
  id: string;
  groupId: string;
  payerId: string;
  payerName?: string;
  amount: number; // ریال
  description: string;
  expenseDate: string;
  splits: ExpenseSplit[];
}

export interface DebtBalance {
  fromUserId: string;
  fromUserName?: string;
  toUserId: string;
  toUserName?: string;
  amount: number; // ریال
}

export interface GroupSummaryData {
  groupId: string;
  groupName: string;
  totalExpenses: number;
  userBalance: number;
  memberBalances: Array<{
    userId: string;
    userName: string;
    netBalance: number; // مثبت: طلبکار، منفی: بدهکار
  }>;
  settlements: DebtBalance[];
}

export interface Group {
  id: string;
  name: string;
  createdAt: string;
  members: GroupMember[];
  expenses: Expense[];
  summary?: GroupSummaryData;
}
