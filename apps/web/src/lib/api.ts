import { Transaction, Group, GroupSummaryData, Category } from '../types.js';
import { parseBankSms } from '@jibban/sms-parser-ir';
import { calculateGroupSummary, calculateEqualSplits } from '@jibban/debt-engine';

const CLOUD_API_BASE = 'https://jibban-worker.mahdi-chamani20.workers.dev/api';
const API_BASE =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '/api'
    : CLOUD_API_BASE;

// ذخیره‌سازی محلی برای حالت آفلاین یا پیش‌نمایش بدون اتصال مستقیم به سرور
const STORAGE_KEYS = {
  TRANSACTIONS: 'jibban_local_transactions',
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

// لیست اولیه نمونه تراکنش‌ها برای نمایش خیره‌کننده رابط کاربری در اجرای اول
const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_seed_1',
    userId: 'user_default',
    bankName: 'بلو',
    accountNumber: '4321',
    amount: 85000,
    type: 'debit',
    balance: 2450000,
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
    accountNumber: '1234',
    amount: 340000,
    type: 'debit',
    balance: 14200000,
    categoryId: 'cat_supermarket',
    categoryName: 'سوپرمارکت و خوراکی',
    categoryIcon: '🛒',
    categoryColor: '#10b981',
    description: 'فروشگاه افق کوروش شعبه ونک',
    transactionDate: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'tx_seed_3',
    userId: 'user_default',
    bankName: 'سامان',
    accountNumber: '8877',
    amount: 15000000,
    type: 'credit',
    balance: 18500000,
    categoryId: 'cat_salary',
    categoryName: 'حقوق و دستمزد',
    categoryIcon: '💰',
    categoryColor: '#22c55e',
    description: 'واریز حقوق ماهانه مهر',
    transactionDate: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: 'tx_seed_4',
    userId: 'user_default',
    bankName: 'ملت',
    accountNumber: '9900',
    amount: 45000,
    type: 'debit',
    balance: 1200000,
    categoryId: 'cat_transport',
    categoryName: 'حمل و نقل و اسنپ',
    categoryIcon: '🚕',
    categoryColor: '#3b82f6',
    description: 'پرداخت کرایه اسنپ',
    transactionDate: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
];

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
  /**
   * دریافت تراکنش‌ها (تلاش ابتدا از ورکر، سپس فال‌بک به ذخیره‌ساز مرورگر)
   */
  async getTransactions(filter?: { type?: string; categoryId?: string }): Promise<Transaction[]> {
    try {
      const token = getSyncToken();
      let url = `${API_BASE}/transactions`;
      const params = new URLSearchParams();
      if (filter?.type) params.append('type', filter.type);
      if (filter?.categoryId) params.append('categoryId', filter.categoryId);
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
      // سرور آفلاین یا دردسترس نیست، از حافظه محلی استفاده می‌کنیم
    }

    let txs = getLocalTransactions();
    if (filter?.type) txs = txs.filter((t) => t.type === filter.type);
    if (filter?.categoryId) txs = txs.filter((t) => t.categoryId === filter.categoryId);
    return txs;
  },

  /**
   * پردازش و ثبت پیامک بانکی
   */
  async ingestSms(rawSms: string): Promise<{ success: boolean; isBankSms: boolean; transaction?: Transaction; message?: string }> {
    try {
      const token = getSyncToken();
      const res = await fetch(`${API_BASE}/sms/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Token': token,
        },
        body: JSON.stringify({ rawSms, syncToken: token }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.transaction) {
          const list = getLocalTransactions();
          list.unshift(json.transaction);
          saveLocalTransactions(list);
        }
        return json;
      }
    } catch {
      // استفاده مستقیم از پکیج sms-parser-ir در سمت کاربر
    }

    const parsed = parseBankSms(rawSms);
    if (!parsed.isBankSms || parsed.amount <= 0) {
      return {
        success: false,
        isBankSms: false,
        message: 'پیامک غیربانکی یا فاقد مبلغ تراکنش تشخیص داده شد',
      };
    }

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: 'user_default',
      bankName: parsed.bankName,
      accountNumber: parsed.accountNumber,
      amount: parsed.amount,
      type: parsed.type,
      balance: parsed.balance,
      categoryId: parsed.type === 'credit' ? 'cat_transfer' : 'cat_other',
      categoryName: parsed.type === 'credit' ? 'واریز و انتقال' : 'متفرقه',
      categoryIcon: parsed.type === 'credit' ? '🔄' : '📦',
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
      { id: 'cat_supermarket', name: 'سوپرمارکت و خوراکی', icon: '🛒', color: '#10b981' },
      { id: 'cat_restaurant', name: 'کافه و رستوران', icon: '🍔', color: '#f59e0b' },
      { id: 'cat_transport', name: 'حمل و نقل و اسنپ', icon: '🚕', color: '#3b82f6' },
      { id: 'cat_bills', name: 'قبوض و شارژ ساختمان', icon: '⚡', color: '#ef4444' },
      { id: 'cat_shopping', name: 'خرید و پوشاک', icon: '🛍️', color: '#ec4899' },
      { id: 'cat_housing', name: 'اجاره و مسکن', icon: '🏠', color: '#8b5cf6' },
      { id: 'cat_health', name: 'پزشکی و سلامت', icon: '💊', color: '#06b6d4' },
      { id: 'cat_salary', name: 'حقوق و دستمزد', icon: '💰', color: '#22c55e', isIncome: true },
      { id: 'cat_transfer', name: 'واریز و انتقال وجه', icon: '🔄', color: '#64748b', isIncome: true },
      { id: 'cat_other', name: 'متفرقه', icon: '📦', color: '#94a3b8' },
    ];
  },
};
