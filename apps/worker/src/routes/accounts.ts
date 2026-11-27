import { Hono } from 'hono';
import { Bindings, Variables } from '../types.js';
import { computeFiscalBalancesMap, getActiveFiscalYear } from '../lib/parmis-core.js';

export const accountsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * تعیین نوع حساب بر اساس ریشه درختی پارمیس
 */
function resolveAccountType(rootId: number): 'expense' | 'income' | 'wallet' | 'bank' | 'debt' | 'savings' {
  switch (rootId) {
    case 1:
      return 'expense';
    case 2:
      return 'income';
    case 3:
      return 'wallet';
    case 4:
      return 'bank';
    case 5:
    case 8:
    case 161:
      return 'debt';
    case 7:
    case 162:
      return 'savings';
    default:
      return 'bank';
  }
}

/**
 * نقشه رنگ و آیکون برای انواع حساب
 */
function resolveAccountStyling(type: string, rootId: number) {
  switch (rootId) {
    case 1:
      return { color: '#ef4444', icon: 'shopping-bag' };
    case 2:
      return { color: '#22c55e', icon: 'trending-up' };
    case 3:
      return { color: '#f59e0b', icon: 'wallet' };
    case 4:
      return { color: '#0284c7', icon: 'credit-card' };
    case 161:
      return { color: '#8b5cf6', icon: 'users' };
    case 7:
    case 162:
      return { color: '#10b981', icon: 'piggy-bank' };
    case 8:
      return { color: '#ec4899', icon: 'alert-circle' };
    default:
      return { color: '#64748b', icon: 'folder' };
  }
}

/**
 * دریافت لیست تمام حساب‌های کاربر مستقیماً از جدول بومی پارمیس (accounts)
 */
