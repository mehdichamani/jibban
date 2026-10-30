-- اسکیماهای اولیه پایگاه داده رابطه‌ای جیب‌بان (JibBan D1 Database)

-- ۱. کاربران سیستم
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email_or_phone TEXT UNIQUE,
    sync_token TEXT NOT NULL, -- توکن اتصال اپلیکیشن اندروید به سرور
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ۲. دسته‌بندی‌های دخل و خرج
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    is_income BOOLEAN DEFAULT 0
);

-- ۳. تراکنش‌های بانکی و دستی
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    bank_name TEXT,
    account_number TEXT,
    amount INTEGER NOT NULL, -- همیشه به تومان
    type TEXT CHECK(type IN ('debit', 'credit')),
    balance INTEGER,
    category_id TEXT,
    description TEXT,
    raw_sms TEXT,
    transaction_date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(category_id) REFERENCES categories(id)
);

-- ۴. گروه‌های دنگ
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    currency TEXT DEFAULT 'IRT',
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id)
);

-- ۵. اعضای گروه
CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(group_id, user_id),
    FOREIGN KEY(group_id) REFERENCES groups(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- ۶. هزینه‌های ثبت‌شده در گروه دنگ
CREATE TABLE IF NOT EXISTS group_expenses (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    payer_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT NOT NULL,
    linked_transaction_id TEXT, -- لینک اختیاری به تراکنش پیامک بانکی
    expense_date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(group_id) REFERENCES groups(id),
    FOREIGN KEY(payer_id) REFERENCES users(id),
    FOREIGN KEY(linked_transaction_id) REFERENCES transactions(id)
);

-- ۷. سهم و تسهیم بدهی هر عضو از هر هزینه
CREATE TABLE IF NOT EXISTS expense_splits (
    expense_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    owed_amount INTEGER NOT NULL,
    PRIMARY KEY(expense_id, user_id),
    FOREIGN KEY(expense_id) REFERENCES group_expenses(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- ۸. تسویه‌حساب‌ها (Settlements)
CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    settled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(group_id) REFERENCES groups(id),
    FOREIGN KEY(from_user_id) REFERENCES users(id),
    FOREIGN KEY(to_user_id) REFERENCES users(id)
);
