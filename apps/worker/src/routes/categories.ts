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
    'SELECT id, name, icon, color, type, is_income as isIncome FROM categories ORDER BY is_income ASC, name ASC'
  ).all();

  return c.json({
    success: true,
    data: (results.length > 0 ? results : DEFAULT_CATEGORIES).map((cat: any) => ({
      ...cat,
      isIncome: Boolean(cat.isIncome),
      type: cat.type || (cat.isIncome ? 'income' : 'expense'),
    })),
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
    type?: 'expense' | 'income' | 'transfer';
    isIncome?: boolean;
  }>();

  if (!body.name || body.name.trim().length === 0) {
    return c.json({ success: false, error: 'نام دسته‌بندی الزامی است' }, 400);
  }

  const id = `cat_${crypto.randomUUID().slice(0, 8)}`;
  const icon = body.icon || '🏷️';
  const color = body.color || '#6366f1';
  const type = body.type || (body.isIncome ? 'income' : 'expense');
  const isIncome = type === 'income' || body.isIncome ? 1 : 0;

  await c.env.DB.prepare(
    'INSERT INTO categories (id, name, icon, color, type, is_income) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(id, body.name.trim(), icon, color, type, isIncome)
    .run();

  return c.json(
    {
      success: true,
      data: { id, name: body.name.trim(), icon, color, type, isIncome: Boolean(isIncome) },
    },
    201
  );
});

/**
 * ویرایش دسته‌بندی
 */
categoriesRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    name?: string;
    icon?: string;
    color?: string;
    type?: 'expense' | 'income' | 'transfer';
    isIncome?: boolean;
  }>();

  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.name !== undefined) {
    updates.push('name = ?');
    params.push(body.name.trim());
  }
  if (body.icon !== undefined) {
    updates.push('icon = ?');
    params.push(body.icon);
  }
  if (body.color !== undefined) {
    updates.push('color = ?');
    params.push(body.color);
  }
  if (body.type !== undefined) {
    updates.push('type = ?');
    params.push(body.type);
    updates.push('is_income = ?');
    params.push(body.type === 'income' ? 1 : 0);
  } else if (body.isIncome !== undefined) {
    updates.push('is_income = ?');
    params.push(body.isIncome ? 1 : 0);
    updates.push('type = ?');
    params.push(body.isIncome ? 'income' : 'expense');
  }

  if (updates.length === 0) {
    return c.json({ success: false, error: 'هیچ مقداری برای تغییر ارسال نشده است' }, 400);
  }

  params.push(id);
  const query = `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`;
  const result = await c.env.DB.prepare(query).bind(...params).run();

  if (result.meta?.changes === 0) {
    return c.json({ success: false, error: 'دسته‌بندی پیدا نشد' }, 404);
  }

  return c.json({ success: true, message: 'دسته‌بندی با موفقیت بروزرسانی شد' });
});

/**
 * حذف دسته‌بندی (در صورت عدم استفاده)
 */
categoriesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  // بررسی عدم استفاده در تراکنش‌ها
  const txCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?')
    .bind(id)
    .first<{ count: number }>();

  if (txCount && txCount.count > 0) {
    return c.json({ success: false, error: 'این دسته‌بندی در تراکنش‌ها استفاده شده و قابل حذف نیست' }, 400);
  }

  await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();

  return c.json({ success: true, message: 'دسته‌بندی با موفقیت حذف شد' });
});
