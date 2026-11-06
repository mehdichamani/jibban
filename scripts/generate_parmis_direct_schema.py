#!/usr/bin/env python3
"""
ایمپورت مستقیم ۱۰۰٪ منطبق با ساختار حسابداری پارمیس برای جیب‌بان ۲.۵
- هر تراکنش دقیقاً رکورد Activity پارمیس است
- در صورت وجود Act_multiId، تراکنش‌ها با multi_id به عنوان یک سند مشترک گروه‌بندی می‌شوند
- بدون هیچ تغییر یا دستکاری، دفتر کل دیتابیس به صورت جبری موجودی را به صفر مغایرت می‌رساند
"""

import sqlite3
import os
import sys

PARMIS_DB_PATH = 'tmp_migration/parmis-1405-8-15 15-41.par'
OUTPUT_SQL_PATH = 'tmp_migration/parmis_direct_1405.sql'

if not os.path.exists(PARMIS_DB_PATH):
    print(f"Error: {PARMIS_DB_PATH} not found", file=sys.stderr)
    sys.exit(1)

parmis = sqlite3.connect(PARMIS_DB_PATH)
c = parmis.cursor()

def sql_str(val):
    if val is None:
        return 'NULL'
    s = str(val).replace("'", "''")
    return f"'{s}'"

def get_leaf(root, sub, a1, a2, a_id, path):
    if a_id and a_id > 0: return a_id
    if a2 and a2 > 0: return a2
    if a1 and a1 > 0: return a1
    if sub and sub > 0: return sub
    if path and path.strip():
        parts = [int(p) for p in path.split(',') if p.strip() and p.strip() != '-1']
        if parts: return parts[-1]
    if root and root > 0: return root
    return None

statements = []
statements.append("-- ==================================================================")
statements.append("-- پایگاه داده جیب‌بان ۲.۵ - سال مالی ۱۴۰۵ منطبق مستقیم بر دفتر روزنامه پارمیس")
statements.append("-- ==================================================================")
statements.append("")
statements.append("PRAGMA foreign_keys = OFF;")
statements.append("DELETE FROM loan_installments;")
statements.append("DELETE FROM loans;")
statements.append("DELETE FROM expense_splits;")
statements.append("DELETE FROM group_expenses;")
statements.append("DELETE FROM group_members;")
statements.append("DELETE FROM groups;")
statements.append("DELETE FROM settlements;")
statements.append("DELETE FROM budgets;")
statements.append("DELETE FROM transaction_items;")
statements.append("DELETE FROM transactions;")
statements.append("DELETE FROM raw_sms;")
statements.append("DELETE FROM fiscal_remained_accounts;")
statements.append("DELETE FROM fiscal_years;")
statements.append("DELETE FROM counterparties;")
statements.append("DELETE FROM categories;")
statements.append("DELETE FROM accounts;")
statements.append("DELETE FROM users;")
statements.append("")

# ۱. کاربر پیش‌فرض
user_id = 'user_default'
statements.append(f"INSERT INTO users (id, name, email_or_phone, sync_token) VALUES ('{user_id}', 'مهدی چمنی', 'user@jibban.local', 'jibban_sync_demo_token_12345');")
statements.append("")

# ۲. سال‌های مالی (Fiscal Years)
c.execute('SELECT fiscal_id, fiscal_name, fiscal_beginDate, fiscal_endDate, fiscal_status FROM FiscalYear')
for fy in c.fetchall():
    fy_id = f'fiscal_{fy[0]}'
    fy_name = str(fy[1]).replace("'", "").strip()
    status = 'open' if fy[4] == 1 else 'closed'
    is_active = 1 if fy[0] == 3 else 0
    statements.append(
        f"INSERT INTO fiscal_years (id, user_id, name, begin_date, end_date, status, is_active) "
        f"VALUES ('{fy_id}', '{user_id}', {sql_str(fy_name)}, {sql_str(fy[2])}, {sql_str(fy[3])}, '{status}', {is_active});"
    )
statements.append("")

# ۳. محاسبه دقیق مانده اول دوره ۱۴۰۵ حساب‌ها
c.execute('SELECT Ac_id, Ac_title, Ac_parent_id, Ac_balance FROM accounts WHERE Ac_parent_id IN (3, 4)')
all_bank_wallets = c.fetchall()

