-- اسکیماهای رسمی پایگاه داده رابطه‌ای جیب‌بان (JibBan D1 Database 2.5 - دفتر روزنامه دوبل به سبک پارمیس)
-- مجهز به پشتیبانی کامل از سال‌های مالی (Fiscal Years)، اسناد چند مبدا و چند مقصد (Multi-entry Activity) و دقت ریالی

-- ۱. کاربران سیستم
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email_or_phone TEXT UNIQUE,
    sync_token TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ۲. سال‌ها و دوره‌های مالی (Fiscal Years - منطبق با پارمیس)
CREATE TABLE IF NOT EXISTS fiscal_years (
    id TEXT PRIMARY KEY,               -- مثلاً: fiscal_1405, fiscal_1404
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,                -- نام دوره: ۱۴۰۵، ۱۴۰۴
    begin_date TEXT NOT NULL,          -- شروع دوره (مثلاً: 1405/01/01)
    end_date TEXT NOT NULL,            -- پایان دوره (مثلاً: 1405/12/29)
    status TEXT CHECK(status IN ('open', 'closed')) DEFAULT 'open',
    is_active BOOLEAN DEFAULT 1,       -- دوره فعال جاری
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_fiscal_years_user ON fiscal_years(user_id);

-- ۳. حساب‌های مالی (Asset, Bank, Expense, Income, Debt Accounts - ۱۰۰٪ منطبق با پارمیس)
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    parent_id TEXT,                    -- کلید والد برای ساختار درختی پارمیس (Ac_parent_id)
    name TEXT NOT NULL,                -- نام حساب (بلوبانک، سوپرمارکت، حقوق، سینا و...)
    type TEXT CHECK(type IN ('bank', 'wallet', 'savings', 'credit', 'debt', 'expense', 'income')) DEFAULT 'bank',
    bank_name TEXT,                    -- نام بانک
    account_number TEXT,               -- شماره حساب
    card_number TEXT,                  -- شماره کارت ۱۶ رقمی یا ۴ رقم آخر
    sheba TEXT,                        -- شماره شبا
    balance INTEGER DEFAULT 0,         -- مانده فعلی (همیشه به ریال)
    initial_balance INTEGER DEFAULT 0, -- مانده اولیه به ریال
    color TEXT DEFAULT '#0284c7',
    icon TEXT DEFAULT 'landmark',
    is_archived BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(parent_id) REFERENCES accounts(id)
);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_id);

