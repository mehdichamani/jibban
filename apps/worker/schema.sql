-- اسکیماهای پایگاه داده رابطه‌ای جیب‌بان (JibBan D1 Database)
-- پشتیبانی کامل از سیستم حسابداری شخصی، حساب‌های مبدا و مقصد، مدیریت دنگ و پیامک‌های بانکی

-- ۱. کاربران سیستم
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email_or_phone TEXT UNIQUE,
    sync_token TEXT NOT NULL, -- توکن اتصال اپلیکیشن اندروید به سرور
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ۲. حساب‌های مالی (مبدا، مقصد، بانکی، نقدی، پس‌انداز و طرف‌حساب‌ها)
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,                -- مثلاً: 'بلو بانک', 'بانک ملی - جاری', 'کیف پول نقدی', 'صاحبخانه', 'هایپرمارکت'
    type TEXT CHECK(type IN ('bank', 'wallet', 'savings', 'credit', 'counterparty')) DEFAULT 'bank',
    bank_name TEXT,                    -- مثلاً: 'بلو', 'ملی', 'سامان', 'ملت', 'پاسارگاد'
    account_number TEXT,               -- ۴ رقم آخر کارت یا شماره حساب
    card_number TEXT,                  -- شماره کامل یا بخشی از شماره کارت
    color TEXT DEFAULT '#0284c7',      -- رنگ شاخص حساب برای نمایش در کارت‌ها
    icon TEXT DEFAULT 'landmark',      -- نام آیکون
    balance INTEGER DEFAULT 0,         -- مانده فعلی حساب (همیشه به تومان)
    initial_balance INTEGER DEFAULT 0, -- مانده اولیه حساب در زمان تعریف
    is_source BOOLEAN DEFAULT 1,       -- آیا به عنوان حساب مبدأ قابل استفاده است
    is_destination BOOLEAN DEFAULT 1,  -- آیا به عنوان حساب مقصد قابل استفاده است
    is_archived BOOLEAN DEFAULT 0,     -- بایگانی شده
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

-- ۳. دسته‌بندی‌های تراکنش‌ها (هزینه، درآمد، انتقال)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    type TEXT CHECK(type IN ('expense', 'income', 'transfer')) DEFAULT 'expense',
    is_income BOOLEAN DEFAULT 0
);

-- ۴. پیامک‌های خام دریافتی با شناسه هش یکتا (Raw SMS Archive & Deduplication)
CREATE TABLE IF NOT EXISTS raw_sms (
    id TEXT PRIMARY KEY, -- برابر با sms_hash
    sms_hash TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    sender TEXT,
    raw_text TEXT NOT NULL,
    status TEXT CHECK(status IN ('processed', 'ignored', 'deleted', 'manual')) DEFAULT 'processed',
    transaction_id TEXT, -- لینک به تراکنش متناظر در صورت وجود
    received_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_raw_sms_hash ON raw_sms(sms_hash);
CREATE INDEX IF NOT EXISTS idx_raw_sms_user ON raw_sms(user_id);

-- ۵. تراکنش‌های حسابداری، بانکی و دستی
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    from_account_id TEXT,              -- حساب مبدأ (Source Account)
    to_account_id TEXT,                -- حساب مقصد (Destination Account)
    bank_name TEXT,
    account_number TEXT,
    amount INTEGER NOT NULL,           -- همیشه به تومان
    type TEXT CHECK(type IN ('debit', 'credit', 'transfer')) NOT NULL, -- برداشت (هزینه)، واریز (درآمد)، انتقال (بین‌حسابی)
    balance INTEGER,                   -- مانده حساب مبدا پس از تراکنش
    category_id TEXT,
    description TEXT,
    tracking_code TEXT,                -- کد رهگیری / شماره پیگیری تراکنش
    raw_sms TEXT,
    sms_hash TEXT,                     -- لینک به شناسه یکتای پیامک خام
    transaction_date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(from_account_id) REFERENCES accounts(id),
    FOREIGN KEY(to_account_id) REFERENCES accounts(id),
    FOREIGN KEY(category_id) REFERENCES categories(id)
);
CREATE INDEX IF NOT EXISTS idx_transactions_from_acc ON transactions(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_acc ON transactions(to_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sms_hash ON transactions(sms_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);

-- ۶. گروه‌های دنگ (Splitwise Groups)
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    currency TEXT DEFAULT 'IRT',
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id)
);

-- ۷. اعضای گروه دنگ
CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(group_id, user_id),
    FOREIGN KEY(group_id) REFERENCES groups(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- ۸. هزینه‌های ثبت‌شده در گروه دنگ
CREATE TABLE IF NOT EXISTS group_expenses (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    payer_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT NOT NULL,
    linked_transaction_id TEXT, -- لینک اختیاری به تراکنش پیامک بانکی یا حسابداری
    expense_date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(group_id) REFERENCES groups(id),
    FOREIGN KEY(payer_id) REFERENCES users(id),
    FOREIGN KEY(linked_transaction_id) REFERENCES transactions(id)
);

-- ۹. سهم و تسهیم بدهی هر عضو از هر هزینه
CREATE TABLE IF NOT EXISTS expense_splits (
    expense_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    owed_amount INTEGER NOT NULL,
    PRIMARY KEY(expense_id, user_id),
    FOREIGN KEY(expense_id) REFERENCES group_expenses(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- ۱۰. تسویه‌حساب‌های دنگ (Settlements)
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
