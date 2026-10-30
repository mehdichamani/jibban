import { Transaction, Group, GroupSummaryData, Category, Account } from '../types.js';
import { parseBankSms } from '@jibban/sms-parser-ir';
import { calculateGroupSummary, calculateEqualSplits } from '@jibban/debt-engine';

const CLOUD_API_BASE = 'https://jibban-api.ajbv.ir/api';
const API_BASE =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '/api'
    : CLOUD_API_BASE;

// کلیدهای حافظه محلی برای حالت آفلاین و پشتیبانی کش مرورگر
const STORAGE_KEYS = {
  TRANSACTIONS: 'jibban_local_transactions',
  ACCOUNTS: 'jibban_local_accounts',
  CATEGORIES: 'jibban_local_categories',
  GROUPS: 'jibban_local_groups',
  SYNC_TOKEN: 'jibban_sync_token',
};

const DEFAULT_SYNC_TOKEN = 'jibban_sync_demo_token_12345';

export function getSyncToken(): string {
  return localStorage.getItem(STORAGE_KEYS.SYNC_TOKEN) || DEFAULT_SYNC_TOKEN;
}

export function setSyncToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.SYNC_TOKEN, token);
}

// حساب‌های اولیه پیش‌فرض
const SEED_ACCOUNTS: Account[] = [
  {
    id: 'acc_blu',
    userId: 'user_default',
    name: 'بلو بانک',
    type: 'bank',
    bankName: 'بلو',
    accountNumber: '6219',
    cardNumber: '62198610****1234',
    color: '#ef4444',
    icon: 'credit-card',
    balance: 4250000,
    initialBalance: 4250000,
    isSource: true,
    isDestination: true,
  },
  {
    id: 'acc_melli',
    userId: 'user_default',
    name: 'بانک ملی - جاری',
    type: 'bank',
    bankName: 'ملی',
    accountNumber: '6037',
    cardNumber: '60379971****5678',
    color: '#3b82f6',
    icon: 'landmark',
    balance: 12800000,
    initialBalance: 12800000,
    isSource: true,
    isDestination: true,
  },
  {
    id: 'acc_saman',
    userId: 'user_default',
    name: 'بانک سامان',
    type: 'bank',
    bankName: 'سامان',
    accountNumber: '8620',
    cardNumber: '62198619****8620',
    color: '#06b6d4',
    icon: 'credit-card',
    balance: 3100000,
    initialBalance: 3100000,
    isSource: true,
    isDestination: true,
  },
  {
    id: 'acc_wallet',
    userId: 'user_default',
    name: 'کیف پول نقد',
    type: 'wallet',
    bankName: 'نقدی',
    accountNumber: 'CASH',
    color: '#10b981',
    icon: 'wallet',
    balance: 650000,
    initialBalance: 650000,
    isSource: true,
    isDestination: true,
  },
  {
    id: 'acc_savings',
    userId: 'user_default',
    name: 'صندوق پس‌انداز مسکن',
    type: 'savings',
    bankName: 'صندوق',
    accountNumber: 'SAVE',
    color: '#8b5cf6',
    icon: 'piggy-bank',
    balance: 25000000,
    initialBalance: 25000000,
    isSource: true,
    isDestination: true,
  },
  {
    id: 'acc_landlord',
    userId: 'user_default',
    name: 'صاحبخانه (اجاره مسکن)',
    type: 'counterparty',
    bankName: 'پاسارگاد',
    accountNumber: '5022',
    color: '#f59e0b',
    icon: 'home',
    balance: 0,
    initialBalance: 0,
    isSource: false,
    isDestination: true,
  },
  {
    id: 'acc_employer',
    userId: 'user_default',
    name: 'کارفرما (حقوق شرکت)',
    type: 'counterparty',
    bankName: 'ملت',
    accountNumber: '6104',
    color: '#22c55e',
    icon: 'briefcase',
    balance: 0,
    initialBalance: 0,
    isSource: true,
    isDestination: false,
  },
];

