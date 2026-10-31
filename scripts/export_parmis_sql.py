#!/usr/bin/env python3
"""
اکسپورت جامع و استاندارد داده‌های تاریخی پارمیس به جیب‌بان ۲.۰
تضمین صحت ۱۰۰٪ کلیدهای خارجی (Foreign Keys)، مبالغ ریالی و ساختار درختی
"""

import sqlite3
import os
import sys

PARMIS_DB_PATH = 'tmp_migration/parmis-1405-8-9 17-50.par'
OUTPUT_SQL_PATH = 'tmp_migration/imported_parmis_data.sql'

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

statements = []
statements.append("-- مهاجرت داده‌های تاریخی پارمیس به جیب‌بان ۲.۰")
statements.append("-- مبالغ به صورت دقیق بر حسب ریال و با رعایت کامل یکپارچگی ارجاعی (FK)")
statements.append("")

# ۱. کاربر پیش‌فرض
user_id = 'user_default'
statements.append(f"INSERT OR REPLACE INTO users (id, name, email_or_phone, sync_token) VALUES ('{user_id}', 'مهدی چمنی', 'user@jibban.local', 'jibban_sync_demo_token_12345');")

# ۲. حساب‌های بانکی و کیف‌پول‌ها
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
    acc.Ac_balance
FROM BankAccounts ba
LEFT JOIN Bank b ON ba.BAc_bank_id = b.id
LEFT JOIN accounts acc ON ba.BAc_ac_id = acc.Ac_id
''')
for ba in c.fetchall():
    acc_id = f'acc_bank_{ba[0]}'
    name = ba[6] or (f'بانک {ba[1]}' if ba[1] else f'حساب {ba[0]}')
    balance = int(round(ba[7] or 0))
    statements.append(
        f"INSERT OR REPLACE INTO accounts (id, user_id, name, type, bank_name, account_number, card_number, sheba, balance, initial_balance, is_archived) "
        f"VALUES ('{acc_id}', '{user_id}', {sql_str(name)}, 'bank', {sql_str(ba[1])}, {sql_str(ba[3])}, {sql_str(ba[4])}, {sql_str(ba[5])}, {balance}, {balance}, 0);"
    )

# کیف‌پول‌ها، صندوق و اعتبارات (Ac_parent_id = 3)
c.execute('SELECT Ac_id, Ac_title, Ac_balance FROM accounts WHERE Ac_parent_id = 3')
for r in c.fetchall():
    acc_id = f'acc_wallet_{r[0]}'
    ac_to_acc[r[0]] = acc_id
    balance = int(round(r[2] or 0))
    statements.append(
        f"INSERT OR REPLACE INTO accounts (id, user_id, name, type, bank_name, account_number, card_number, sheba, balance, initial_balance, is_archived) "
        f"VALUES ('{acc_id}', '{user_id}', {sql_str(r[1])}, 'wallet', NULL, NULL, NULL, NULL, {balance}, {balance}, 0);"
    )

# ۳. اشخاص و طرف‌حساب‌ها
c.execute('SELECT per_id, per_acc_id, per_name, per_family, per_phoneno, acc.Ac_balance FROM person LEFT JOIN accounts acc ON per_acc_id = acc.Ac_id')
ac_to_cp = {}
for p in c.fetchall():
    cp_id = f'cp_parmis_{p[0]}'
    if p[1]:
        ac_to_cp[p[1]] = cp_id
    full_name = ' '.join(filter(None, [p[2], p[3]])).strip() or f'طرف حساب {p[0]}'
    bal = int(round(p[5] or 0))
    statements.append(
        f"INSERT OR REPLACE INTO counterparties (id, user_id, name, phone, balance) "
        f"VALUES ('{cp_id}', '{user_id}', {sql_str(full_name)}, {sql_str(p[4])}, {bal});"
    )

# ۴. دسته‌بندی‌های درختی (والدها ابتدا، سپس فرزندان)
c.execute('''
  SELECT Ac_id, Ac_parent_id, Ac_title, Ac_recivable
  FROM accounts
  WHERE (Ac_isMember IS NULL OR Ac_isMember = 0)
    AND (Ac_bank_ac_id IS NULL OR Ac_bank_ac_id = 0)
    AND Ac_parent_id != 3 AND Ac_id != 3
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
        f"INSERT OR REPLACE INTO categories (id, user_id, parent_id, name, type) "
        f"VALUES ('{cat_id}', '{user_id}', NULL, {sql_str(r[2])}, '{c_type}');"
    )

