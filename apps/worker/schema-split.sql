-- اسکیماهای رسمی پایگاه داده مستقل دنگ و مخارج گروهی جیب‌بان (JibBan Splitwise D1 Database)
-- نگهداری مجزای مخارج مشترک، گروه‌ها، اعضا و تسویه‌حساب‌ها بدون تداخل با دیتابیس مالی شخصی

CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    share_token TEXT UNIQUE,           -- توکن دعوت یا لینک مهمان
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_groups_token ON groups(share_token);

CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    is_guest BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_members_group ON members(group_id);

CREATE TABLE IF NOT EXISTS group_expenses (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    payer_id TEXT NOT NULL,
    amount INTEGER NOT NULL,           -- به ریال
    description TEXT NOT NULL,
    split_type TEXT CHECK(split_type IN ('equal', 'percentage', 'shares')) DEFAULT 'equal',
    expense_date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY(payer_id) REFERENCES members(id)
);
CREATE INDEX IF NOT EXISTS idx_group_expenses_group ON group_expenses(group_id);

CREATE TABLE IF NOT EXISTS expense_splits (
    id TEXT PRIMARY KEY,
    expense_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    owed_amount INTEGER NOT NULL,      -- به ریال
    percentage REAL,
    shares REAL,
    FOREIGN KEY(expense_id) REFERENCES group_expenses(id) ON DELETE CASCADE,
    FOREIGN KEY(member_id) REFERENCES members(id)
);
CREATE INDEX IF NOT EXISTS idx_expense_splits_exp ON expense_splits(expense_id);

CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    amount INTEGER NOT NULL,           -- به ریال
    settled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY(from_id) REFERENCES members(id),
    FOREIGN KEY(to_id) REFERENCES members(id)
);
CREATE INDEX IF NOT EXISTS idx_settlements_group ON settlements(group_id);