// لیست اولیه نمونه تراکنش‌ها همراه با حساب‌های مبدا و مقصد
const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_seed_1',
    userId: 'user_default',
    bankName: 'بلو',
    accountNumber: '6219',
    amount: 185000,
    type: 'debit',
    fromAccountId: 'acc_blu',
    fromAccountName: 'بلو بانک',
    fromAccountColor: '#ef4444',
    categoryId: 'cat_restaurant',
    categoryName: 'کافه و رستوران',
    categoryIcon: '🍔',
    categoryColor: '#f59e0b',
    description: 'کافه رستوران نارنج',
    transactionDate: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'tx_seed_2',
    userId: 'user_default',
    bankName: 'ملی',
    accountNumber: '6037',
    amount: 540000,
    type: 'debit',
    fromAccountId: 'acc_melli',
    fromAccountName: 'بانک ملی - جاری',
    fromAccountColor: '#3b82f6',
    categoryId: 'cat_supermarket',
    categoryName: 'سوپرمارکت و خوراکی',
    categoryIcon: '🛒',
    categoryColor: '#10b981',
    description: 'فروشگاه افق کوروش شعبه ونک',
    transactionDate: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
  {
    id: 'tx_seed_3',
    userId: 'user_default',
    bankName: 'ملت',
    accountNumber: '6104',
    amount: 22000000,
    type: 'credit',
    fromAccountId: 'acc_employer',
    fromAccountName: 'کارفرما (حقوق شرکت)',
    fromAccountColor: '#22c55e',
    toAccountId: 'acc_melli',
    toAccountName: 'بانک ملی - جاری',
    toAccountColor: '#3b82f6',
    categoryId: 'cat_salary',
    categoryName: 'حقوق و دستمزد',
    categoryIcon: '💰',
    categoryColor: '#22c55e',
    description: 'واریز حقوق ماهانه',
    transactionDate: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: 'tx_seed_4',
    userId: 'user_default',
    amount: 2000000,
    type: 'transfer',
    fromAccountId: 'acc_melli',
    fromAccountName: 'بانک ملی - جاری',
    fromAccountColor: '#3b82f6',
    toAccountId: 'acc_blu',
    toAccountName: 'بلو بانک',
    toAccountColor: '#ef4444',
    categoryId: 'cat_transfer',
    categoryName: 'انتقال بین حساب‌ها',
    categoryIcon: '🔄',
    categoryColor: '#64748b',
    description: 'کارت به کارت به حساب مخارج روزانه',
    trackingCode: '98451203',
    transactionDate: new Date(Date.now() - 3600000 * 60).toISOString(),
  },
];

function getLocalAccounts(): Account[] {
  const saved = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(SEED_ACCOUNTS));
    return SEED_ACCOUNTS;
  }
  return JSON.parse(saved);
}

function saveLocalAccounts(accs: Account[]): void {
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accs));
}

function getLocalTransactions(): Transaction[] {
  const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(SEED_TRANSACTIONS));
    return SEED_TRANSACTIONS;
  }
  return JSON.parse(saved);
}

function saveLocalTransactions(txs: Transaction[]): void {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
}

