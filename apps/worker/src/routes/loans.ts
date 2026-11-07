import { Hono } from 'hono';
import { Bindings, Variables } from '../types.js';

export const loansRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت وام‌ها و اقساط از جدول Installment پارمیس
 */
loansRouter.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT 
       Inst_id as id,
       Inst_title as title,
       Inst_amount as totalAmount,
       Inst_pay_count as totalInstallments,
       Inst_start_date as startDate,
       Inst_status as status
     FROM Installment
     ORDER BY Inst_id DESC`
  ).all<any>();

  const data = (results || []).map((row: any) => ({
    id: String(row.id),
    title: String(row.title || '').trim(),
    totalAmount: Math.round(Number(row.totalAmount || 0)),
    totalInstallments: Number(row.totalInstallments || 0),
    paidInstallments: 0,
    startDate: row.startDate,
    status: row.status === 1 ? 'active' : 'completed',
  }));

  return c.json({ success: true, data });
});
