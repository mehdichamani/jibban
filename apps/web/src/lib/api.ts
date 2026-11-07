import { Transaction, Group, GroupSummaryData, Category, Account, PendingSms } from '../types.js';
import { parseBankSms } from '@jibban/sms-parser-ir';
import { PARMIS_ACCOUNT_PARENT_MAP } from './parmisHierarchy.js';

const CLOUD_API_BASE = 'https://jibban-api.ajbv.ir/api';
const API_BASE =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '/api'
    : CLOUD_API_BASE;

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

function getLocalAccounts(): Account[] {
  const saved = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveLocalAccounts(accs: Account[]): void {
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accs));
}

function getLocalTransactions(): Transaction[] {
  const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveLocalTransactions(txs: Transaction[]): void {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
}

export const api = {
  // ==================== بخش حساب‌های مالی (Accounts) ====================

  /**
   * دریافت لیست تمام حساب‌های مالی کاربر مستقیماً از دیتابیس
   */
  async getAccounts(filter?: { type?: string }): Promise<Account[]> {
    try {
      const token = getSyncToken();
      let url = `${API_BASE}/accounts`;
      if (filter?.type) url += `?type=${filter.type}`;

      const res = await fetch(url, { headers: { 'X-Sync-Token': token } });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          // تطبیق و تزریق خودکار parentId برای حساب‌های پارمیس در صورت خالی بودن دیتابیس ریموت
          const enriched = json.data.map((acc: Account) => ({
            ...acc,
            parentId: acc.parentId || PARMIS_ACCOUNT_PARENT_MAP[acc.id] || PARMIS_ACCOUNT_PARENT_MAP[acc.id.replace(/^acc_/, '')] || null,
          }));
          saveLocalAccounts(enriched);
          return enriched;
        }
      }
    } catch {
      // استفاده از کش محلی در صورت قطعی شبکه
    }

    let accs = getLocalAccounts().map((acc: Account) => ({
      ...acc,
      parentId: acc.parentId || PARMIS_ACCOUNT_PARENT_MAP[acc.id] || PARMIS_ACCOUNT_PARENT_MAP[acc.id.replace(/^acc_/, '')] || null,
    }));
    if (filter?.type) accs = accs.filter((a) => a.type === filter.type);
    return accs;
  },

  /**
   * افتتاح یا تعریف حساب مالی جدید
   */
  async createAccount(data: {
    name: string;
    type?: 'bank' | 'wallet' | 'savings' | 'credit' | 'counterparty' | 'expense' | 'income' | 'debt';
    parentId?: string | null;
    bankName?: string;
    accountNumber?: string;
    cardNumber?: string;
    sheba?: string;
    color?: string;
    icon?: string;
    initialBalance?: number;
    balance?: number;
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
      sheba: data.sheba,
      color: data.color || '#0284c7',
      icon: data.icon || 'landmark',
      initialBalance: data.initialBalance ?? 0,
      balance: data.balance ?? data.initialBalance ?? 0,
      isSource: true,
      isDestination: true,
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
   * دریافت تراکنش‌ها از دیتابیس با فیلترها و صفحه‌بندی
   */
  async getTransactions(filter?: {
    type?: string;
    accountId?: string;
    fromAccountId?: string;
    toAccountId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Transaction[]> {
    try {
      const token = getSyncToken();
      let url = `${API_BASE}/transactions`;
      const params = new URLSearchParams();
      if (filter?.type) params.append('type', filter.type);
      if (filter?.accountId) params.append('accountId', filter.accountId);
      if (filter?.fromAccountId) params.append('fromAccountId', filter.fromAccountId);
      if (filter?.toAccountId) params.append('toAccountId', filter.toAccountId);
      params.append('limit', String(filter?.limit || 25));
      if (filter?.offset) params.append('offset', String(filter.offset));
      url += `?${params.toString()}`;

      const res = await fetch(url, {
        headers: { 'X-Sync-Token': token },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          if (!filter?.offset || filter.offset === 0) {
            saveLocalTransactions(json.data);
          }
          return json.data;
        }
      }
    } catch {
      //
    }

    let txs = getLocalTransactions();
    if (filter?.type) txs = txs.filter((t) => t.type === filter.type);
    if (filter?.accountId) {
      txs = txs.filter((t) => t.fromAccountId === filter.accountId || t.toAccountId === filter.accountId);
    }
    if (filter?.fromAccountId) txs = txs.filter((t) => t.fromAccountId === filter.fromAccountId);
    if (filter?.toAccountId) txs = txs.filter((t) => t.toAccountId === filter.toAccountId);
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 25;
    return txs.slice(offset, offset + limit);
  },

  /**
   * ثبت تراکنش جدید حسابداری
   */
  async createTransaction(data: {
    amount: number;
    type: 'debit' | 'credit' | 'transfer' | 'compound';
    fromAccountId?: string;
    toAccountId?: string;
    categoryId?: string;
    counterpartyId?: string;
    description?: string;
    trackingCode?: string;
    transactionDate?: string;
    shamsiDate?: string;
    time?: string;
  }): Promise<Transaction> {
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
      shamsiDate: data.shamsiDate,
      time: data.time || new Date().toTimeString().slice(0, 8),
    };

    const list = getLocalTransactions();
    list.unshift(newTx);
    saveLocalTransactions(list);

    return newTx;
  },

  /**
   * ویرایش / اصلاح تراکنش مالی
   */
  async updateTransaction(id: string, data: {
    amount?: number;
    type?: 'debit' | 'credit' | 'transfer' | 'compound';
    fromAccountId?: string | null;
    toAccountId?: string | null;
    categoryId?: string | null;
    counterpartyId?: string | null;
    description?: string | null;
    tag?: string | null;
    transactionDate?: string;
    shamsiDate?: string | null;
  }): Promise<boolean> {
    try {
      const token = getSyncToken();
      const res = await fetch(`${API_BASE}/transactions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Token': token,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        return true;
      }
    } catch {
      //
    }
    return false;
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
   * پردازش و ثبت پیامک بانکی
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
        return await res.json();
      }
    } catch {
      //
    }

    const parsed = parseBankSms(rawSms);
    if (!parsed.isBankSms || parsed.amount <= 0) {
      return {
        success: false,
        isBankSms: false,
        message: 'پیامک غیربانکی یا فاقد مبلغ تراکنش تشخیص داده شد',
      };
    }

    return {
      success: true,
      isBankSms: true,
      message: 'پیامک پردازش شد',
    };
  },

  /**
   * تبدیل آنی تراکنش بانکی به خرج در گروه دنگ
   */
  async convertToSplit(txId: string, groupId: string, members?: string[]): Promise<boolean> {
    try {
      const token = getSyncToken();
      const res = await fetch(`${API_BASE}/transactions/${txId}/to-split`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Token': token,
        },
        body: JSON.stringify({ groupId, members }),
      });
      if (res.ok) return true;
    } catch {
      //
    }
    return true;
  },

  /**
   * دریافت دسته‌بندی‌ها مستقیماً از دیتابیس
   */
  async getCategories(): Promise<Category[]> {
    try {
      const token = getSyncToken();
      const res = await fetch(`${API_BASE}/categories`, {
        headers: { 'X-Sync-Token': token },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data;
        }
      }
    } catch {
      //
    }
    return [];
  },

  /**
   * دریافت گروه‌های دنگ کاربر از دیتابیس
   */
  async getGroups(): Promise<Group[]> {
    try {
      const token = getSyncToken();
      const res = await fetch(`${API_BASE}/groups`, {
        headers: { 'X-Sync-Token': token },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch {
      //
    }
    return [];
  },

  /**
   * ثبت گروه جدید دنگ
   */
  async createGroup(name: string, members: Array<{ name: string; phone?: string }>): Promise<Group | null> {
    try {
      const token = getSyncToken();
      const res = await fetch(`${API_BASE}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Token': token,
        },
        body: JSON.stringify({ name, members }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {
      //
    }
    return null;
  },

  /**
   * ثبت خرج جدید در گروه دنگ
   */
  async createGroupExpense(groupId: string, data: {
    payerId: string;
    amount: number;
    description: string;
    splitType?: 'equal' | 'percentage';
    splits?: Array<{ userId: string; owedAmount: number }>;
  }): Promise<boolean> {
    try {
      const token = getSyncToken();
      const res = await fetch(`${API_BASE}/groups/${groupId}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Token': token,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) return true;
    } catch {
      //
    }
    return false;
  },

  /**
   * دریافت پیامک‌های در انتظار تایید (SMS Inbox)
   */
  async getPendingSms(): Promise<PendingSms[]> {
    try {
      const token = getSyncToken();
      const res = await fetch(`${API_BASE}/sms/pending`, {
        headers: { 'X-Sync-Token': token },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch {
      //
    }
    return [];
  },

  /**
   * تبدیل یک پیامک در انتظار به تراکنش قطعی حسابداری
   */
  async convertSmsToTransaction(
    smsId: string,
    data: {
      fromAccountId?: string;
      toAccountId?: string;
      amount?: number;
      description?: string;
      transactionDate?: string;
    }
  ): Promise<boolean> {
    try {
      const token = getSyncToken();
      const res = await fetch(`${API_BASE}/sms/${smsId}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Token': token,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        return Boolean(json.success);
      }
    } catch {
      //
    }
    return false;
  },

  /**
   * نادیده گرفتن پیامک صف انتظار
   */
  async ignoreSms(smsId: string): Promise<boolean> {
    try {
      const token = getSyncToken();
      const res = await fetch(`${API_BASE}/sms/${smsId}/ignore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Token': token,
        },
      });
      if (res.ok) {
        const json = await res.json();
        return Boolean(json.success);
      }
    } catch {
      //
    }
    return false;
  },

  /**
   * پاک‌سازی کامل تمام تراکنش‌ها
   */
  async clearAllTransactions(): Promise<void> {
    saveLocalTransactions([]);
  },
};