-- ۴. مانده اول دوره حساب‌ها به تفکیک سال مالی (RemainedAccount - مشابه پارمیس)
CREATE TABLE IF NOT EXISTS fiscal_remained_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    fiscal_year_id TEXT NOT NULL,
    remained INTEGER NOT NULL DEFAULT 0, -- مانده انتقال یافته به ریال
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(account_id) REFERENCES accounts(id),
    FOREIGN KEY(fiscal_year_id) REFERENCES fiscal_years(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fiscal_remained_acc ON fiscal_remained_accounts(account_id, fiscal_year_id);

-- ۵. دسته‌بندی‌های درختی درآمد و هزینه (Hierarchical Categories)
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

-- ۶. اشخاص و طرف‌حساب‌ها (Counterparties)
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

-- ۷. پیامک‌های خام بانکی (Raw SMS Archive & Inbox Queue)
CREATE TABLE IF NOT EXISTS raw_sms (
    id TEXT PRIMARY KEY,
    sms_hash TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    sender TEXT,
    raw_text TEXT NOT NULL,
    bank_name TEXT,
    parsed_amount INTEGER,             -- مبلغ استخراج شده به ریال
    parsed_account TEXT,
    status TEXT CHECK(status IN ('pending', 'processed', 'ignored', 'manual')) DEFAULT 'pending',
    transaction_id TEXT,
    received_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_raw_sms_hash ON raw_sms(sms_hash);
CREATE INDEX IF NOT EXISTS idx_raw_sms_user ON raw_sms(user_id);
CREATE INDEX IF NOT EXISTS idx_raw_sms_status ON raw_sms(status);

-- ۸. سربرگ اسناد و تراکنش‌های مالی (Transactions / Activities Header)
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    fiscal_year_id TEXT,               -- دوره مالی مرتبط (مثلاً: fiscal_1405)
    type TEXT CHECK(type IN ('debit', 'credit', 'transfer', 'compound')) NOT NULL,
    amount INTEGER NOT NULL,           -- جمع کل سند به ریال
    from_account_id TEXT,              -- برای تراکنش‌های ساده تک‌مبدا
    to_account_id TEXT,                -- برای تراکنش‌های ساده تک‌مقصد
    category_id TEXT,                  -- برای تراکنش‌های تک‌دسته‌ای
    counterparty_id TEXT,              -- شخص مرتبط
    description TEXT,                  -- شرح و بابت سند
    tag TEXT,                          -- برچسب
    raw_sms_id TEXT,                   -- ارجاع به پیامک متناظر
    transaction_date DATETIME NOT NULL,-- تاریخ و زمان استاندارد
    shamsi_date TEXT,                  -- تاریخ شمسی رشته‌ای (1405/08/14)
    time TEXT DEFAULT '12:00:00',      -- ساعت تراکنش
    is_compound BOOLEAN DEFAULT 0,     -- آیا تراکنش مرکب (چند مبدا یا چند مقصد) است؟
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(fiscal_year_id) REFERENCES fiscal_years(id),
    FOREIGN KEY(from_account_id) REFERENCES accounts(id),
    FOREIGN KEY(to_account_id) REFERENCES accounts(id),
    FOREIGN KEY(category_id) REFERENCES categories(id),
    FOREIGN KEY(counterparty_id) REFERENCES counterparties(id),
    FOREIGN KEY(raw_sms_id) REFERENCES raw_sms(id)
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_fiscal ON transactions(fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from_acc ON transactions(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_acc ON transactions(to_account_id);

-- ۹. ردیف‌های اسناد مرکب / ریزآیتم‌های چندگانه (Transaction Items - معادل MultiActivity پارمیس)
CREATE TABLE IF NOT EXISTS transaction_items (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    entry_type TEXT CHECK(entry_type IN ('source', 'destination')) NOT NULL, -- منبع (مبدا/برداشت) یا مقصد (هزینه/واریز)
    account_id TEXT,                   -- در صورتی که آیتم حساب بانکی/کیف‌پول باشد
    category_id TEXT,                  -- در صورتی که آیتم دسته‌بندی هزینه/درآمد باشد
    counterparty_id TEXT,              -- در صورتی که آیتم مربوط به شخص باشد
    amount INTEGER NOT NULL,           -- مبلغ این ردیف به ریال
    description TEXT,                  -- شرح ردیف
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(account_id) REFERENCES accounts(id),
    FOREIGN KEY(category_id) REFERENCES categories(id),
    FOREIGN KEY(counterparty_id) REFERENCES counterparties(id)
);
CREATE INDEX IF NOT EXISTS idx_tx_items_transaction ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tx_items_account ON transaction_items(account_id);

-- ۱۰. وام‌ها و تسهیلات (Loans & Borrowings)
CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    account_id TEXT,
    total_amount INTEGER NOT NULL,     -- مبلغ اصل وام به ریال
    total_profit INTEGER DEFAULT 0,    -- مبلغ سود به ریال
    installment_amount INTEGER NOT NULL, -- مبلغ هر قسط به ریال
    total_installments INTEGER NOT NULL,
    paid_installments INTEGER DEFAULT 0,
    start_date DATETIME NOT NULL,
    status TEXT CHECK(status IN ('active', 'completed', 'overdue')) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(account_id) REFERENCES accounts(id)
);
CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);

-- ۱۱. ریز اقساط وام‌ها (Loan Installments)
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

-- ۱۲. بودجه‌بندی ماهانه (Monthly Budgets)
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

-- ۱۳. گروه‌های دنگ و تسهیم مخارج (Splitwise Engine)
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
