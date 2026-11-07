#!/usr/bin/env python3
"""
مهاجرت یکپارچه ۱۰۰٪ بر پایه حساب‌های پارمیس (بدون مفهوم جداگانه Category)
- تمامی سرفصل‌ها (بانک، هزینه، درآمد، شخص، دارایی، صندوق) همگی یک «حساب» هستند
- تراکنش‌ها صرفاً یک حساب مبدا (از حساب) و یک حساب مقصد (به حساب) دارند
- اسناد چند حسابی چند حساب مبدا یا چند حساب مقصد دارند
"""

import sqlite3
import os
import sys

PARMIS_DB_PATH = 'tmp_migration/parmis-1405-8-15 15-41.par'
OUTPUT_SQL_PATH = 'tmp_migration/parmis_unified_1405.sql'

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

user_id = 'user_default'
statements.append(f"INSERT INTO users (id, name, email_or_phone, sync_token) VALUES ('{user_id}', 'مهدی چمنی', 'user@jibban.local', 'jibban_sync_demo_token_12345');")

# سال‌های مالی
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

# استخراج تمام حساب‌های پارمیس
c.execute('SELECT Ac_id, Ac_title, Ac_parent_id, Ac_recivable FROM accounts')
all_accs = c.fetchall()
acc_map = {r[0]: r for r in all_accs}

def get_root_info(aid):
    curr = aid
    while curr in acc_map and acc_map[curr][2] != 0:
        curr = acc_map[curr][2]
    root_id = curr
    root_name = acc_map.get(curr, (0, 'سایر', 0, 0))[1]
    
    if root_id == 1:
        acc_type = 'expense'
    elif root_id == 2:
        acc_type = 'income'
    elif root_id == 3:
        acc_type = 'wallet'
    elif root_id == 4:
        acc_type = 'bank'
    elif root_id == 161:
        acc_type = 'debt'
    else:
        acc_type = 'savings'
    return root_id, root_name, acc_type

# محاسبه مانده اول دوره سال ۱۴۰۵
c.execute('''
SELECT 
    Act_id, Act_amount,
    Act_pay_Root_id, Act_pay_Subacc_id, Act_accPay1_id, Act_accPay2_id, Act_accPay_id, PayPath,
    Act_rec_Root_id, Act_rec_Subacc_id, Act_accRecive1_id, Act_accRecive2_id, Act_accRecive_id, RecivePath
FROM Activity
WHERE Act_Fiscal_id IN (1, 2)
''')
prev_acts = c.fetchall()

acc_start_balances = {}
for aid, title, pid, recivable in all_accs:
    in_prev = 0
    out_prev = 0
    for r in prev_acts:
        amt = r[1] or 0
        p_leaf = get_leaf(r[2], r[3], r[4], r[5], r[6], r[7])
        r_leaf = get_leaf(r[8], r[9], r[10], r[11], r[12], r[13])
        if p_leaf == aid: in_prev += amt
        if r_leaf == aid: out_prev += amt
    c.execute('SELECT remained FROM RemainedAccount WHERE AccountId = ? AND FiscalId = 1', (aid,))
    r1 = c.fetchone()
    init_f1 = r1[0] if r1 else 0
    acc_start_balances[aid] = int(round(init_f1 + in_prev - out_prev))

# اطلاعات بانکی
c.execute('SELECT BAc_ac_id, b.Bank_name, BAc_account_cod, BAc_cart_number, BAc_sheba FROM BankAccounts ba LEFT JOIN Bank b ON ba.BAc_bank_id = b.id')
bank_details = {r[0]: r for r in c.fetchall() if r[0]}

for aid, title, pid, recivable in all_accs:
    root_id, root_name, acc_type = get_root_info(aid)
    init_bal = acc_start_balances.get(aid, 0)
    b_info = bank_details.get(aid)
    b_name = b_info[1] if b_info else None
    acc_no = b_info[2] if b_info else None
    card_no = b_info[3] if b_info else None
    sheba = b_info[4] if b_info else None
    
    if acc_type == 'bank':
        color = '#0284c7'
        icon = 'credit-card'
    elif acc_type == 'wallet':
        color = '#10b981'
        icon = 'wallet'
    elif acc_type == 'expense':
        color = '#f43f5e'
        icon = 'tag'
    elif acc_type == 'income':
        color = '#10b981'
        icon = 'trending-up'
    elif acc_type == 'debt':
        color = '#8b5cf6'
        icon = 'user'
    else:
        color = '#64748b'
        icon = 'layers'

    acc_id = f'acc_{aid}'
    parent_ref = f"'acc_{pid}'" if pid and pid != 0 else 'NULL'
    statements.append(
        f"INSERT INTO accounts (id, user_id, parent_id, name, type, bank_name, account_number, card_number, sheba, balance, initial_balance, color, icon, is_archived) "
        f"VALUES ('{acc_id}', '{user_id}', {parent_ref}, {sql_str(title)}, '{acc_type}', {sql_str(b_name)}, {sql_str(acc_no)}, {sql_str(card_no)}, {sql_str(sheba)}, {init_bal}, {init_bal}, '{color}', '{icon}', 0);"
    )

# پیامک‌ها
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

# تراکنش‌های سال مالی ۱۴۰۵
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

