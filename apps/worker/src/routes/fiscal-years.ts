import { Hono } from 'hono';
import { Bindings, Variables } from '../types.js';

export const fiscalYearsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت لیست سال‌های مالی از جدول FiscalYear پارمیس
 */
fiscalYearsRouter.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT 
       fiscal_id as id,
       fiscal_name as name,
       fiscal_beginDate as beginDate,
       fiscal_endDate as endDate,
       fiscal_status as status
     FROM FiscalYear
     ORDER BY fiscal_id DESC`
  ).all<any>();

  const data = (results || []).map((row: any) => ({
    id: String(row.id),
    name: String(row.name || '').replace(/'/g, '').trim(),
    beginDate: row.beginDate,
    endDate: row.endDate,
    status: row.status === 1 ? 'open' : 'closed',
    isActive: row.status === 1 ? 1 : 0,
  }));

  return c.json({ success: true, data });
});
