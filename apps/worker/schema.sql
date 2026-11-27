-- اسکیماهای رسمی پایگاه داده رابطه‌ای جیب‌بان (JibBan D1 - هسته بومی پارمیس + موتور دنگ)
-- سازگار ۱۰۰٪ با ساختار فایل‌های پشتیبان پارمیس (.par / SQLite) و پشتیبانی از Cold Start

-- ۱. کاربران سیستم (برای احراز هویت و Sync Token اندروید)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email_or_phone TEXT UNIQUE,
    sync_token TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ۲. بانک‌ها (جدول پایه پارمیس)
CREATE TABLE IF NOT EXISTS Bank (
    id INTEGER PRIMARY KEY,
    Bank_name TEXT,
    systematic INTEGER DEFAULT 0,
    imageName TEXT DEFAULT 'user_bank'
);

-- ۳. سال‌ها و دوره‌های مالی پارمیس (FiscalYear)
CREATE TABLE IF NOT EXISTS FiscalYear (
    fiscal_id INTEGER PRIMARY KEY NOT NULL,
    fiscal_name TEXT,
    fiscal_beginDate TEXT,
    fiscal_endDate TEXT,
    fiscal_status INTEGER DEFAULT 1, -- 1: باز/فعال ، 2: بسته شده
    Capital_parentId INTEGER,
    Capital_childId INTEGER,
    Capital_subChildId INTEGER
);

