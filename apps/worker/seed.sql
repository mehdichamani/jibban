-- داده‌های پایه و سرفصل‌های استاندارد جیب‌بان ۲.۰ (Starter Seed)
-- قابل استفاده برای راه‌اندازی اولیه اختیاری یا استقرار توسط کاربران در گیت‌هاب

-- ۱. کاربر پیش‌فرض سیستم
INSERT OR IGNORE INTO users (id, name, email_or_phone, sync_token)
VALUES ('user_default', 'کاربر جیب‌بان', 'user@jibban.local', 'jibban_sync_demo_token_12345');

-- ۲. حساب‌های پیش‌فرض پایه (مبالغ به ریال)
INSERT OR IGNORE INTO accounts (id, user_id, name, type, bank_name, account_number, card_number, balance, initial_balance, color, icon)
VALUES 
    ('acc_cash_wallet', 'user_default', 'کیف پول نقدی', 'wallet', 'نقدی', 'CASH', '', 0, 0, '#10b981', 'wallet'),
    ('acc_default_bank', 'user_default', 'حساب بانکی اصلی', 'bank', 'بانک', '', '', 0, 0, '#0284c7', 'landmark');

-- ۳. سرفصل‌های درختی درآمد و هزینه (کل و معین)
-- دسته‌های کل هزینه (Root Expense Categories)
INSERT OR IGNORE INTO categories (id, user_id, parent_id, name, type, icon, color)
VALUES
    ('cat_food', 'user_default', NULL, 'خوراک و مواد غذایی', 'expense', 'utensils', '#f59e0b'),
    ('cat_housing', 'user_default', NULL, 'مسکن، اجاره و قبوض', 'expense', 'home', '#8b5cf6'),
    ('cat_transport', 'user_default', NULL, 'حمل و نقل و خودرو', 'expense', 'car', '#3b82f6'),
    ('cat_health', 'user_default', NULL, 'پزشکی، دارو و سلامت', 'expense', 'heart-pulse', '#ef4444'),
    ('cat_shopping', 'user_default', NULL, 'خرید، پوشاک و ابزار', 'expense', 'shopping-bag', '#ec4899'),
    ('cat_finance', 'user_default', NULL, 'تسهیلات، وام و اقساط', 'expense', 'credit-card', '#f97316'),
    ('cat_other_exp', 'user_default', NULL, 'سایر هزینه‌ها', 'expense', 'archive', '#64748b');

-- دسته‌های معین هزینه (Sub-categories)
INSERT OR IGNORE INTO categories (id, user_id, parent_id, name, type, icon, color)
VALUES
    ('cat_supermarket', 'user_default', 'cat_food', 'سوپرمارکت و میوه', 'expense', 'shopping-cart', '#f59e0b'),
    ('cat_restaurant', 'user_default', 'cat_food', 'رستوران و کافه', 'expense', 'coffee', '#f59e0b'),
    ('cat_rent', 'user_default', 'cat_housing', 'اجاره‌بها', 'expense', 'key', '#8b5cf6'),
    ('cat_bills', 'user_default', 'cat_housing', 'قبوض آب، برق، گاز و شارژ', 'expense', 'zap', '#8b5cf6'),
    ('cat_fuel', 'user_default', 'cat_transport', 'بنزین و سوخت', 'expense', 'fuel', '#3b82f6'),
    ('cat_taxi', 'user_default', 'cat_transport', 'اسنپ و تاکسی', 'expense', 'navigation', '#3b82f6'),
    ('cat_doctor', 'user_default', 'cat_health', 'ویزیت و درمان', 'expense', 'activity', '#ef4444'),
    ('cat_pharmacy', 'user_default', 'cat_health', 'داروخانه', 'expense', 'shield', '#ef4444'),
    ('cat_loan_pay', 'user_default', 'cat_finance', 'بازپرداخت قسط وام', 'expense', 'calendar-check', '#f97316');

-- دسته‌های کل درآمد (Root Income Categories)
INSERT OR IGNORE INTO categories (id, user_id, parent_id, name, type, icon, color)
VALUES
    ('cat_salary', 'user_default', NULL, 'حقوق و پاداش شغلی', 'income', 'briefcase', '#22c55e'),
    ('cat_investment', 'user_default', NULL, 'سود بانکی و سرمایه‌گذاری', 'income', 'trending-up', '#10b981'),
    ('cat_debt_return', 'user_default', NULL, 'وصول طلب و بازگشت پول', 'income', 'handshake', '#06b6d4'),
    ('cat_other_inc', 'user_default', NULL, 'سایر درآمدها', 'income', 'plus-circle', '#84cc16');
