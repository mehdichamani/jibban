import { Hono } from 'hono';
import { Bindings, Variables } from '../types.js';
import { computeFiscalBalancesMap, getActiveFiscalYear, getCurrentShamsiDateTime } from '../lib/parmis-core.js';

export const fiscalYearsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت لیست سال‌های مالی از جدول FiscalYear پارمیس
 */
fiscalYearsRouter.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT 
       f.fiscal_id as id,
       f.fiscal_name as name,
       f.fiscal_beginDate as beginDate,
       f.fiscal_endDate as endDate,
       f.fiscal_status as status,
       (SELECT COUNT(*) FROM Activity a WHERE a.Act_Fiscal_id = f.fiscal_id AND (a.Act_multiType != 2 OR a.Act_multiType IS NULL)) as txCount,
       (SELECT COUNT(*) FROM RemainedAccount r WHERE r.FiscalId = f.fiscal_id) as remainedCount
     FROM FiscalYear f
     ORDER BY f.fiscal_id DESC`
  ).all<any>();

  const data = (results || []).map((row: any) => ({
    id: String(row.id),
    name: String(row.name || '').replace(/'/g, '').trim(),
    beginDate: row.beginDate,
    endDate: row.endDate,
    status: row.status === 1 ? 'open' : 'closed',
    isActive: row.status === 1 ? 1 : 0,
    txCount: Number(row.txCount || 0),
    remainedCount: Number(row.remainedCount || 0),
  }));

  return c.json({ success: true, data });
});

/**
 * دریافت سال مالی فعال جاری
 */
fiscalYearsRouter.get('/active', async (c) => {
  const active = await getActiveFiscalYear(c.env.DB);
  return c.json({
    success: true,
    data: {
      id: String(active.id),
      name: active.name,
      beginDate: active.beginDate,
      endDate: active.endDate,
      status: active.status === 1 ? 'open' : 'closed',
      isActive: active.status === 1 ? 1 : 0,
    },
  });
});

/**
 * ایجاد سال مالی جدید
 */
fiscalYearsRouter.post('/', async (c) => {
  const body = await c.req.json<{
    name?: string;
    beginDate?: string;
    endDate?: string;
    activate?: boolean;
  }>();

  const { year } = getCurrentShamsiDateTime();
  const maxRow = await c.env.DB.prepare('SELECT MAX(fiscal_id) as maxId FROM FiscalYear').first<{ maxId: number }>();
  const nextId = (maxRow?.maxId || 0) + 1;

  const fyName = (body.name || String(year)).trim();
  const beginDate = body.beginDate || `${fyName}/01/01`;
  const endDate = body.endDate || `${fyName}/12/30`;
  const shouldActivate = body.activate !== false;

  if (shouldActivate) {
    await c.env.DB.prepare('UPDATE FiscalYear SET fiscal_status = 2 WHERE fiscal_status = 1').run();
  }

  await c.env.DB.prepare(
    `INSERT INTO FiscalYear (fiscal_id, fiscal_name, fiscal_beginDate, fiscal_endDate, fiscal_status)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(nextId, fyName, beginDate, endDate, shouldActivate ? 1 : 2).run();

  return c.json({
    success: true,
    data: {
      id: String(nextId),
      name: fyName,
      beginDate,
      endDate,
      status: shouldActivate ? 'open' : 'closed',
      isActive: shouldActivate ? 1 : 0,
    },
  }, 201);
});

/**
 * تغییر سال مالی فعال
 */
fiscalYearsRouter.post('/:id/activate', async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) return c.json({ success: false, error: 'شناسه سال مالی نامعتبر است' }, 400);

  const target = await c.env.DB.prepare('SELECT fiscal_id FROM FiscalYear WHERE fiscal_id = ?').bind(id).first();
  if (!target) return c.json({ success: false, error: 'سال مالی یافت نشد' }, 404);

  await c.env.DB.prepare('UPDATE FiscalYear SET fiscal_status = 2').run();
  await c.env.DB.prepare('UPDATE FiscalYear SET fiscal_status = 1 WHERE fiscal_id = ?').bind(id).run();

  return c.json({ success: true, message: 'سال مالی فعال تغییر کرد' });
});

/**
 * بستن سال مالی و انتقال مانده حساب‌های دائمی به سال مالی جدید (مشابه مکانیزم RemainedAccount پارمیس)
 */
