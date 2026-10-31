-- اسکیماهای رسمی پایگاه داده رابطه‌ای جیب‌بان (JibBan D1 Database 2.0)
-- معماری بر پایه دقت محاسباتی ریال، ساختار درختی و سیستم دنگ یکپارچه

-- ۱. کاربران سیستم
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email_or_phone TEXT UNIQUE,
    sync_token TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ۲. حساب‌های دارایی، نقد و بانک (Asset & Bank Accounts)
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,                -- مثلاً: تجارت، بلوبانک، کیف پول نقد
    type TEXT CHECK(type IN ('bank', 'wallet', 'savings', 'credit', 'debt')) DEFAULT 'bank',
    bank_name TEXT,                    -- نام بانک (تجارت، سامان، ملی، بلو، ویپاد و...)
    account_number TEXT,               -- شماره حساب
    card_number TEXT,                  -- شماره کارت ۱۶ رقمی یا ۴ رقم آخر
    sheba TEXT,                        -- شماره شبا
    balance INTEGER DEFAULT 0,         -- مانده فعلی (همیشه به ریال)
    initial_balance INTEGER DEFAULT 0, -- مانده اولیه به ریال
    color TEXT DEFAULT '#0284c7',
    icon TEXT DEFAULT 'landmark',
    is_archived BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

-- ۳. دسته‌بندی‌های درختی درآمد و هزینه (Hierarchical Categories)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    user_id TEXT,                      -- تهی برای دسته‌بندی‌های سیستمی و پایه
    parent_id TEXT,                    -- کلید والد برای ساختار درختی (کل / معین / تفصیلی)
    name TEXT NOT NULL,                -- نام دسته‌بندی
    type TEXT CHECK(type IN ('expense', 'income')) NOT NULL,
    icon TEXT,
    color TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(parent_id) REFERENCES categories(id)
);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);

