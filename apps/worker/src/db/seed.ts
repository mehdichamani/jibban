import { Bindings } from '../types.js';

export const DEFAULT_CATEGORIES = [
  { id: 'cat_supermarket', name: 'سوپرمارکت و خوراکی', icon: '🛒', color: '#10b981', is_income: 0 },
  { id: 'cat_restaurant', name: 'کافه و رستوران', icon: '🍔', color: '#f59e0b', is_income: 0 },
  { id: 'cat_transport', name: 'حمل و نقل و اسنپ', icon: '🚕', color: '#3b82f6', is_income: 0 },
  { id: 'cat_bills', name: 'قبوض و شارژ ساختمان', icon: '⚡', color: '#ef4444', is_income: 0 },
  { id: 'cat_shopping', name: 'خرید و پوشاک', icon: '🛍️', color: '#ec4899', is_income: 0 },
  { id: 'cat_housing', name: 'اجاره و مسکن', icon: '🏠', color: '#8b5cf6', is_income: 0 },
  { id: 'cat_health', name: 'پزشکی و سلامت', icon: '💊', color: '#06b6d4', is_income: 0 },
  { id: 'cat_salary', name: 'حقوق و دستمزد', icon: '💰', color: '#22c55e', is_income: 1 },
  { id: 'cat_transfer', name: 'واریز و انتقال وجه', icon: '🔄', color: '#64748b', is_income: 1 },
  { id: 'cat_other', name: 'متفرقه', icon: '📦', color: '#94a3b8', is_income: 0 },
];

/**
 * مقداردهی اولیه دسته‌بندی‌ها و کاربر دمو در دیتابیس در صورت خالی بودن
 */
export async function ensureInitialSeed(db: D1Database): Promise<void> {
  // ۱. بررسی و ثبت دسته‌بندی‌های پیش‌فرض
  const { count } = (await db.prepare('SELECT COUNT(*) as count FROM categories').first<{ count: number }>()) ?? { count: 0 };
  if (count === 0) {
    const statements = DEFAULT_CATEGORIES.map((cat) =>
      db
        .prepare('INSERT OR IGNORE INTO categories (id, name, icon, color, is_income) VALUES (?, ?, ?, ?, ?)')
        .bind(cat.id, cat.name, cat.icon, cat.color, cat.is_income)
    );
    await db.batch(statements);
  }

  // ۲. بررسی وجود کاربر اصلی/دمو (جهت اتصال سریع اپ اندروید و وب)
  const userCount = (await db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>()) ?? { count: 0 };
  if (userCount.count === 0) {
    const defaultUserId = 'user_default';
    const defaultSyncToken = 'jibban_sync_demo_token_12345';
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
}