fiscalYearsRouter.post('/:id/close', async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) return c.json({ success: false, error: 'شناسه سال مالی نامعتبر است' }, 400);

  const body = await c.req.json<{
    nextYearName?: string;
    nextBeginDate?: string;
    nextEndDate?: string;
  }>().catch(() => ({} as { nextYearName?: string; nextBeginDate?: string; nextEndDate?: string }));

  const closingYear = await c.env.DB.prepare('SELECT * FROM FiscalYear WHERE fiscal_id = ?')
    .bind(id)
    .first<any>();
  if (!closingYear) return c.json({ success: false, error: 'سال مالی یافت نشد' }, 404);

  // ۱. محاسبه مانده پایان دوره حساب‌ها (مانده اول دوره + گردش دوره) و ثبت مانده اول دوره در RemainedAccount
  const activeFy = await getActiveFiscalYear(c.env.DB);
  const balancesMap = await computeFiscalBalancesMap(c.env.DB, id, activeFy.id);

  const { results: allAccounts } = await c.env.DB.prepare(
    `WITH RECURSIVE hier(id, parent, root) AS (
       SELECT Ac_id, Ac_parent_id, Ac_id FROM accounts WHERE Ac_parent_id = 0
       UNION ALL
       SELECT a.Ac_id, a.Ac_parent_id, hier.root FROM accounts a JOIN hier ON a.Ac_parent_id = hier.id
     )
     SELECT a.Ac_id, COALESCE(a.Ac_balance, 0) as Ac_balance, COALESCE(hier.root, a.Ac_id) as rootId
     FROM accounts a
     LEFT JOIN hier ON a.Ac_id = hier.id`
  ).all<{ Ac_id: number; Ac_balance: number; rootId: number }>();

  const accountsList = allAccounts || [];
  await c.env.DB.prepare('DELETE FROM RemainedAccount WHERE FiscalId = ?').bind(id).run();

  const maxRem = await c.env.DB.prepare('SELECT MAX(id) as maxId FROM RemainedAccount').first<{ maxId: number }>();
  let nextRemId = (maxRem?.maxId || 0) + 1;

  const CHUNK = 25;
  for (let i = 0; i < accountsList.length; i += CHUNK) {
    const slice = accountsList.slice(i, i + CHUNK);
    await c.env.DB.batch(
      slice.map((acc) => {
        const remId = nextRemId++;
        const opening = balancesMap.get(acc.Ac_id)?.opening ?? acc.Ac_balance;
        return c.env.DB
          .prepare('INSERT INTO RemainedAccount (id, AccountId, FiscalId, remained) VALUES (?, ?, ?, ?)')
          .bind(remId, acc.Ac_id, id, opening);
      })
    );
  }

  // ۲. بستن سال مالی فعلی
  await c.env.DB.prepare('UPDATE FiscalYear SET fiscal_status = 2 WHERE fiscal_id = ?').bind(id).run();

  // ۳. انتقال مانده پایان دوره حساب‌های دائمی به Ac_balance سال جدید و صفر کردن حساب‌های موقت (۱: هزینه‌ها، ۲: درآمدها)
  for (let i = 0; i < accountsList.length; i += CHUNK) {
    const slice = accountsList.slice(i, i + CHUNK);
    await c.env.DB.batch(
      slice.map((acc) => {
        const isNominal = acc.rootId === 1 || acc.rootId === 2;
        const nextOpening = isNominal ? 0 : (balancesMap.get(acc.Ac_id)?.balance ?? acc.Ac_balance);
        return c.env.DB.prepare('UPDATE accounts SET Ac_balance = ? WHERE Ac_id = ?').bind(nextOpening, acc.Ac_id);
      })
    );
  }

  // ۴. ایجاد سال مالی جدید و فعال‌سازی آن
  const maxFiscal = await c.env.DB.prepare('SELECT MAX(fiscal_id) as maxId FROM FiscalYear').first<{ maxId: number }>();
  const newFiscalId = (maxFiscal?.maxId || id) + 1;

  const parsedOldYear = parseInt(String(closingYear.fiscal_name || '').replace(/[^\d]/g, ''), 10);
  const nextName = (body.nextYearName || (!isNaN(parsedOldYear) ? String(parsedOldYear + 1) : `دوره ${newFiscalId}`)).trim();
  const nextBeginDate = body.nextBeginDate || `${nextName}/01/01`;
  const nextEndDate = body.nextEndDate || `${nextName}/12/30`;

  await c.env.DB.prepare(
    `INSERT INTO FiscalYear (fiscal_id, fiscal_name, fiscal_beginDate, fiscal_endDate, fiscal_status)
     VALUES (?, ?, ?, ?, 1)`
  ).bind(newFiscalId, nextName, nextBeginDate, nextEndDate).run();

  return c.json({
    success: true,
    data: {
      closedFiscalId: String(id),
      newFiscalId: String(newFiscalId),
      newFiscalName: nextName,
      remainedAccountsCount: accountsList.length,
    },
  });
});

/**
 * مشاهده مانده انتقال‌یافته حساب‌ها در یک سال مالی
 */
fiscalYearsRouter.get('/:id/remained', async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) return c.json({ success: false, error: 'شناسه سال مالی نامعتبر است' }, 400);

  const { results } = await c.env.DB.prepare(
    `SELECT r.id, r.AccountId as accountId, r.FiscalId as fiscalId, r.remained, a.Ac_title as accountName
     FROM RemainedAccount r
     LEFT JOIN accounts a ON a.Ac_id = r.AccountId
     WHERE r.FiscalId = ? AND r.remained != 0
     ORDER BY ABS(r.remained) DESC`
  ).bind(id).all<any>();

  return c.json({ success: true, data: results || [] });
});
