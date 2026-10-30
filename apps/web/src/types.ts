export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'bank' | 'wallet' | 'savings' | 'credit' | 'counterparty';
  bankName?: string;
  accountNumber?: string;
  cardNumber?: string;
  color: string;
  icon: string;
  balance: number; // مانده فعلی به تومان
  initialBalance: number;
  isSource: boolean; // قابل استفاده به عنوان حساب مبدأ
  isDestination: boolean; // قابل استفاده به عنوان حساب مقصد
  isArchived?: boolean;
  createdAt?: string;
  recentTransactions?: Transaction[];
}

export interface Transaction {
  id: string;
  userId: string;
  bankName?: string;
  accountNumber?: string;
  amount: number; // همیشه به تومان
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
  description?: string;
  trackingCode?: string;
  rawSms?: string;
  transactionDate: string;
}

export interface GroupMember {
  id: string;
  name: string;
  role?: string;
}

export interface Group {
  id: string;
  name: string;
  currency: string;
  createdBy: string;
  memberCount?: number;
}

export interface UserBalanceWithInfo {
  userId: string;
  userName: string;
  netBalance: number;
  totalPaid: number;
  totalShare: number;
}

export interface SettlementWithInfo {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
}

export interface GroupSummaryData {
  groupId: string;
  totalExpenses: number;
  balances: UserBalanceWithInfo[];
  settlements: SettlementWithInfo[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type?: 'expense' | 'income' | 'transfer';
  isIncome?: boolean;
}