accountsRouter.get('/', async (c) => {
  const typeFilter = c.req.query('type');
  const fiscalYearParam = c.req.query('fiscalYearId');
  const activeFy = await getActiveFiscalYear(c.env.DB);
  const targetFyId = fiscalYearParam ? Number(fiscalYearParam) : activeFy.id;
  const balancesMap = await computeFiscalBalancesMap(c.env.DB, targetFyId, activeFy.id);

  // کوئری CTE برای استخراج حساب‌ها به همراه root_id ریشه
  const query = `
    WITH RECURSIVE hier(id, parent, root) AS (
      SELECT Ac_id, Ac_parent_id, Ac_id FROM accounts WHERE Ac_parent_id = 0
      UNION ALL
      SELECT a.Ac_id, a.Ac_parent_id, hier.root FROM accounts a JOIN hier ON a.Ac_parent_id = hier.id
    )
    SELECT 
      a.Ac_id as id,
      a.Ac_title as name,
      a.Ac_parent_id as parentId,
      a.Ac_balance as balance,
      a.Ac_info as info,
      a.ac_icon as rawIcon,
      a.Ac_enable as enable,
      hier.root as rootId,
      b.BAc_cart_number as cardNumber,
      b.BAc_account_cod as accountNumber,
      b.BAc_sheba as sheba,
      k.Bank_name as bankName
    FROM accounts a
    LEFT JOIN hier ON a.Ac_id = hier.id
    LEFT JOIN BankAccounts b ON a.Ac_id = b.BAc_ac_id
    LEFT JOIN Bank k ON b.BAc_bank_id = k.id
    ORDER BY a.Ac_parent_id ASC, a.Ac_id ASC;
  `;

  const { results } = await c.env.DB.prepare(query).all();

  const accounts = (results || []).map((row: any) => {
    const rootId = Number(row.rootId || row.id);
    const type = resolveAccountType(rootId);
    const styling = resolveAccountStyling(type, rootId);
    const computed = balancesMap.get(Number(row.id));

    return {
      id: String(row.id),
      userId: 'user_default',
      parentId: row.parentId === 0 ? null : String(row.parentId),
      name: String(row.name || '').trim(),
      type,
      rootId,
      bankName: row.bankName || (type === 'bank' ? 'بانک' : undefined),
      accountNumber: row.accountNumber ? String(row.accountNumber).replace(/'/g, '') : undefined,
      cardNumber: row.cardNumber || undefined,
      sheba: row.sheba ? String(row.sheba).replace(/'/g, '') : undefined,
      balance: computed ? computed.balance : Math.round(Number(row.balance || 0)),
      initialBalance: computed ? computed.opening : Math.round(Number(row.balance || 0)),
      color: styling.color,
      icon: styling.icon,
      isArchived: row.enable === 0,
      createdAt: new Date().toISOString(),
    };
  });

  if (typeFilter) {
    const filtered = accounts.filter(acc => acc.type === typeFilter);
    return c.json({ success: true, data: filtered });
  }

  return c.json({ success: true, data: accounts });
});

/**
 * دریافت اطلاعات یک حساب به همراه مانده و آمار گردش
 */
accountsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    return c.json({ success: false, error: 'شناسه نامعتبر حساب' }, 400);
  }

  const row = await c.env.DB.prepare(
    `SELECT 
       a.Ac_id as id, a.Ac_title as name, a.Ac_parent_id as parentId,
       a.Ac_balance as balance, a.Ac_info as info, a.Ac_enable as enable,
       b.BAc_cart_number as cardNumber, b.BAc_account_cod as accountNumber,
       b.BAc_sheba as sheba, k.Bank_name as bankName
     FROM accounts a
     LEFT JOIN BankAccounts b ON a.Ac_id = b.BAc_ac_id
     LEFT JOIN Bank k ON b.BAc_bank_id = k.id
     WHERE a.Ac_id = ?`
  ).bind(numId).first<any>();

  if (!row) {
    return c.json({ success: false, error: 'حساب یافت نشد' }, 404);
  }

  // گردش حساب در Activity
  const activeFy = await getActiveFiscalYear(c.env.DB);
  const fiscalYearParam = c.req.query('fiscalYearId');
  const targetFyId = fiscalYearParam ? Number(fiscalYearParam) : activeFy.id;
  const balancesMap = await computeFiscalBalancesMap(c.env.DB, targetFyId, activeFy.id);
  const computed = balancesMap.get(numId);

  const txStats = await c.env.DB.prepare(
    `SELECT COUNT(*) as txCount
     FROM Activity
     WHERE Act_Fiscal_id = ?
       AND (Act_accRecive_id = ? OR Act_rec_Subacc_id = ? OR Act_rec_Root_id = ?
            OR Act_accPay_id = ? OR Act_pay_Subacc_id = ? OR Act_pay_Root_id = ?)`
  ).bind(targetFyId, numId, numId, numId, numId, numId, numId).first<any>();

  return c.json({
    success: true,
    data: {
      id: String(row.id),
      name: String(row.name || '').trim(),
      parentId: row.parentId === 0 ? null : String(row.parentId),
      balance: computed ? computed.balance : Math.round(Number(row.balance || 0)),
      openingBalance: computed ? computed.opening : Math.round(Number(row.balance || 0)),
      bankName: row.bankName,
      accountNumber: row.accountNumber ? String(row.accountNumber).replace(/'/g, '') : undefined,
      cardNumber: row.cardNumber,
      sheba: row.sheba ? String(row.sheba).replace(/'/g, '') : undefined,
      txCount: Number(txStats?.txCount || 0),
      totalWithdraw: computed ? computed.recOut : 0,
      totalDeposit: computed ? computed.payIn : 0,
    },
  });
});

/**
 * ایجاد حساب جدید در درخت پارمیس
 */
accountsRouter.post('/', async (c) => {
  const body = await c.req.json<{
    name: string;
    type?: string;
    parentId?: string | number | null;
    balance?: number;
    initialBalance?: number;
    bankName?: string;
    accountNumber?: string;
    cardNumber?: string;
    sheba?: string;
  }>();

  if (!body.name || !body.name.trim()) {
    return c.json({ success: false, error: 'نام حساب الزامی است' }, 400);
  }

  let parentId = 0;
  if (body.parentId) {
    parentId = Number(body.parentId) || 0;
  } else {
    // ریشه‌های پیش‌فرض بر اساس نوع
    if (body.type === 'expense') parentId = 1;
    else if (body.type === 'income') parentId = 2;
    else if (body.type === 'wallet') parentId = 3;
    else if (body.type === 'debt') parentId = 161;
    else parentId = 4; // bank
  }

  // پیدا کردن بزرگترین Ac_id جاری
  const maxRow = await c.env.DB.prepare('SELECT MAX(Ac_id) as maxId FROM accounts').first<{ maxId: number }>();
  const nextId = (maxRow?.maxId || 350) + 1;
  const balance = Math.round(body.balance ?? body.initialBalance ?? 0);

  await c.env.DB.prepare(
    `INSERT INTO accounts (
      Ac_id, Ac_title, Ac_parent_id, Ac_balance, Ac_enable, Ac_isLeaf, Ac_isSystematic
    ) VALUES (?, ?, ?, ?, 1, 1, 0)`
  ).bind(nextId, body.name.trim(), parentId, balance).run();

  // اگر حساب بانکی است، در BankAccounts هم ثبت شود
  if (body.accountNumber || body.cardNumber || body.sheba) {
    const maxBankRow = await c.env.DB.prepare('SELECT MAX(BAc_id) as maxBId FROM BankAccounts').first<{ maxBId: number }>();
    const nextBankId = (maxBankRow?.maxBId || 10) + 1;

    await c.env.DB.prepare(
      `INSERT INTO BankAccounts (
        BAc_id, BAc_ac_id, BAc_cart_number, BAc_account_cod, BAc_sheba, BAc_isenable
      ) VALUES (?, ?, ?, ?, ?, 1)`
    ).bind(
      nextBankId,
      nextId,
      body.cardNumber || '',
      body.accountNumber || '',
      body.sheba || ''
    ).run();
  }

  return c.json({
    success: true,
    data: {
      id: String(nextId),
      name: body.name.trim(),
      parentId: parentId === 0 ? null : String(parentId),
      balance,
    },
  }, 201);
});

/**
 * ویرایش مشخصات حساب
 */
accountsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return c.json({ success: false, error: 'شناسه نامعتبر' }, 400);

  const body = await c.req.json<{
    name?: string;
    parentId?: string | number | null;
    balance?: number;
    cardNumber?: string;
    accountNumber?: string;
    sheba?: string;
  }>();

  if (body.name !== undefined) {
    await c.env.DB.prepare('UPDATE accounts SET Ac_title = ? WHERE Ac_id = ?').bind(body.name.trim(), numId).run();
  }
  if (body.parentId !== undefined) {
    const pId = body.parentId === null ? 0 : Number(body.parentId);
    await c.env.DB.prepare('UPDATE accounts SET Ac_parent_id = ? WHERE Ac_id = ?').bind(pId, numId).run();
  }
  if (body.balance !== undefined) {
    await c.env.DB.prepare('UPDATE accounts SET Ac_balance = ? WHERE Ac_id = ?').bind(body.balance, numId).run();
  }

  if (body.cardNumber !== undefined || body.accountNumber !== undefined || body.sheba !== undefined) {
    const existing = await c.env.DB.prepare('SELECT BAc_id FROM BankAccounts WHERE BAc_ac_id = ?').bind(numId).first();
    if (existing) {
      await c.env.DB.prepare(
        `UPDATE BankAccounts 
         SET BAc_cart_number = COALESCE(?, BAc_cart_number),
             BAc_account_cod = COALESCE(?, BAc_account_cod),
             BAc_sheba = COALESCE(?, BAc_sheba)
         WHERE BAc_ac_id = ?`
      ).bind(body.cardNumber ?? null, body.accountNumber ?? null, body.sheba ?? null, numId).run();
    }
  }

  return c.json({ success: true, message: 'حساب به‌روزرسانی شد' });
});

