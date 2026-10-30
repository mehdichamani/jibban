export const DEFAULT_CATEGORIES = [
  // هزینه‌ها
  { id: 'cat_supermarket', name: 'سوپرمارکت و خوراکی', icon: '🛒', color: '#10b981', type: 'expense', is_income: 0 },
  { id: 'cat_restaurant', name: 'کافه و رستوران', icon: '🍔', color: '#f59e0b', type: 'expense', is_income: 0 },
  { id: 'cat_transport', name: 'حمل و نقل و بنزین', icon: '🚕', color: '#3b82f6', type: 'expense', is_income: 0 },
  { id: 'cat_bills', name: 'قبوض و خدمات', icon: '⚡', color: '#ef4444', type: 'expense', is_income: 0 },
  { id: 'cat_shopping', name: 'خرید و پوشاک', icon: '🛍️', color: '#ec4899', type: 'expense', is_income: 0 },
  { id: 'cat_housing', name: 'اجاره و مسکن', icon: '🏠', color: '#8b5cf6', type: 'expense', is_income: 0 },
  { id: 'cat_health', name: 'پزشکی و سلامت', icon: '💊', color: '#06b6d4', type: 'expense', is_income: 0 },
  { id: 'cat_installment', name: 'قسط و وام بانکی', icon: '💳', color: '#f97316', type: 'expense', is_income: 0 },
  { id: 'cat_education', name: 'آموزش و یادگیری', icon: '📚', color: '#6366f1', type: 'expense', is_income: 0 },
  { id: 'cat_entertainment', name: 'سفر و سرگرمی', icon: '✈️', color: '#14b8a6', type: 'expense', is_income: 0 },
  { id: 'cat_other', name: 'متفرقه', icon: '📦', color: '#94a3b8', type: 'expense', is_income: 0 },

  // درآمدها
  { id: 'cat_salary', name: 'حقوق و دستمزد', icon: '💰', color: '#22c55e', type: 'income', is_income: 1 },
  { id: 'cat_investment', name: 'سود سپرده و سرمایه‌گذاری', icon: '📈', color: '#10b981', type: 'income', is_income: 1 },
  { id: 'cat_freelance', name: 'پاداش و فریلنسری', icon: '💻', color: '#3b82f6', type: 'income', is_income: 1 },
  { id: 'cat_debt_return', name: 'دریافت طلب و بازپرداخت', icon: '🤝', color: '#8b5cf6', type: 'income', is_income: 1 },
  { id: 'cat_income_other', name: 'سایر درآمدها', icon: '💵', color: '#84cc16', type: 'income', is_income: 1 },

  // انتقال بین حساب‌ها
  { id: 'cat_transfer', name: 'انتقال بین حساب‌ها', icon: '🔄', color: '#64748b', type: 'transfer', is_income: 0 },
  { id: 'cat_cash_out', name: 'برداشت وجه نقد', icon: '🏧', color: '#64748b', type: 'transfer', is_income: 0 },
];