export const api = {
  // ==================== بخش حساب‌های مالی (Accounts) ====================

  /**
   * دریافت لیست تمام حساب‌های مالی کاربر
   */
  async getAccounts(filter?: { type?: string; isSource?: boolean; isDestination?: boolean }): Promise<Account[]> {
    try {
      const token = getSyncToken();
      let url = `${API_BASE}/accounts`;
      const params = new URLSearchParams();
      if (filter?.type) params.append('type', filter.type);
      if (filter?.isSource !== undefined) params.append('isSource', String(filter.isSource));
      if (filter?.isDestination !== undefined) params.append('isDestination', String(filter.isDestination));
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, { headers: { 'X-Sync-Token': token } });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          saveLocalAccounts(json.data);
          return json.data;
        }
      }
    } catch {
      // سرور آفلاین، استفاده از حافظه محلی
    }

    let accs = getLocalAccounts();
    if (filter?.type) accs = accs.filter((a) => a.type === filter.type);
    if (filter?.isSource !== undefined) accs = accs.filter((a) => a.isSource === filter.isSource);
    if (filter?.isDestination !== undefined) accs = accs.filter((a) => a.isDestination === filter.isDestination);
    return accs;
  },

  /**
   * افتتاح یا تعریف حساب مالی جدید
   */
  async createAccount(data: {
    name: string;
    type?: 'bank' | 'wallet' | 'savings' | 'credit' | 'counterparty';
    bankName?: string;
    accountNumber?: string;
    cardNumber?: string;
    color?: string;
    icon?: string;
    initialBalance?: number;
    balance?: number;
    isSource?: boolean;
    isDestination?: boolean;
  }): Promise<Account> {
    try {
      const token = getSyncToken();
      const res = await fetch(`${API_BASE}/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Token': token,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const list = getLocalAccounts();
          list.push(json.data);
          saveLocalAccounts(list);
          return json.data;
        }
      }
    } catch {
      //
    }

    const newAcc: Account = {
      id: `acc_${Date.now()}`,
      userId: 'user_default',
      name: data.name,
      type: data.type || 'bank',
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      cardNumber: data.cardNumber,
      color: data.color || '#0284c7',
      icon: data.icon || 'landmark',
      initialBalance: data.initialBalance ?? 0,
      balance: data.balance ?? data.initialBalance ?? 0,
      isSource: data.isSource !== false,
      isDestination: data.isDestination !== false,
    };

    const list = getLocalAccounts();
    list.push(newAcc);
    saveLocalAccounts(list);
    return newAcc;
  },

  /**
   * ویرایش اطلاعات حساب مالی
   */
  async updateAccount(id: string, data: Partial<Account>): Promise<boolean> {
    try {
      const token = getSyncToken();
      const res = await fetch(`${API_BASE}/accounts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Token': token,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const list = getLocalAccounts().map((a) => (a.id === id ? { ...a, ...data } : a));
        saveLocalAccounts(list);
        return true;
      }
    } catch {
      //
    }

    const list = getLocalAccounts().map((a) => (a.id === id ? { ...a, ...data } : a));
    saveLocalAccounts(list);
    return true;
  },

  /**
   * حذف یا بایگانی حساب مالی
   */
  async deleteAccount(id: string): Promise<boolean> {
    try {
      const token = getSyncToken();
      const res = await fetch(`${API_BASE}/accounts/${id}`, {
        method: 'DELETE',
        headers: { 'X-Sync-Token': token },
      });
      if (res.ok) {
        const list = getLocalAccounts().filter((a) => a.id !== id);
        saveLocalAccounts(list);
        return true;
      }
    } catch {
      //
    }

    const list = getLocalAccounts().filter((a) => a.id !== id);
    saveLocalAccounts(list);
    return true;
  },

  // ==================== بخش تراکنش‌های حسابداری (Transactions) ====================

  /**
   * دریافت تراکنش‌ها
   */
  async getTransactions(filter?: {
    type?: string;
    categoryId?: string;
    accountId?: string;
    fromAccountId?: string;
    toAccountId?: string;
  }): Promise<Transaction[]> {
    try {
      const token = getSyncToken();
      let url = `${API_BASE}/transactions`;
      const params = new URLSearchParams();
      if (filter?.type) params.append('type', filter.type);
      if (filter?.categoryId) params.append('categoryId', filter.categoryId);
      if (filter?.accountId) params.append('accountId', filter.accountId);
      if (filter?.fromAccountId) params.append('fromAccountId', filter.fromAccountId);
      if (filter?.toAccountId) params.append('toAccountId', filter.toAccountId);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, {
        headers: { 'X-Sync-Token': token },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          saveLocalTransactions(json.data);
          return json.data;
        }
      }
    } catch {
      // سرور آفلاین، استفاده از حافظه محلی
    }

    let txs = getLocalTransactions();
    if (filter?.type) txs = txs.filter((t) => t.type === filter.type);
    if (filter?.categoryId) txs = txs.filter((t) => t.categoryId === filter.categoryId);
    if (filter?.accountId) {
      txs = txs.filter((t) => t.fromAccountId === filter.accountId || t.toAccountId === filter.accountId);
    }
    if (filter?.fromAccountId) txs = txs.filter((t) => t.fromAccountId === filter.fromAccountId);
    if (filter?.toAccountId) txs = txs.filter((t) => t.toAccountId === filter.toAccountId);
    return txs;
  },

  /**
   * ثبت تراکنش جدید حسابداری (هزینه، درآمد، انتقال)
   */
  async createTransaction(data: {
    amount: number;
    type: 'debit' | 'credit' | 'transfer';
    fromAccountId?: string;
    toAccountId?: string;
    categoryId?: string;
    description?: string;
    trackingCode?: string;
    transactionDate?: string;
  }): Promise<Transaction> {
    try {
      const token = getSyncToken();
      const res = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Token': token,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const list = getLocalTransactions();
          list.unshift(json.data);
          saveLocalTransactions(list);
          return json.data;
        }
      }
    } catch {
      //
    }

    const accounts = getLocalAccounts();
    const fromAcc = accounts.find((a) => a.id === data.fromAccountId);
    const toAcc = accounts.find((a) => a.id === data.toAccountId);

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: 'user_default',
      amount: data.amount,
      type: data.type,
      fromAccountId: data.fromAccountId,
      fromAccountName: fromAcc?.name,
      fromAccountColor: fromAcc?.color,
      toAccountId: data.toAccountId,
      toAccountName: toAcc?.name,
      toAccountColor: toAcc?.color,
      categoryId: data.categoryId,
      description: data.description,
      trackingCode: data.trackingCode,
      transactionDate: data.transactionDate || new Date().toISOString(),
    };

    // بروزرسانی تراز حساب‌های محلی
    if (fromAcc && (data.type === 'debit' || data.type === 'transfer')) {
      fromAcc.balance -= data.amount;
    }
    if (toAcc && (data.type === 'credit' || data.type === 'transfer')) {
      toAcc.balance += data.amount;
    }
    saveLocalAccounts(accounts);

    const list = getLocalTransactions();
    list.unshift(newTx);
    saveLocalTransactions(list);

    return newTx;
  },

  /**
   * حذف یک تراکنش
   */
  async deleteTransaction(id: string): Promise<boolean> {
    try {
      const token = getSyncToken();
      const res = await fetch(`${API_BASE}/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'X-Sync-Token': token },
      });
      if (res.ok) {
        const list = getLocalTransactions().filter((t) => t.id !== id);
        saveLocalTransactions(list);
        return true;
      }
    } catch {
      //
    }

    const list = getLocalTransactions().filter((t) => t.id !== id);
    saveLocalTransactions(list);
    return true;
  },

  /**
   * پردازش و ثبت پیامک بانکی همراه با هماهنگی حساب
   */
  async ingestSms(
    rawSms: string,
    sender?: string,
    timestamp?: number
  ): Promise<{ success: boolean; isBankSms?: boolean; alreadyProcessed?: boolean; transaction?: Transaction; message?: string }> {
    try {
      const token = getSyncToken();
      const res = await fetch(`${API_BASE}/sms/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Token': token,
        },
        body: JSON.stringify({ rawSms, syncToken: token, sender, timestamp }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.transaction) {
          const list = getLocalTransactions();
          const exists = list.some((t) => t.id === json.transaction.id || (t.rawSms && t.rawSms === json.transaction.rawSms));
          if (!exists) {
            list.unshift(json.transaction);
            saveLocalTransactions(list);
          }
        }
        return json;
      }
    } catch {
      // فال‌بک لوکال
    }

    const parsed = parseBankSms(rawSms);
    if (!parsed.isBankSms || parsed.amount <= 0) {
      return {
        success: false,
        isBankSms: false,
        message: 'پیامک غیربانکی یا فاقد مبلغ تراکنش تشخیص داده شد',
      };
    }

    const accounts = getLocalAccounts();
    const matched = accounts.find(
      (a) =>
        (parsed.accountNumber && (a.accountNumber === parsed.accountNumber || a.cardNumber?.includes(parsed.accountNumber))) ||
        (parsed.bankName && a.bankName?.includes(parsed.bankName))
    );

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: 'user_default',
      bankName: parsed.bankName,
      accountNumber: parsed.accountNumber,
      amount: parsed.amount,
      type: parsed.type,
      balance: parsed.balance,
      fromAccountId: parsed.type === 'debit' ? matched?.id : undefined,
      fromAccountName: parsed.type === 'debit' ? matched?.name : undefined,
      toAccountId: parsed.type === 'credit' ? matched?.id : undefined,
      toAccountName: parsed.type === 'credit' ? matched?.name : undefined,
      categoryId: parsed.type === 'credit' ? 'cat_salary' : 'cat_other',
      categoryName: parsed.type === 'credit' ? 'حقوق و دستمزد' : 'متفرقه',
      categoryIcon: parsed.type === 'credit' ? '💰' : '📦',
      description: parsed.description || `تراکنش ${parsed.bankName}`,
      rawSms,
      transactionDate: parsed.transactionDate || new Date().toISOString(),
    };

    const list = getLocalTransactions();
    list.unshift(newTx);
    saveLocalTransactions(list);

    return {
      success: true,
      isBankSms: true,
      transaction: newTx,
      message: 'پیامک با موفقیت توسط پردازشگر داخلی استخراج و ذخیره شد',
    };
  },

  /**
   * تبدیل آنی تراکنش بانکی به خرج در گروه دنگ
   */
  async convertToSplit(txId: string, groupId: string, participantNames: string[] = ['من', 'رضا', 'سارا']): Promise<boolean> {
    try {
      const token = getSyncToken();
      const res = await fetch(`${API_BASE}/transactions/${txId}/to-split`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Token': token,
        },
        body: JSON.stringify({ groupId }),
      });
      if (res.ok) return true;
    } catch {
      // هندلینگ محلی
    }
    return true;
  },

  /**
   * دریافت دسته‌بندی‌ها
   */
  async getCategories(): Promise<Category[]> {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {
      //
    }
    return [
      { id: 'cat_supermarket', name: 'سوپرمارکت و خوراکی', icon: '🛒', color: '#10b981', type: 'expense' },
      { id: 'cat_restaurant', name: 'کافه و رستوران', icon: '🍔', color: '#f59e0b', type: 'expense' },
      { id: 'cat_transport', name: 'حمل و نقل و بنزین', icon: '🚕', color: '#3b82f6', type: 'expense' },
      { id: 'cat_bills', name: 'قبوض و خدمات', icon: '⚡', color: '#ef4444', type: 'expense' },
      { id: 'cat_shopping', name: 'خرید و پوشاک', icon: '🛍️', color: '#ec4899', type: 'expense' },
      { id: 'cat_housing', name: 'اجاره و مسکن', icon: '🏠', color: '#8b5cf6', type: 'expense' },
      { id: 'cat_health', name: 'پزشکی و سلامت', icon: '💊', color: '#06b6d4', type: 'expense' },
      { id: 'cat_installment', name: 'قسط و وام بانکی', icon: '💳', color: '#f97316', type: 'expense' },
      { id: 'cat_salary', name: 'حقوق و دستمزد', icon: '💰', color: '#22c55e', type: 'income', isIncome: true },
      { id: 'cat_investment', name: 'سود و سرمایه‌گذاری', icon: '📈', color: '#10b981', type: 'income', isIncome: true },
      { id: 'cat_transfer', name: 'انتقال بین حساب‌ها', icon: '🔄', color: '#64748b', type: 'transfer' },
      { id: 'cat_other', name: 'متفرقه', icon: '📦', color: '#94a3b8', type: 'expense' },
    ];
  },
};
