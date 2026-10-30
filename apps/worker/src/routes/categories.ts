import { Hono } from 'hono';
import { Bindings, Variables } from '../types.js';
import { DEFAULT_CATEGORIES, ensureInitialSeed } from '../db/seed.js';

export const categoriesRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت لیست دسته‌بندی‌های دخل و خرج
 */
categoriesRouter.get('/', async (c) => {
  // اطمینان از وجود دسته‌بندی‌های اولیه
  await ensureInitialSeed(c.env.DB);

  const { results } = await c.env.DB.prepare(
    'SELECT id, name, icon, color, is_income as isIncome FROM categories ORDER BY is_income ASC, name ASC'
  ).all();

  return c.json({
    success: true,
    data: results.length > 0 ? results : DEFAULT_CATEGORIES,
  });
});

/**
 * ایجاد دسته‌بندی جدید
 */
categoriesRouter.post('/', async (c) => {
  const body = await c.req.json<{
    name: string;
    icon?: string;
    color?: string;
    isIncome?: boolean;
  }>();

  if (!body.name || body.name.trim().length === 0) {
    return c.json({ success: false, error: 'نام دسته‌بندی الزامی است' }, 400);
  }

  const id = `cat_${crypto.randomUUID().slice(0, 8)}`;
  const icon = body.icon || '🏷️';
  const color = body.color || '#6366f1';
  const isIncome = body.isIncome ? 1 : 0;

  await c.env.DB.prepare(
    'INSERT INTO categories (id, name, icon, color, is_income) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(id, body.name.trim(), icon, color, isIncome)
    .run();

  return c.json(
    {
      success: true,
      data: { id, name: body.name.trim(), icon, color, isIncome: Boolean(isIncome) },
    },
    201
  );
});