-- ۴. درخت حساب‌های مالی ۳ سطحی پارمیس (accounts)
CREATE TABLE IF NOT EXISTS accounts (
    Ac_id INTEGER PRIMARY KEY,
    Ac_parent_id INTEGER DEFAULT 0,
    Ac_title TEXT,
    Ac_info TEXT,
    Ac_balance REAL DEFAULT 0,       -- مانده به ریال
    Ac_isLeaf INTEGER DEFAULT 1,
    Ac_isSystematic INTEGER DEFAULT 0,
    Ac_isMember INTEGER DEFAULT 0,
    Ac_payable INTEGER DEFAULT 1,
    Ac_recivable INTEGER DEFAULT 1,
    Ac_enable INTEGER DEFAULT 1,
    Ac_bank_ac_id INTEGER DEFAULT 0,
    ac_icon TEXT DEFAULT 'defaultpic',
    Ac_title_ar TEXT DEFAULT '',
    Ac_title_en TEXT DEFAULT '',
    Ac_fav TEXT DEFAULT '0',
    Ac_pin INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_parmis_accounts_parent ON accounts(Ac_parent_id);

-- ۵. مشخصات حساب‌های بانکی متصل به درخت حساب‌ها (BankAccounts)
CREATE TABLE IF NOT EXISTS BankAccounts (
    BAc_id INTEGER PRIMARY KEY,
    BAc_bank_id INTEGER,
    BAc_ac_id INTEGER,
    BAc_branch_name TEXT DEFAULT '',
    BAc_account_cod TEXT DEFAULT '',
    BAc_cart_number TEXT DEFAULT '',
    BAc_sheba TEXT DEFAULT '',
    BAc_info TEXT DEFAULT '',
    BAc_isenable INTEGER DEFAULT 1,
    read_sms INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_parmis_bank_acc_ac ON BankAccounts(BAc_ac_id);

-- ۶. مانده اول/پایان دوره حساب‌ها به تفکیک سال مالی (RemainedAccount)
CREATE TABLE IF NOT EXISTS RemainedAccount (
    id INTEGER PRIMARY KEY NOT NULL,
    AccountId INTEGER,
    FiscalId INTEGER,
    remained REAL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_parmis_remained_fiscal ON RemainedAccount(FiscalId, AccountId);

-- ۷. دفتر روزنامه اسناد و تراکنش‌های مالی پارمیس (Activity)
-- قرارداد پارمیس: Act_rec_* = حساب مبدا (منبع پول) ، Act_pay_* = حساب مقصد (مصرف/واریز)
CREATE TABLE IF NOT EXISTS Activity (
    Act_id INTEGER PRIMARY KEY,
    Act_date TEXT,
    Act_time TEXT,
    Act_amount REAL DEFAULT 0,
    Act_info TEXT DEFAULT '',
    Act_rec_Root_id INTEGER DEFAULT -1,
    Act_rec_Subacc_id INTEGER DEFAULT -1,
    Act_accRecive_id INTEGER DEFAULT -1,
    Act_accRecive1_id INTEGER DEFAULT -1,
    Act_accRecive2_id INTEGER DEFAULT -1,
    Act_pay_Root_id INTEGER DEFAULT -1,
    Act_pay_Subacc_id INTEGER DEFAULT -1,
    Act_accPay_id INTEGER DEFAULT -1,
    Act_accPay1_id INTEGER DEFAULT -1,
    Act_accPay2_id INTEGER DEFAULT -1,
    RecivePath TEXT DEFAULT '',
    PayPath TEXT DEFAULT '',
    Act_Fiscal_id INTEGER DEFAULT 1,
    Act_multiId INTEGER DEFAULT 0,
    Act_multiType INTEGER DEFAULT 0, -- 0: ساده، 1: سربرگ مرکب، 2: ردیف مرکب
    Act_iscash INTEGER DEFAULT 1,
    Act_set INTEGER DEFAULT 1,
    Act_ser INTEGER DEFAULT 0,
    Act_dayOfWeek INTEGER DEFAULT 0,
    Act_accMember_id INTEGER DEFAULT -1,
    Act_memberName TEXT DEFAULT '',
    Act_bankName TEXT DEFAULT '',
    Act_cheq_id INTEGER DEFAULT 0,
    Act_isCheq_passed INTEGER DEFAULT 0,
    Act_cheqReminderId INTEGER DEFAULT 0,
    Act_attribute INTEGER DEFAULT 0,
    Act_latitude TEXT DEFAULT '',
    Act_longitude TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_parmis_activity_fiscal ON Activity(Act_Fiscal_id);
CREATE INDEX IF NOT EXISTS idx_parmis_activity_date ON Activity(Act_date DESC);
CREATE INDEX IF NOT EXISTS idx_parmis_activity_multi ON Activity(Act_multiId, Act_multiType);

-- ۸. سربرگ اسناد مرکب چند حسابی (MultiActivity)
CREATE TABLE IF NOT EXISTS MultiActivity (
    MultiId INTEGER PRIMARY KEY NOT NULL,
    Date TEXT,
    Time TEXT,
    Info TEXT,
    Serial INTEGER,
    Type INTEGER DEFAULT 1
);

-- ۹. الگوهای تراکنش سریع (Pattern)
CREATE TABLE IF NOT EXISTS Pattern (
    pat_id INTEGER PRIMARY KEY NOT NULL,
    pat_title TEXT,
    pat_rec_accParentId INTEGER DEFAULT -1,
    pat_rec_accChildId INTEGER DEFAULT -1,
    pat_rec_accSubChildId INTEGER DEFAULT -1,
    pat_pay_accParentId INTEGER DEFAULT -1,
    pat_pay_accChildId INTEGER DEFAULT -1,
    pat_pay_accSubChildId INTEGER DEFAULT -1,
    pat_amount REAL DEFAULT 0,
    pat_info TEXT DEFAULT '',
    pat_type INTEGER DEFAULT 1,
    pat_member_accId INTEGER DEFAULT -1,
    pat_accountId_show INTEGER DEFAULT -1
);

-- ۱۰. صندوق پیامک‌های بانکی (smsTable)
CREATE TABLE IF NOT EXISTS smsTable (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Content TEXT,
    Type INTEGER DEFAULT 2,          -- 2: برداشت (هزینه)، 3: واریز (درآمد)
    Date TEXT,
    Time TEXT,
    AccountNumber TEXT,
    Description TEXT,
    Amount TEXT,
    BankName TEXT,
    TransactionId INTEGER DEFAULT 0  -- 0: در انتظار، >0: متصل به Activity، -1: نادیده گرفته‌شده
);
CREATE INDEX IF NOT EXISTS idx_parmis_sms_tx ON smsTable(TransactionId);

-- ۱۱. بانک‌ها/شماره حساب‌های ناشناس شناسایی‌شده در پیامک (UnregisteredBankSms)
CREATE TABLE IF NOT EXISTS UnregisteredBankSms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_name TEXT,
    bank_account_number TEXT,
    read_sms INTEGER DEFAULT 1
);

-- ۱۲. اشخاص، برچسب‌ها، بودجه و اقساط پارمیس
CREATE TABLE IF NOT EXISTS person (
    per_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    per_name TEXT,
    per_family TEXT,
    per_acc_id INTEGER,
    per_pic BLOB,
    per_is_member INTEGER DEFAULT 0,
    per_contact_id INTEGER DEFAULT 0,
    per_phoneno TEXT
);

CREATE TABLE IF NOT EXISTS Tag (
    TagId INTEGER PRIMARY KEY NOT NULL,
    Name TEXT,
    TagTypeId INTEGER DEFAULT 1,
    Icon TEXT DEFAULT '',
    Info TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS TagType (
    TagTypeId INTEGER PRIMARY KEY NOT NULL,
    Title TEXT
);

CREATE TABLE IF NOT EXISTS TagActivity (
    TagActivityId INTEGER PRIMARY KEY NOT NULL,
    TagId INTEGER,
    ActivityId INTEGER,
    PatternId INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS Budget (
    budgetId INTEGER PRIMARY KEY NOT NULL,
    title TEXT,
    beginDate TEXT,
    endDate TEXT,
    type INTEGER DEFAULT 1,
    repeat INTEGER DEFAULT 0,
    accountId INTEGER,
    parentId INTEGER,
    childId INTEGER,
    subChildId INTEGER,
    minAmount REAL DEFAULT 0,
    maxAmount REAL DEFAULT 0,
    endDateRepeat TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS Installment (
    inst_id INTEGER PRIMARY KEY NOT NULL,
    inst_transactionId_loan INTEGER DEFAULT 0,
    inst_transactionId_profit INTEGER DEFAULT 0,
    inst_title TEXT,
    inst_rec_accParentId INTEGER,
    inst_rec_accChildId INTEGER,
    inst_rec_accSubChildId INTEGER,
    inst_pay_accParentId INTEGER,
    inst_pay_accChildId INTEGER,
    inst_pay_accSubChildId INTEGER,
    inst_amount REAL DEFAULT 0,
    inst_amount_profit REAL DEFAULT 0,
    inst_amount_pay REAL DEFAULT 0,
    inst_count INTEGER DEFAULT 12,
    inst_dateBegin TEXT,
    inst_periodTime_type INTEGER DEFAULT 1,
    inst_count_payBefore INTEGER DEFAULT 0,
    inst_amount_payBefore REAL DEFAULT 0,
    inst_profit_accParentId INTEGER DEFAULT 0,
    inst_profit_accChildId INTEGER DEFAULT 0,
    inst_profit_accSubChildId INTEGER DEFAULT 0,
    inst_repeat INTEGER DEFAULT 1,
    inst_set INTEGER DEFAULT 0,
    inst_pic TEXT DEFAULT '',
    inst_description TEXT DEFAULT '',
    inst_DateRecive TEXT DEFAULT '',
    inst_isSpent INTEGER DEFAULT 0,
    inst_count_reminder INTEGER DEFAULT -1,
    inst_profit_type INTEGER DEFAULT 0,
    inst_profit_cost_accsubchildId INTEGER DEFAULT 0,
    inst_Fiscal_id INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS InstDetails (
    Details_id INTEGER PRIMARY KEY NOT NULL,
    Details_instId INTEGER,
    Details_transactionId_pay INTEGER DEFAULT 0,
    Details_transactionId_fine INTEGER DEFAULT 0,
    Details_date TEXT,
    Details_status INTEGER DEFAULT 0,
    Details_amount REAL DEFAULT 0,
    Details_ReminderId INTEGER DEFAULT 0,
    details_amount_profit REAL DEFAULT 0,
    details_transactionId_profit INTEGER DEFAULT 0
);

-- ۱۳. گروه‌های دنگ و تسهیم مخارج (JibBan Splitwise Engine)
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT NOT NULL,
    counterparty_id TEXT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(group_id, counterparty_id)
);

CREATE TABLE IF NOT EXISTS group_expenses (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    payer_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT NOT NULL,
    linked_transaction_id TEXT,
    expense_date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expense_splits (
    expense_id TEXT NOT NULL,
    counterparty_id TEXT NOT NULL,
    owed_amount INTEGER NOT NULL,
    PRIMARY KEY(expense_id, counterparty_id)
);

CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    settled_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
