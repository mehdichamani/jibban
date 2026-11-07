import { Hono } from 'hono';
import { Bindings, Variables } from '../types.js';

export const categoriesRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت سرفصل‌های درآمد و هزینه از درخت accounts پارمیس (ریشه‌های ۱ و ۲)
 */
categoriesRouter.get('/', async (c) => {
  const typeFilter = c.req.query('type'); // 'expense' | 'income'

  const query = `
    WITH RECURSIVE hier(id, parent, root) AS (
      SELECT Ac_id, Ac_parent_id, Ac_id FROM accounts WHERE Ac_parent_id IN (1, 2)
      UNION ALL
      SELECT a.Ac_id, a.Ac_parent_id, hier.root FROM accounts a JOIN hier ON a.Ac_parent_id = hier.id
    )
    SELECT 
      a.Ac_id as id,
      a.Ac_title as name,
      a.Ac_parent_id as parentId,
      hier.root as rootId
    FROM accounts a
    JOIN hier ON a.Ac_id = hier.id
    WHERE a.Ac_enable IS NULL OR a.Ac_enable = 1
    ORDER BY a.Ac_parent_id ASC, a.Ac_title ASC;
  `;

  const { results } = await c.env.DB.prepare(query).all<any>();

  const categories = (results || []).map((row: any) => {
    const isIncome = Number(row.rootId) === 2 || Number(row.parentId) === 2;
    const type = isIncome ? 'income' : 'expense';
    const isRootChild = row.parentId === 1 || row.parentId === 2;

    return {
      id: String(row.id),
      parentId: isRootChild ? null : String(row.parentId),
      name: String(row.name || '').trim(),
      type,
      icon: isIncome ? 'trending-up' : 'shopping-bag',
      color: isIncome ? '#22c55e' : '#ef4444',
      createdAt: new Date().toISOString(),
    };
  });

  if (typeFilter) {
    return c.json({
      success: true,
      data: categories.filter(c => c.type === typeFilter),
    });
  }

  return c.json({ success: true, data: categories });
});