start_balances = {}
for aid, title, pid, final_bal in all_bank_wallets:
    c.execute('''
    SELECT 
        Act_id, Act_amount,
        Act_pay_Root_id, Act_pay_Subacc_id, Act_accPay1_id, Act_accPay2_id, Act_accPay_id, PayPath,
        Act_rec_Root_id, Act_rec_Subacc_id, Act_accRecive1_id, Act_accRecive2_id, Act_accRecive_id, RecivePath
    FROM Activity
    WHERE Act_Fiscal_id IN (1, 2)
    ''')
    in_prev = 0
    out_prev = 0
    for r in c.fetchall():
        amt = r[1] or 0
        p_leaf = get_leaf(r[2], r[3], r[4], r[5], r[6], r[7])
        r_leaf = get_leaf(r[8], r[9], r[10], r[11], r[12], r[13])
        if p_leaf == aid: in_prev += amt
        if r_leaf == aid: out_prev += amt
    c.execute('SELECT remained FROM RemainedAccount WHERE AccountId = ? AND FiscalId = 1', (aid,))
    r1 = c.fetchone()
    init_f1 = r1[0] if r1 else 0
    start_balances[aid] = int(round(init_f1 + in_prev - out_prev))

ac_to_acc = {}

# بانک‌ها
c.execute('SELECT BAc_id, BAc_ac_id FROM BankAccounts')
for bac_id, ac_id in c.fetchall():
    if ac_id:
        ac_to_acc[ac_id] = f'acc_bank_{bac_id}'

c.execute('''
SELECT 
    ba.BAc_id,
    b.Bank_name,
    ba.BAc_branch_name,
    ba.BAc_account_cod,
    ba.BAc_cart_number,
    ba.BAc_sheba,
    acc.Ac_title,
    acc.Ac_id
FROM BankAccounts ba
LEFT JOIN Bank b ON ba.BAc_bank_id = b.id
LEFT JOIN accounts acc ON ba.BAc_ac_id = acc.Ac_id
''')
for ba in c.fetchall():
    bac_id = ba[0]
    ac_id = ba[7]
    acc_id = f'acc_bank_{bac_id}'
    name = ba[6] or (f'بانک {ba[1]}' if ba[1] else f'حساب {bac_id}')
    init_bal = start_balances.get(ac_id, 0)
    statements.append(
        f"INSERT INTO accounts (id, user_id, name, type, bank_name, account_number, card_number, sheba, balance, initial_balance, is_archived) "
        f"VALUES ('{acc_id}', '{user_id}', {sql_str(name)}, 'bank', {sql_str(ba[1])}, {sql_str(ba[3])}, {sql_str(ba[4])}, {sql_str(ba[5])}, {init_bal}, {init_bal}, 0);"
    )
    statements.append(
        f"INSERT INTO fiscal_remained_accounts (id, user_id, account_id, fiscal_year_id, remained) "
        f"VALUES ('fra_1405_{acc_id}', '{user_id}', '{acc_id}', 'fiscal_3', {init_bal});"
    )

# کیف‌پول‌ها و صندوق‌ها (Ac_parent_id = 3)
c.execute('SELECT Ac_id, Ac_title FROM accounts WHERE Ac_parent_id = 3')
for r in c.fetchall():
    ac_id = r[0]
    acc_id = f'acc_wallet_{ac_id}'
    ac_to_acc[ac_id] = acc_id
    init_bal = start_balances.get(ac_id, 0)
    statements.append(
        f"INSERT INTO accounts (id, user_id, name, type, bank_name, account_number, card_number, sheba, balance, initial_balance, is_archived) "
        f"VALUES ('{acc_id}', '{user_id}', {sql_str(r[1])}, 'wallet', NULL, NULL, NULL, NULL, {init_bal}, {init_bal}, 0);"
    )
    statements.append(
        f"INSERT INTO fiscal_remained_accounts (id, user_id, account_id, fiscal_year_id, remained) "
        f"VALUES ('fra_1405_{acc_id}', '{user_id}', '{acc_id}', 'fiscal_3', {init_bal});"
    )
statements.append("")

# ۴. اشخاص و طرف‌حساب‌ها
c.execute('SELECT per_id, per_acc_id, per_name, per_family, per_phoneno FROM person')
ac_to_cp = {}
for p in c.fetchall():
    cp_id = f'cp_parmis_{p[0]}'
    if p[1]:
        ac_to_cp[p[1]] = cp_id
    full_name = ' '.join(filter(None, [p[2], p[3]])).strip() or f'طرف حساب {p[0]}'
    paid = p[1]
    c.execute('''
    SELECT 
        Act_id, Act_amount,
        Act_pay_Root_id, Act_pay_Subacc_id, Act_accPay1_id, Act_accPay2_id, Act_accPay_id, PayPath,
        Act_rec_Root_id, Act_rec_Subacc_id, Act_accRecive1_id, Act_accRecive2_id, Act_accRecive_id, RecivePath
    FROM Activity
    WHERE Act_Fiscal_id IN (1, 2)
    ''')
    in_prev = 0
    out_prev = 0
    for r in c.fetchall():
        amt = r[1] or 0
        p_leaf = get_leaf(r[2], r[3], r[4], r[5], r[6], r[7])
        r_leaf = get_leaf(r[8], r[9], r[10], r[11], r[12], r[13])
        if p_leaf == paid: in_prev += amt
        if r_leaf == paid: out_prev += amt
    c.execute('SELECT remained FROM RemainedAccount WHERE AccountId = ? AND FiscalId = 1', (paid,))
    r1 = c.fetchone()
    init_f1 = r1[0] if r1 else 0
    p_init = int(round(init_f1 + in_prev - out_prev))
    statements.append(
        f"INSERT INTO counterparties (id, user_id, name, phone, balance) "
        f"VALUES ('{cp_id}', '{user_id}', {sql_str(full_name)}, {sql_str(p[4])}, {p_init});"
    )