-- ۴. اشخاص و طرف‌حساب‌ها (Counterparties - متصل به سیستم دنگ)
CREATE TABLE IF NOT EXISTS counterparties (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    balance INTEGER DEFAULT 0,         -- میزان طلب (مثبت) یا بدهی (منفی) به ریال
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_counterparties_user ON counterparties(user_id);

-- ۵. پیامک‌های خام بانکی (Raw SMS Archive)
CREATE TABLE IF NOT EXISTS raw_sms (
    id TEXT PRIMARY KEY,               -- شناسه یکتا یا هش پیامک
    sms_hash TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    sender TEXT,
    raw_text TEXT NOT NULL,
    bank_name TEXT,
    parsed_amount INTEGER,             -- مبلغ استخراج شده به ریال
    parsed_account TEXT,
    status TEXT CHECK(status IN ('processed', 'ignored', 'manual')) DEFAULT 'processed',
    transaction_id TEXT,
    received_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_raw_sms_hash ON raw_sms(sms_hash);
CREATE INDEX IF NOT EXISTS idx_raw_sms_user ON raw_sms(user_id);

-- ۶. تراکنش‌های مالی جامع (Transactions)
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT CHECK(type IN ('debit', 'credit', 'transfer')) NOT NULL, -- برداشت (هزینه)، واریز (درآمد)، انتقال بین‌بانکی
    amount INTEGER NOT NULL,           -- همیشه به ریال
    from_account_id TEXT,              -- حساب پرداخت‌کننده (مبدا)
    to_account_id TEXT,                -- حساب دریافت‌کننده (مقصد)
    category_id TEXT,                  -- سرفصل هزینه یا درآمد
    counterparty_id TEXT,              -- شخص مرتبط
    description TEXT,                  -- شرح و بابت
    tag TEXT,                          -- برچسب (مثلاً: دنگ، سفر، خرید خانه)
    raw_sms_id TEXT,                   -- ارجاع به پیامک متناظر
    transaction_date DATETIME NOT NULL,-- تاریخ و ساعت استاندارد UTC
    shamsi_date TEXT,                  -- تاریخ شمسی رشته‌ای (مثلاً: 1405/08/07)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(from_account_id) REFERENCES accounts(id),
    FOREIGN KEY(to_account_id) REFERENCES accounts(id),
    FOREIGN KEY(category_id) REFERENCES categories(id),
    FOREIGN KEY(counterparty_id) REFERENCES counterparties(id),
    FOREIGN KEY(raw_sms_id) REFERENCES raw_sms(id)
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_from_acc ON transactions(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_acc ON transactions(to_account_id);

-- ۷. وام‌ها و تسهیلات (Loans & Borrowings)
CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,               -- مثلاً: پشتوانه ویپاد، وام ازکی‌وام
    account_id TEXT,                   -- حسابی که اقساط از آن کسر می‌شود
    total_amount INTEGER NOT NULL,     -- مبلغ اصل وام به ریال
    total_profit INTEGER DEFAULT 0,    -- مبلغ سود به ریال
    installment_amount INTEGER NOT NULL, -- مبلغ هر قسط به ریال
    total_installments INTEGER NOT NULL, -- تعداد اقساط
    paid_installments INTEGER DEFAULT 0, -- تعداد اقساط پرداخت شده
    start_date DATETIME NOT NULL,
    status TEXT CHECK(status IN ('active', 'completed', 'overdue')) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(account_id) REFERENCES accounts(id)
);
CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);

-- ۸. ریز اقساط وام‌ها (Loan Installments)
CREATE TABLE IF NOT EXISTS loan_installments (
    id TEXT PRIMARY KEY,
    loan_id TEXT NOT NULL,
    installment_number INTEGER NOT NULL,
    amount INTEGER NOT NULL,           -- به ریال
    due_date DATETIME NOT NULL,
    paid_date DATETIME,
    is_paid BOOLEAN DEFAULT 0,
    linked_transaction_id TEXT,
    FOREIGN KEY(loan_id) REFERENCES loans(id),
    FOREIGN KEY(linked_transaction_id) REFERENCES transactions(id)
);
CREATE INDEX IF NOT EXISTS idx_installments_loan ON loan_installments(loan_id);

-- ۹. بودجه‌بندی ماهانه (Monthly Budgets)
CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    shamsi_month TEXT NOT NULL,        -- مثلاً: 1405-08
    max_amount INTEGER NOT NULL,       -- سقف بودجه به ریال
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(category_id) REFERENCES categories(id)
);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, shamsi_month);

-- ۱۰. گروه‌های دنگ و تسهیم مخارج (Splitwise Engine)
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT NOT NULL,
    counterparty_id TEXT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(group_id, counterparty_id),
    FOREIGN KEY(group_id) REFERENCES groups(id),
    FOREIGN KEY(counterparty_id) REFERENCES counterparties(id)
);

CREATE TABLE IF NOT EXISTS group_expenses (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    payer_id TEXT NOT NULL,
    amount INTEGER NOT NULL,           -- به ریال
    description TEXT NOT NULL,
    linked_transaction_id TEXT,
    expense_date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(group_id) REFERENCES groups(id),
    FOREIGN KEY(payer_id) REFERENCES counterparties(id),
    FOREIGN KEY(linked_transaction_id) REFERENCES transactions(id)
);

CREATE TABLE IF NOT EXISTS expense_splits (
    expense_id TEXT NOT NULL,
    counterparty_id TEXT NOT NULL,
    owed_amount INTEGER NOT NULL,      -- به ریال
    PRIMARY KEY(expense_id, counterparty_id),
    FOREIGN KEY(expense_id) REFERENCES group_expenses(id),
    FOREIGN KEY(counterparty_id) REFERENCES counterparties(id)
);

CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    amount INTEGER NOT NULL,           -- به ریال
    settled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(group_id) REFERENCES groups(id),
    FOREIGN KEY(from_id) REFERENCES counterparties(id),
    FOREIGN KEY(to_id) REFERENCES counterparties(id)
);
