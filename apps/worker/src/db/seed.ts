import { Account, Category } from '../types.js';

export const DEFAULT_CATEGORIES: Array<{
  id: string;
  name: string;
  type: 'expense' | 'income';
  parent_id: string | null;
  icon: string;
  color: string;
}> = [
  // دسته‌های اصلی هزینه
  { id: 'cat_food', name: 'خوراک و مواد غذایی', type: 'expense', parent_id: null, icon: 'utensils', color: '#f59e0b' },
  { id: 'cat_housing', name: 'مسکن، اجاره و قبوض', type: 'expense', parent_id: null, icon: 'home', color: '#8b5cf6' },
  { id: 'cat_transport', name: 'حمل و نقل و خودرو', type: 'expense', parent_id: null, icon: 'car', color: '#3b82f6' },
  { id: 'cat_health', name: 'پزشکی، دارو و سلامت', type: 'expense', parent_id: null, icon: 'heart-pulse', color: '#ef4444' },
  { id: 'cat_shopping', name: 'خرید و پوشاک', type: 'expense', parent_id: null, icon: 'shopping-bag', color: '#ec4899' },
  { id: 'cat_finance', name: 'تسهیلات و وام', type: 'expense', parent_id: null, icon: 'credit-card', color: '#f97316' },
  { id: 'cat_other_exp', name: 'سایر هزینه‌ها', type: 'expense', parent_id: null, icon: 'archive', color: '#64748b' },

  // زیرمجموعه‌های هزینه
  { id: 'cat_supermarket', name: 'سوپرمارکت و میوه', type: 'expense', parent_id: 'cat_food', icon: 'shopping-cart', color: '#f59e0b' },
  { id: 'cat_restaurant', name: 'رستوران و کافه', type: 'expense', parent_id: 'cat_food', icon: 'coffee', color: '#f59e0b' },
  { id: 'cat_rent', name: 'اجاره‌بها', type: 'expense', parent_id: 'cat_housing', icon: 'key', color: '#8b5cf6' },
  { id: 'cat_bills', name: 'قبوض خدماتی', type: 'expense', parent_id: 'cat_housing', icon: 'zap', color: '#8b5cf6' },
  { id: 'cat_fuel', name: 'بنزین و سوخت', type: 'expense', parent_id: 'cat_transport', icon: 'fuel', color: '#3b82f6' },
  { id: 'cat_taxi', name: 'تاکسی و اسنپ', type: 'expense', parent_id: 'cat_transport', icon: 'navigation', color: '#3b82f6' },

  // دسته‌های درآمد
  { id: 'cat_salary', name: 'حقوق و دستمزد', type: 'income', parent_id: null, icon: 'briefcase', color: '#22c55e' },
  { id: 'cat_investment', name: 'سرمایه‌گذاری و سود', type: 'income', parent_id: null, icon: 'trending-up', color: '#10b981' },
  { id: 'cat_other_inc', name: 'سایر درآمدها', type: 'income', parent_id: null, icon: 'plus-circle', color: '#84cc16' },
];

export const DEFAULT_ACCOUNTS = [
  {
    id: 'acc_cash_wallet',
    name: 'کیف پول نقدی',
    type: 'wallet' as const,
    bank_name: 'نقدی',
    account_number: 'CASH',
    card_number: '',
    sheba: '',
    balance: 0,
    initial_balance: 0,
    color: '#10b981',
    icon: 'wallet',
  },
  {
    id: 'acc_default_bank',
    name: 'حساب بانکی اصلی',
    type: 'bank' as const,
    bank_name: 'بانک',
    account_number: '',
    card_number: '',
    sheba: '',
    balance: 0,
    initial_balance: 0,
    color: '#0284c7',
    icon: 'landmark',
  },
];

/**
 * مقداردهی اولیه پایگاه داده برای کارکرد روان با دیتابیس سفید (Cold Start)
 */
export async function ensureInitialSeed(db: D1Database): Promise<void> {
  const defaultUserId = 'user_default';
  const defaultSyncToken = 'jibban_sync_demo_token_12345';

  // ۱. بررسی کاربر پیش‌فرض
  const user = await db
    .prepare('SELECT id FROM users WHERE id = ?')
    .bind(defaultUserId)
    .first<{ id: string }>();

  if (!user) {
    await db
      .prepare('INSERT OR IGNORE INTO users (id, name, email_or_phone, sync_token) VALUES (?, ?, ?, ?)')
      .bind(defaultUserId, 'کاربر اصلی جیب‌بان', 'user@jibban.local', defaultSyncToken)
      .run();
  }

  // ۲. بررسی دسته‌بندی‌ها
  const catCountResult = await db
    .prepare('SELECT COUNT(*) as count FROM categories WHERE user_id = ? OR user_id IS NULL')
    .bind(defaultUserId)
    .first<{ count: number }>();

  if (!catCountResult || catCountResult.count === 0) {
    const catStatements = DEFAULT_CATEGORIES.map((cat) =>
      db
        .prepare('INSERT OR IGNORE INTO categories (id, user_id, parent_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(cat.id, defaultUserId, cat.parent_id, cat.name, cat.type, cat.icon, cat.color)
    );
    await db.batch(catStatements);
  }

  // ۳. بررسی حساب‌ها
  const accCountResult = await db
    .prepare('SELECT COUNT(*) as count FROM accounts WHERE user_id = ?')
    .bind(defaultUserId)
    .first<{ count: number }>();

  if (!accCountResult || accCountResult.count === 0) {
    const accStatements = DEFAULT_ACCOUNTS.map((acc) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO accounts (
            id, user_id, name, type, bank_name, account_number, card_number, sheba,
            balance, initial_balance, color, icon
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          acc.id,
          defaultUserId,
          acc.name,
          acc.type,
          acc.bank_name,
          acc.account_number,
          acc.card_number,
          acc.sheba,
          acc.balance,
          acc.initial_balance,
          acc.color,
          acc.icon
        )
    );
    await db.batch(accStatements);
  }
}