export const DEFAULT_ACCOUNTS = [
  {
    id: 'acc_blu',
    name: 'بلو بانک',
    type: 'bank',
    bank_name: 'بلو',
    account_number: '6219',
    card_number: '62198610****1234',
    color: '#ef4444',
    icon: 'credit-card',
    balance: 4250000,
    initial_balance: 4250000,
    is_source: 1,
    is_destination: 1,
  },
  {
    id: 'acc_melli',
    name: 'بانک ملی - جاری',
    type: 'bank',
    bank_name: 'ملی',
    account_number: '6037',
    card_number: '60379971****5678',
    color: '#3b82f6',
    icon: 'landmark',
    balance: 12800000,
    initial_balance: 12800000,
    is_source: 1,
    is_destination: 1,
  },
  {
    id: 'acc_saman',
    name: 'بانک سامان',
    type: 'bank',
    bank_name: 'سامان',
    account_number: '8620',
    card_number: '62198619****8620',
    color: '#06b6d4',
    icon: 'credit-card',
    balance: 3100000,
    initial_balance: 3100000,
    is_source: 1,
    is_destination: 1,
  },
  {
    id: 'acc_wallet',
    name: 'کیف پول نقد',
    type: 'wallet',
    bank_name: 'نقدی',
    account_number: 'CASH',
    card_number: '',
    color: '#10b981',
    icon: 'wallet',
    balance: 650000,
    initial_balance: 650000,
    is_source: 1,
    is_destination: 1,
  },
  {
    id: 'acc_savings',
    name: 'صندوق پس‌انداز مسکن',
    type: 'savings',
    bank_name: 'صندوق',
    account_number: 'SAVE',
    card_number: '',
    color: '#8b5cf6',
    icon: 'piggy-bank',
    balance: 25000000,
    initial_balance: 25000000,
    is_source: 1,
    is_destination: 1,
  },
  {
    id: 'acc_landlord',
    name: 'صاحبخانه (اجاره مسکن)',
    type: 'counterparty',
    bank_name: 'پاسارگاد',
    account_number: '5022',
    card_number: '50222910****4321',
    color: '#f59e0b',
    icon: 'home',
    balance: 0,
    initial_balance: 0,
    is_source: 0,
    is_destination: 1,
  },
  {
    id: 'acc_employer',
    name: 'کارفرما (حقوق شرکت)',
    type: 'counterparty',
    bank_name: 'ملت',
    account_number: '6104',
    card_number: '61043378****9988',
    color: '#22c55e',
    icon: 'briefcase',
    balance: 0,
    initial_balance: 0,
    is_source: 1,
    is_destination: 0,
  },
];

/**
 * مقداردهی اولیه دسته‌بندی‌ها، حساب‌ها و کاربر دمو در دیتابیس در صورت خالی بودن
 */
export async function ensureInitialSeed(db: D1Database): Promise<void> {
  // ۱. بررسی و ثبت دسته‌بندی‌های پیش‌فرض
  const { count: catCount } = (await db.prepare('SELECT COUNT(*) as count FROM categories').first<{ count: number }>()) ?? { count: 0 };
  if (catCount === 0) {
    const statements = DEFAULT_CATEGORIES.map((cat) =>
      db
        .prepare('INSERT OR IGNORE INTO categories (id, name, icon, color, type, is_income) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(cat.id, cat.name, cat.icon, cat.color, cat.type, cat.is_income)
    );
    await db.batch(statements);
  }

  // ۲. بررسی وجود کاربر اصلی/دمو (جهت اتصال سریع اپ اندروید و وب)
  const userCount = (await db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>()) ?? { count: 0 };
  const defaultUserId = 'user_default';
  const defaultSyncToken = 'jibban_sync_demo_token_12345';

  if (userCount.count === 0) {
    await db
      .prepare('INSERT OR IGNORE INTO users (id, name, email_or_phone, sync_token) VALUES (?, ?, ?, ?)')
      .bind(defaultUserId, 'کاربر اصلی جیب‌بان', 'user@jibban.local', defaultSyncToken)
      .run();

    // ایجاد یک گروه دنگ نمونه برای تست
    const defaultGroupId = 'grp_home';
    await db
      .prepare('INSERT OR IGNORE INTO groups (id, name, currency, created_by) VALUES (?, ?, ?, ?)')
      .bind(defaultGroupId, 'خرج‌های مشترک خانه', 'IRT', defaultUserId)
      .run();

    await db
      .prepare('INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)')
      .bind(defaultGroupId, defaultUserId, 'admin')
      .run();
  }

  // ۳. بررسی و ثبت حساب‌های پیش‌فرض
  const { count: accCount } = (await db.prepare('SELECT COUNT(*) as count FROM accounts WHERE user_id = ?').bind(defaultUserId).first<{ count: number }>()) ?? { count: 0 };
  if (accCount === 0) {
    const accStatements = DEFAULT_ACCOUNTS.map((acc) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO accounts (
            id, user_id, name, type, bank_name, account_number, card_number,
            color, icon, balance, initial_balance, is_source, is_destination
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          acc.id,
          defaultUserId,
          acc.name,
          acc.type,
          acc.bank_name,
          acc.account_number,
          acc.card_number,
          acc.color,
          acc.icon,
          acc.balance,
          acc.initial_balance,
          acc.is_source,
          acc.is_destination
        )
    );
    await db.batch(accStatements);
  }
}
