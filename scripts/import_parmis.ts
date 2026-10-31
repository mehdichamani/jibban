#!/usr/bin/env node
/**
 * اسکریپت مستقل انتقال داده‌های تاریخی از پایگاه داده پارمیس به جیب‌بان ۲.۰
 * JibBan Clean Slate 2.0 - Parmis SQLite Import Pipeline
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const PARMIS_DB_PATH = path.resolve('tmp_migration/parmis-1405-8-9 17-50.par');
const OUTPUT_SQL_PATH = path.resolve('tmp_migration/imported_parmis_data.sql');

if (!fs.existsSync(PARMIS_DB_PATH)) {
  console.error(`❌ فایل دیتابیس پارمیس در مسیر ${PARMIS_DB_PATH} یافت نشد.`);
  process.exit(1);
}

function queryParmis<T = any>(sql: string): T[] {
  const cmd = `sqlite3 "${PARMIS_DB_PATH}" "${sql.replace(/"/g, '\\"')}" --json`;
  const raw = execSync(cmd, { maxBuffer: 100 * 1024 * 1024, encoding: 'utf8' });
  if (!raw.trim()) return [];
  return JSON.parse(raw);
}

function escapeSql(str: any): string {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

console.log('🚀 شروع استخراج و تبدیل دیتای پارمیس به جیب‌بان ۲.۰...');
const sqlStatements: string[] = [];

sqlStatements.push('-- تولید خودکار داده‌های تاریخی پارمیس برای جیب‌بان ۲.۰');
sqlStatements.push('-- تمام مبالغ دقیقاً بر حسب ریال و بدون تغییر ذخیره می‌شوند.');
sqlStatements.push('');

// ۱. کاربر اصلی
const userId = 'user_default';
sqlStatements.push(`INSERT OR IGNORE INTO users (id, name, email_or_phone, sync_token) VALUES ('${userId}', 'مهدی چمنی', 'user@jibban.local', 'jibban_sync_demo_token_12345');`);

// ۲. حساب‌های بانکی و دارایی‌ها
console.log('📦 ۱. استخراج حساب‌های بانکی...');
const bankAccounts = queryParmis(`
  SELECT 
    ba.BAc_id as id,
    b.Bank_name as bankName,
    ba.BAc_branch_name as branchName,
    ba.BAc_account_cod as accountNumber,
    ba.BAc_cart_number as cardNumber,
    ba.BAc_sheba as sheba,
    acc.Ac_title as title,
    acc.Ac_balance as balance
  FROM BankAccounts ba
  LEFT JOIN Bank b ON ba.BAc_bank_id = b.id
  LEFT JOIN accounts acc ON ba.BAc_ac_id = acc.Ac_id
`);

for (const ba of bankAccounts) {
  const accId = `acc_bank_${ba.id}`;
  const name = ba.title || (ba.bankName ? `بانک ${ba.bankName}` : `حساب ${ba.id}`);
  const balance = Math.round(Number(ba.balance || 0));
  sqlStatements.push(
    `INSERT OR REPLACE INTO accounts (id, user_id, name, type, bank_name, account_number, card_number, sheba, balance, initial_balance, is_archived) VALUES ('${accId}', '${userId}', ${escapeSql(name)}, 'bank', ${escapeSql(ba.bankName)}, ${escapeSql(ba.accountNumber)}, ${escapeSql(ba.cardNumber)}, ${escapeSql(ba.sheba)}, ${balance}, ${balance}, 0);`
  );
}
console.log(`✅ ${bankAccounts.length} حساب بانکی استخراج شد.`);

// ۳. اشخاص و طرف‌حساب‌ها
console.log('📦 ۲. استخراج طرف‌حساب‌ها...');
const persons = queryParmis(`
  SELECT 
    p.per_id as id,
    p.per_name as firstName,
    p.per_family as lastName,
    p.per_phoneno as phone,
    acc.Ac_balance as balance
  FROM person p
  LEFT JOIN accounts acc ON p.per_acc_id = acc.Ac_id
`);

for (const p of persons) {
  const cpId = `cp_parmis_${p.id}`;
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || `طرف حساب ${p.id}`;
  const balance = Math.round(Number(p.balance || 0));
  sqlStatements.push(
    `INSERT OR REPLACE INTO counterparties (id, user_id, name, phone, balance) VALUES ('${cpId}', '${userId}', ${escapeSql(fullName)}, ${escapeSql(p.phone)}, ${balance});`
  );
}
console.log(`✅ ${persons.length} طرف‌حساب استخراج شد.`);

// ۴. سرفصل‌های حسابی و درختی
console.log('📦 ۳. استخراج درخت سرفصل‌ها...');
const categories = queryParmis(`
  SELECT 
    Ac_id as id,
    Ac_parent_id as parentId,
    Ac_title as title,
    Ac_payable as isPayable,
    Ac_recivable as isRecivable
  FROM accounts
  WHERE (Ac_isMember IS NULL OR Ac_isMember = 0)
    AND (Ac_bank_ac_id IS NULL OR Ac_bank_ac_id = 0)
`);

for (const c of categories) {
  const catId = `cat_parmis_${c.id}`;
  const parentId = c.parentId && c.parentId > 0 ? `'cat_parmis_${c.parentId}'` : 'NULL';
  const type = c.isRecivable === 1 ? 'income' : 'expense';
  sqlStatements.push(
    `INSERT OR REPLACE INTO categories (id, user_id, parent_id, name, type) VALUES ('${catId}', '${userId}', ${parentId}, ${escapeSql(c.title)}, '${type}');`
  );
}
console.log(`✅ ${categories.length} سرفصل دسته‌بندی استخراج شد.`);

// ۵. وام‌ها و اقساط
console.log('📦 ۴. استخراج وام‌ها و اقساط...');
const loans = queryParmis(`
  SELECT 
    inst_id as id,
    inst_title as title,
    inst_amount as totalAmount,
    inst_amount_profit as totalProfit,
    inst_amount_pay as installmentAmount,
    inst_count as totalInstallments,
    inst_count_payBefore as paidInstallments,
    inst_dateBegin as startDate,
    inst_pay_accChildId as payAccountId
  FROM Installment
`);

for (const l of loans) {
  const loanId = `loan_parmis_${l.id}`;
  const totalAmount = Math.round(Number(l.totalAmount || 0));
  const totalProfit = Math.round(Number(l.totalProfit || 0));
  const instAmount = Math.round(Number(l.installmentAmount || 0));
  const totalInst = Math.round(Number(l.totalInstallments || 1));
  const paidInst = Math.round(Number(l.paidInstallments || 0));
  const status = paidInst >= totalInst ? 'completed' : 'active';
  const startDate = l.startDate ? `${l.startDate.replace(/\//g, '-')}` : new Date().toISOString();

  sqlStatements.push(
    `INSERT OR REPLACE INTO loans (id, user_id, title, total_amount, total_profit, installment_amount, total_installments, paid_installments, start_date, status) VALUES ('${loanId}', '${userId}', ${escapeSql(l.title)}, ${totalAmount}, ${totalProfit}, ${instAmount}, ${totalInst}, ${paidInst}, ${escapeSql(startDate)}, '${status}');`
  );

  // استخراج ریزاقساط متصل به این وام
  const details = queryParmis(`
    SELECT Details_id, Details_date, Details_status, Details_amount, Details_transactionId_pay
    FROM InstDetails WHERE Details_instId = ${l.id}
  `);

  let instNum = 1;
  for (const d of details) {
    const instId = `inst_parmis_${d.Details_id}`;
    const amount = Math.round(Number(d.Details_amount || instAmount));
    const isPaid = d.Details_status === 1 ? 1 : 0;
    const dueDate = d.Details_date || startDate;
    const linkedTx = d.Details_transactionId_pay ? `'tx_parmis_${d.Details_transactionId_pay}'` : 'NULL';

    sqlStatements.push(
      `INSERT OR REPLACE INTO loan_installments (id, loan_id, installment_number, amount, due_date, is_paid, linked_transaction_id) VALUES ('${instId}', '${loanId}', ${instNum++}, ${amount}, ${escapeSql(dueDate)}, ${isPaid}, ${linkedTx});`
    );
  }
}
console.log(`✅ ${loans.length} وام و تسهیلات استخراج شد.`);

// ۶. تراکنش‌های مالی (Activity)
console.log('📦 ۵. استخراج تراکنش‌های مالی...');
const activities = queryParmis(`
  SELECT 
    Act_id as id,
    Act_amount as amount,
    Act_info as description,
    Act_date as date,
    Act_time as time,
    Act_accPay_id as payAccId,
    Act_accRecive_id as recAccId,
    Act_bankName as bankName,
    Act_memberName as memberName
  FROM Activity
`);

for (const act of activities) {
  const txId = `tx_parmis_${act.id}`;
  const amount = Math.round(Number(act.amount || 0));
  const shamsiDate = act.date;
  const time = act.time || '12:00:00';
  const txDate = `${shamsiDate} ${time}`;

  // تعیین نوع تراکنش بر اساس ساختار حسابی
  let txType = 'debit';
  let fromAccId: string | null = null;
  let toAccId: string | null = null;
  let catId: string | null = null;

  if (act.payAccId) {
    fromAccId = `acc_bank_${act.payAccId}`;
  }
  if (act.recAccId) {
    toAccId = `acc_bank_${act.recAccId}`;
  }

  if (fromAccId && toAccId) {
    txType = 'transfer';
  } else if (toAccId && !fromAccId) {
    txType = 'credit';
  } else {
    txType = 'debit';
  }

  sqlStatements.push(
    `INSERT OR REPLACE INTO transactions (id, user_id, type, amount, from_account_id, to_account_id, description, transaction_date, shamsi_date) VALUES ('${txId}', '${userId}', '${txType}', ${amount}, ${fromAccId ? escapeSql(fromAccId) : 'NULL'}, ${toAccId ? escapeSql(toAccId) : 'NULL'}, ${escapeSql(act.description)}, ${escapeSql(txDate)}, ${escapeSql(shamsiDate)});`
  );
}
console.log(`✅ ${activities.length} تراکنش مالی استخراج شد.`);

// ۷. آرشیو پیامک‌های خام (smsTable)
console.log('📦 ۶. استخراج آرشیو پیامک‌ها...');
const smsList = queryParmis(`
  SELECT 
    ID as id,
    Content as rawText,
    BankName as bankName,
    Amount as amount,
    Date as date,
    Time as time,
    TransactionId as txId
  FROM smsTable
`);

for (const s of smsList) {
  const smsHash = `sms_parmis_${s.id}`;
  const cleanAmount = s.amount ? Math.round(Number(String(s.amount).replace(/,/g, '')) || 0) : 0;
  const linkedTx = s.txId ? `'tx_parmis_${s.txId}'` : 'NULL';
  const recAt = s.date ? `${s.date} ${s.time || ''}`.trim() : null;

  sqlStatements.push(
    `INSERT OR REPLACE INTO raw_sms (id, sms_hash, user_id, raw_text, bank_name, parsed_amount, status, transaction_id, received_at) VALUES ('${smsHash}', '${smsHash}', '${userId}', ${escapeSql(s.rawText)}, ${escapeSql(s.bankName)}, ${cleanAmount}, 'processed', ${linkedTx}, ${escapeSql(recAt)});`
  );
}
console.log(`✅ ${smsList.length} پیامک خام استخراج شد.`);

// ذخیره در فایل SQL خروجی
fs.writeFileSync(OUTPUT_SQL_PATH, sqlStatements.join('\n'), 'utf8');
console.log(`\n🎉 عملیات با موفقیت انجام شد!`);
console.log(`📄 فایل SQL نهایی در مسیر زیر آماده است:`);
console.log(`   ${OUTPUT_SQL_PATH}`);
console.log(`📊 خلاصه رکوردهای آماده انتقال:`);
console.log(`   • ${bankAccounts.length} حساب بانکی`);
console.log(`   • ${persons.length} طرف‌حساب و شخص`);
console.log(`   • ${categories.length} سرفصل درختی`);
console.log(`   • ${loans.length} وام و تسهیلات`);
console.log(`   • ${activities.length} تراکنش مالی`);
console.log(`   • ${smsList.length} لاگ پیامک بانکی`);
