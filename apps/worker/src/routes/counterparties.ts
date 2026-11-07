import { Hono } from 'hono';
import { Bindings, Variables } from '../types.js';

export const counterpartiesRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت لیست طرف‌حساب‌ها و اشخاص از ریشه ۱۶۱ accounts پارمیس
 */
counterpartiesRouter.get('/', async (c) => {
  const query = `
    WITH RECURSIVE hier(id, parent) AS (
      SELECT Ac_id, Ac_parent_id FROM accounts WHERE Ac_parent_id = 161
      UNION ALL
      SELECT a.Ac_id, a.Ac_parent_id FROM accounts a JOIN hier ON a.Ac_parent_id = hier.id
    )
    SELECT 
      a.Ac_id as id,
      a.Ac_title as name,
      a.Ac_balance as balance,
      a.Ac_info as notes
    FROM accounts a
    JOIN hier ON a.Ac_id = hier.id
    WHERE a.Ac_enable IS NULL OR a.Ac_enable = 1
    ORDER BY a.Ac_title ASC;
  `;

  const { results } = await c.env.DB.prepare(query).all<any>();

  const data = (results || []).map((row: any) => ({
    id: String(row.id),
    name: String(row.name || '').trim(),
    balance: Math.round(Number(row.balance || 0)),
    notes: row.notes || undefined,
  }));

  return c.json({ success: true, data });
});
