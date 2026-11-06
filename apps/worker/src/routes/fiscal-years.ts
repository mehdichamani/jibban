import { Hono } from 'hono';
import { Bindings, Variables, FiscalYear } from '../types.js';

export const fiscalYearsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت لیست دوره‌های مالی کاربر
 */
fiscalYearsRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM fiscal_years WHERE user_id = ? ORDER BY begin_date DESC'
  )
    .bind(userId)
    .all<FiscalYear>();

  return c.json({
    success: true,
    data: results || [],
  });
});

/**
 * دریافت دوره مالی فعال جاری
 */
fiscalYearsRouter.get('/active', async (c) => {
  const userId = c.get('userId');
  const activeFy = await c.env.DB.prepare(
    'SELECT * FROM fiscal_years WHERE user_id = ? AND is_active = 1 LIMIT 1'
  )
    .bind(userId)
    .first<FiscalYear>();

  return c.json({
    success: true,
    data: activeFy || null,
  });
});

/**
 * ثبت دوره مالی جدید
 */
fiscalYearsRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    name: string;
    beginDate: string;
    endDate: string;
    setActive?: boolean;
  }>();

  if (!body.name || !body.beginDate || !body.endDate) {
    return c.json({ success: false, error: 'نام دوره، تاریخ شروع و پایان الزامی است' }, 400);
  }

  const id = `fiscal_${body.name.replace(/[^0-9a-zA-Z_]/g, '')}`;
  const setActive = body.setActive ?? false;

  const statements: D1PreparedStatement[] = [];

  if (setActive) {
    statements.push(
      c.env.DB.prepare('UPDATE fiscal_years SET is_active = 0 WHERE user_id = ?').bind(userId)
    );
  }

  statements.push(
    c.env.DB.prepare(
      `INSERT INTO fiscal_years (id, user_id, name, begin_date, end_date, status, is_active)
       VALUES (?, ?, ?, ?, ?, 'open', ?)`
    ).bind(id, userId, body.name, body.beginDate, body.endDate, setActive ? 1 : 0)
  );

  await c.env.DB.batch(statements);

  return c.json({
    success: true,
    data: {
      id,
      name: body.name,
      beginDate: body.beginDate,
      endDate: body.endDate,
      status: 'open',
      isActive: setActive ? 1 : 0,
    },
  }, 201);
});

/**
 * تغییر دوره مالی فعال
 */
fiscalYearsRouter.post('/:id/set-active', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');

  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE fiscal_years SET is_active = 0 WHERE user_id = ?').bind(userId),
    c.env.DB.prepare('UPDATE fiscal_years SET is_active = 1 WHERE id = ? AND user_id = ?').bind(id, userId),
  ]);

  return c.json({ success: true, message: 'دوره مالی فعال با موفقیت تغییر یافت' });
});