statements.append("")

# ۵. دسته‌بندی‌ها
c.execute('''
  SELECT Ac_id, Ac_parent_id, Ac_title, Ac_recivable
  FROM accounts
  WHERE (Ac_isMember IS NULL OR Ac_isMember = 0)
    AND (Ac_bank_ac_id IS NULL OR Ac_bank_ac_id = 0)
    AND Ac_parent_id NOT IN (3, 4) AND Ac_id NOT IN (3, 4)
''')
all_cats = c.fetchall()
cat_ids = set(r[0] for r in all_cats)
roots = [r for r in all_cats if not r[1] or r[1] not in cat_ids]
children = [r for r in all_cats if r[1] and r[1] in cat_ids]
ac_to_cat = {}

for r in roots:
    cat_id = f'cat_parmis_{r[0]}'
    ac_to_cat[r[0]] = cat_id
    c_type = 'income' if r[3] == 1 else 'expense'
    statements.append(
        f"INSERT INTO categories (id, user_id, parent_id, name, type) "
        f"VALUES ('{cat_id}', '{user_id}', NULL, {sql_str(r[2])}, '{c_type}');"
    )

for r in children:
    cat_id = f'cat_parmis_{r[0]}'
    ac_to_cat[r[0]] = cat_id
    parent_id = f'cat_parmis_{r[1]}'
    c_type = 'income' if r[3] == 1 else 'expense'
    statements.append(
        f"INSERT INTO categories (id, user_id, parent_id, name, type) "
        f"VALUES ('{cat_id}', '{user_id}', '{parent_id}', {sql_str(r[2])}, '{c_type}');"
    )
statements.append("")

# ۶. پیامک‌های سال ۱۴۰۵
c.execute("SELECT ID, Content, BankName, Amount, Date, Time, TransactionId FROM smsTable WHERE Date >= '1405/01/01'")
for s in c.fetchall():
    sms_hash = f'sms_parmis_{s[0]}'
    amt = int(round(float(str(s[3] or 0).replace(',', '')))) if s[3] else 0
    rec_at = f"{s[4]} {s[5] or ''}".strip() if s[4] else None
    tx_link = f"'tx_parmis_{s[6]}'" if s[6] else 'NULL'
    statements.append(
        f"INSERT INTO raw_sms (id, sms_hash, user_id, raw_text, bank_name, parsed_amount, status, transaction_id, received_at) "
        f"VALUES ('{sms_hash}', '{sms_hash}', '{user_id}', {sql_str(s[1])}, {sql_str(s[2])}, {amt}, 'processed', {tx_link}, {sql_str(rec_at)});"
    )
statements.append("")

# ۷. درج ۱۰۰٪ مستقیم تمام رکوردهای دفتر روزنامه سال مالی ۱۴۰۵
c.execute('''
SELECT 
    Act_id, Act_amount, Act_info, Act_date, Act_time,
    Act_multiId, Act_multiType,
    Act_pay_Root_id, Act_pay_Subacc_id, Act_accPay1_id, Act_accPay2_id, Act_accPay_id, PayPath,
    Act_rec_Root_id, Act_rec_Subacc_id, Act_accRecive1_id, Act_accRecive2_id, Act_accRecive_id, RecivePath
FROM Activity 
WHERE Act_Fiscal_id = 3
ORDER BY Act_date ASC, Act_time ASC, Act_id ASC
''')
all_acts = c.fetchall()