multis = {}
singles = []
for r in all_acts:
    if r[5] and r[5] > 0:
        multis.setdefault(r[5], []).append(r)
    else:
        singles.append(r)

for act in singles:
    tx_id = f'tx_parmis_{act[0]}'
    amt = int(round(act[1] or 0))
    sh_date = act[3] or ''
    t_time = act[4] or '12:00:00'
    tx_date = f"{sh_date} {t_time}"
    
    p_leaf = get_leaf(act[7], act[8], act[9], act[10], act[11], act[12])
    r_leaf = get_leaf(act[13], act[14], act[15], act[16], act[17], act[18])
    
    from_acc = f'acc_{r_leaf}' if r_leaf else None
    to_acc = f'acc_{p_leaf}' if p_leaf else None
    
    p_type = get_root_info(p_leaf)[2] if p_leaf else 'expense'
    r_type = get_root_info(r_leaf)[2] if r_leaf else 'bank'
    
    if r_type in ('bank', 'wallet') and p_type in ('bank', 'wallet'):
        tx_type = 'transfer'
    elif p_type == 'expense' or r_type in ('bank', 'wallet'):
        tx_type = 'debit'
    elif r_type == 'income' or p_type in ('bank', 'wallet'):
        tx_type = 'credit'
    else:
        tx_type = 'debit'

    f_sql = f"'{from_acc}'" if from_acc else 'NULL'
    t_sql = f"'{to_acc}'" if to_acc else 'NULL'
    
    statements.append(
        f"INSERT INTO transactions (id, user_id, fiscal_year_id, type, amount, from_account_id, to_account_id, description, transaction_date, shamsi_date, time, is_compound) "
        f"VALUES ('{tx_id}', '{user_id}', 'fiscal_3', '{tx_type}', {amt}, {f_sql}, {t_sql}, {sql_str(act[2])}, {sql_str(tx_date)}, {sql_str(sh_date)}, {sql_str(t_time)}, 0);"
    )

for mid, group in multis.items():
    tot_rec = [g for g in group if g[6] == 1][0]
    items = [g for g in group if g[6] == 2]
    
    tx_id = f'tx_parmis_multi_{mid}'
    tot_amt = int(round(tot_rec[1] or 0))
    sh_date = tot_rec[3] or ''
    t_time = tot_rec[4] or '12:00:00'
    tx_date = f"{sh_date} {t_time}"
    
    tot_bank_leaf = get_leaf(tot_rec[13], tot_rec[14], tot_rec[15], tot_rec[16], tot_rec[17], tot_rec[18])
    from_acc = f'acc_{tot_bank_leaf}' if tot_bank_leaf else None
    f_sql = f"'{from_acc}'" if from_acc else 'NULL'
    
    statements.append(
        f"INSERT INTO transactions (id, user_id, fiscal_year_id, type, amount, from_account_id, to_account_id, description, transaction_date, shamsi_date, time, is_compound) "
        f"VALUES ('{tx_id}', '{user_id}', 'fiscal_3', 'compound', {tot_amt}, {f_sql}, NULL, {sql_str(tot_rec[2])}, {sql_str(tx_date)}, {sql_str(sh_date)}, {sql_str(t_time)}, 1);"
    )
    
    if from_acc:
        txi_src_id = f'txi_{tx_id}_src'
        statements.append(
            f"INSERT INTO transaction_items (id, transaction_id, user_id, entry_type, account_id, amount, description) "
            f"VALUES ('{txi_src_id}', '{tx_id}', '{user_id}', 'source', '{from_acc}', {tot_amt}, {sql_str(tot_rec[2])});"
        )
        
    for it in items:
        txi_dst_id = f'txi_parmis_{it[0]}'
        it_amt = int(round(it[1] or 0))
        it_leaf = get_leaf(it[7], it[8], it[9], it[10], it[11], it[12])
        it_acc = f'acc_{it_leaf}' if it_leaf else None
        a_sql = f"'{it_acc}'" if it_acc else 'NULL'
        
        statements.append(
            f"INSERT INTO transaction_items (id, transaction_id, user_id, entry_type, account_id, amount, description) "
            f"VALUES ('{txi_dst_id}', '{tx_id}', '{user_id}', 'destination', {a_sql}, {it_amt}, {sql_str(it[2])});"
        )

# به‌روزرسانی مانده حساب‌ها به روش دوبل
statements.append("""
UPDATE accounts SET balance = initial_balance + (
    COALESCE((SELECT SUM(amount) FROM transactions WHERE to_account_id = accounts.id AND is_compound = 0), 0) +
    COALESCE((SELECT SUM(amount) FROM transaction_items WHERE account_id = accounts.id AND entry_type = 'destination'), 0) -
    COALESCE((SELECT SUM(amount) FROM transactions WHERE from_account_id = accounts.id AND is_compound = 0), 0) -
    COALESCE((SELECT SUM(amount) FROM transaction_items WHERE account_id = accounts.id AND entry_type = 'source'), 0)
);
""")

# وام‌ها
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

statements.append("PRAGMA foreign_keys = ON;")

with open(OUTPUT_SQL_PATH, 'w', encoding='utf-8') as f:
    f.write('\n'.join(statements) + '\n')

print(f"Generated {len(statements)} unified SQL statements in {OUTPUT_SQL_PATH}")