/**
 * حذف حساب
 */
accountsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return c.json({ success: false, error: 'شناسه نامعتبر' }, 400);

  // بررسی داشتن زیرمجموعه
  const child = await c.env.DB.prepare('SELECT COUNT(*) as count FROM accounts WHERE Ac_parent_id = ?').bind(numId).first<{ count: number }>();
  if (child && child.count > 0) {
    return c.json({ success: false, error: 'حسابی که زیرمجموعه دارد را نمی‌توان حذف کرد' }, 400);
  }

  // بررسی داشتن تراکنش
  const tx = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM Activity WHERE Act_accPay_id = ? OR Act_accRecive_id = ? OR Act_pay_Subacc_id = ? OR Act_rec_Subacc_id = ?'
  ).bind(numId, numId, numId, numId).first<{ count: number }>();

  if (tx && tx.count > 0) {
    // غیرفعال کردن به جای حذف
    await c.env.DB.prepare('UPDATE accounts SET Ac_enable = 0 WHERE Ac_id = ?').bind(numId).run();
    return c.json({ success: true, message: 'حساب به دلیل داشتن گردش غیرفعال شد' });
  }

  await c.env.DB.prepare('DELETE FROM BankAccounts WHERE BAc_ac_id = ?').bind(numId).run();
  await c.env.DB.prepare('DELETE FROM accounts WHERE Ac_id = ?').bind(numId).run();

  return c.json({ success: true, message: 'حساب با موفقیت حذف شد' });
});