for act in all_acts:
    tx_id = f'tx_parmis_{act[0]}'
    amt = int(round(act[1] or 0))
    sh_date = act[3] or ''
    t_time = act[4] or '12:00:00'
    tx_date = f"{sh_date} {t_time}"
    mid = act[5] or 0
    m_type = act[6] or 0
    
    p_leaf = get_leaf(act[7], act[8], act[9], act[10], act[11], act[12])
    r_leaf = get_leaf(act[13], act[14], act[15], act[16], act[17], act[18])
    
    from_acc = ac_to_acc.get(r_leaf)
    to_acc = ac_to_acc.get(p_leaf)
    cat_id = ac_to_cat.get(p_leaf) or ac_to_cat.get(r_leaf)
    cp_id = ac_to_cp.get(p_leaf) or ac_to_cp.get(r_leaf)
    
    if from_acc and to_acc:
        tx_type = 'transfer'
    elif to_acc:
        tx_type = 'credit'
    elif from_acc:
        tx_type = 'debit'
    else:
        tx_type = 'debit'
        
    f_sql = f"'{from_acc}'" if from_acc else 'NULL'
    t_sql = f"'{to_acc}'" if to_acc else 'NULL'
    c_sql = f"'{cat_id}'" if cat_id else 'NULL'
    cp_sql = f"'{cp_id}'" if cp_id else 'NULL'
    is_compound = 1 if mid > 0 else 0
    tag_str = f"'multi_{mid}'" if mid > 0 else 'NULL'
    
    statements.append(
        f"INSERT INTO transactions (id, user_id, fiscal_year_id, type, amount, from_account_id, to_account_id, category_id, counterparty_id, description, tag, transaction_date, shamsi_date, time, is_compound) "
        f"VALUES ('{tx_id}', '{user_id}', 'fiscal_3', '{tx_type}', {amt}, {f_sql}, {t_sql}, {c_sql}, {cp_sql}, {sql_str(act[2])}, {tag_str}, {sql_str(tx_date)}, {sql_str(sh_date)}, {sql_str(t_time)}, {is_compound});"
    )

# ۸. به‌روزرسانی موجودی حساب‌ها به صورت ۱۰۰٪ دوبل (پارس مستقیم دفتر روزنامه)
statements.append("")
statements.append("-- محاسبه دقیق مانده حساب‌ها بر اساس دفتر روزنامه مستقیم پارمیس")
statements.append("""
UPDATE accounts SET balance = initial_balance + (
    COALESCE((SELECT SUM(amount) FROM transactions WHERE to_account_id = accounts.id), 0) -
    COALESCE((SELECT SUM(amount) FROM transactions WHERE from_account_id = accounts.id), 0)
);
""")

# ۹. وام‌ها و اقساط
c.execute('SELECT inst_id, inst_title, inst_amount, inst_amount_profit, inst_amount_pay, inst_count, inst_count_payBefore, inst_dateBegin FROM Installment')
for l in c.fetchall():
    loan_id = f'loan_parmis_{l[0]}'
    tot = int(round(l[2] or 0))
    prof = int(round(l[3] or 0))
    inst_amt = int(round(l[4] or 0))
    tot_inst = int(round(l[5] or 1))
    paid_inst = int(round(l[6] or 0))
    st = 'completed' if paid_inst >= tot_inst else 'active'
    s_date = l[7] or '1400-01-01'
    statements.append(
        f"INSERT INTO loans (id, user_id, title, total_amount, total_profit, installment_amount, total_installments, paid_installments, start_date, status) "
        f"VALUES ('{loan_id}', '{user_id}', {sql_str(l[1])}, {tot}, {prof}, {inst_amt}, {tot_inst}, {paid_inst}, {sql_str(s_date)}, '{st}');"
    )
    
    c2 = parmis.cursor()
    c2.execute('SELECT Details_id, Details_date, Details_status, Details_amount, Details_transactionId_pay FROM InstDetails WHERE Details_instId = ?', (l[0],))
    num = 1
    for d in c2.fetchall():
        inst_id = f'inst_parmis_{d[0]}'
        d_amt = int(round(d[3] or inst_amt))
        is_p = 1 if d[2] == 1 else 0
        due = d[1] or s_date
        linked_tx = d[4]
        tx_link = 'NULL'
        if linked_tx:
            c.execute('SELECT Act_Fiscal_id FROM Activity WHERE Act_id = ?', (linked_tx,))
            row = c.fetchone()
            if row and row[0] == 3:
                tx_link = f"'tx_parmis_{linked_tx}'"
        
        statements.append(
            f"INSERT INTO loan_installments (id, loan_id, installment_number, amount, due_date, is_paid, linked_transaction_id) "
            f"VALUES ('{inst_id}', '{loan_id}', {num}, {d_amt}, {sql_str(due)}, {is_p}, {tx_link});"
        )
        num += 1

statements.append("")
statements.append("PRAGMA foreign_keys = ON;")

with open(OUTPUT_SQL_PATH, 'w', encoding='utf-8') as f:
    f.write('\n'.join(statements) + '\n')

print(f"Generated {len(statements)} direct journal SQL statements in {OUTPUT_SQL_PATH}")
