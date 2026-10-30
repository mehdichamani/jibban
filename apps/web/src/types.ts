export interface Transaction {
  id: string;
  userId: string;
  bankName: string;
  accountNumber?: string;
  amount: number; // همیشه به تومان
  type: 'debit' | 'credit';
  balance?: number;
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  description?: string;
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
  isIncome?: boolean;
}