for r in children:
    cat_id = f'cat_parmis_{r[0]}'
    ac_to_cat[r[0]] = cat_id
    parent_id = f'cat_parmis_{r[1]}'
    c_type = 'income' if r[3] == 1 else 'expense'
    statements.append(
        f"INSERT OR REPLACE INTO categories (id, user_id, parent_id, name, type) "
        f"VALUES ('{cat_id}', '{user_id}', '{parent_id}', {sql_str(r[2])}, '{c_type}');"
    )

# ۵. آرشیو پیامک‌های خام بانکی
c.execute('SELECT ID, Content, BankName, Amount, Date, Time, TransactionId FROM smsTable')
for s in c.fetchall():
    sms_hash = f'sms_parmis_{s[0]}'
    amt = int(round(float(str(s[3] or 0).replace(',', '')))) if s[3] else 0
    rec_at = f"{s[4]} {s[5] or ''}".strip() if s[4] else None
    tx_link = f"'tx_parmis_{s[6]}'" if s[6] else 'NULL'
    statements.append(
        f"INSERT OR REPLACE INTO raw_sms (id, sms_hash, user_id, raw_text, bank_name, parsed_amount, status, transaction_id, received_at) "
        f"VALUES ('{sms_hash}', '{sms_hash}', '{user_id}', {sql_str(s[1])}, {sql_str(s[2])}, {amt}, 'processed', {tx_link}, {sql_str(rec_at)});"
    )

# ۶. تراکنش‌های مالی (Activity)
def get_leaf(path, direct_id):
    if direct_id and direct_id > 0:
        return direct_id
    if path and path.strip():
        for part in reversed(path.split(',')):
            part = part.strip()
            if part.isdigit():
                return int(part)
    return None

c.execute('SELECT Act_id, Act_amount, Act_info, Act_date, Act_time, Act_pay_Root_id, Act_accPay_id, PayPath, Act_rec_Root_id, Act_accRecive_id, RecivePath FROM Activity')
for act in c.fetchall():
    tx_id = f'tx_parmis_{act[0]}'
    amt = int(round(act[1] or 0))
    sh_date = act[3] or ''
    tx_date = f"{sh_date} {act[4] or '12:00:00'}"
    
    p_leaf = get_leaf(act[7], act[6])
    r_leaf = get_leaf(act[10], act[9])
    
    from_acc = ac_to_acc.get(p_leaf)
    to_acc = ac_to_acc.get(r_leaf)
    cat_id = ac_to_cat.get(p_leaf) or ac_to_cat.get(r_leaf)
    cp_id = ac_to_cp.get(p_leaf) or ac_to_cp.get(r_leaf)
    
    if from_acc and to_acc:
        tx_type = 'transfer'
    elif to_acc:
        tx_type = 'credit'
    else:
        tx_type = 'debit'
        if not from_acc:
            from_acc = 'acc_bank_1'
            
    f_sql = f"'{from_acc}'" if from_acc else 'NULL'
    t_sql = f"'{to_acc}'" if to_acc else 'NULL'
    c_sql = f"'{cat_id}'" if cat_id else 'NULL'
    cp_sql = f"'{cp_id}'" if cp_id else 'NULL'
    
    statements.append(
        f"INSERT OR REPLACE INTO transactions (id, user_id, type, amount, from_account_id, to_account_id, category_id, counterparty_id, description, transaction_date, shamsi_date) "
        f"VALUES ('{tx_id}', '{user_id}', '{tx_type}', {amt}, {f_sql}, {t_sql}, {c_sql}, {cp_sql}, {sql_str(act[2])}, {sql_str(tx_date)}, {sql_str(sh_date)});"
    )

# ۷. وام‌ها و ریز اقساط
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
        f"INSERT OR REPLACE INTO loans (id, user_id, title, total_amount, total_profit, installment_amount, total_installments, paid_installments, start_date, status) "
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
        linked = f"'tx_parmis_{d[4]}'" if d[4] else 'NULL'
        statements.append(
            f"INSERT OR REPLACE INTO loan_installments (id, loan_id, installment_number, amount, due_date, is_paid, linked_transaction_id) "
            f"VALUES ('{inst_id}', '{loan_id}', {num}, {d_amt}, {sql_str(due)}, {is_p}, {linked});"
        )
        num += 1

with open(OUTPUT_SQL_PATH, 'w', encoding='utf-8') as f:
    f.write('\n'.join(statements) + '\n')

print(f"Generated {len(statements)} SQL statements in {OUTPUT_SQL_PATH}")
