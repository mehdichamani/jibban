import { Hono } from 'hono';
import { Bindings, Variables, Category } from '../types.js';
import { ensureInitialSeed } from '../db/seed.js';

export const categoriesRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت لیست دسته‌بندی‌های درختی یا فلت
 */
categoriesRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const type = c.req.query('type'); // 'expense' | 'income'
  const asTree = c.req.query('tree') === 'true';

  await ensureInitialSeed(c.env.DB);

  let query = `
    SELECT id, user_id as userId, parent_id as parentId, name, type, icon, color, created_at as createdAt
    FROM categories
    WHERE (user_id = ? OR user_id IS NULL)
  `;
  const params: unknown[] = [userId];

  if (type) {
    query += ` AND type = ?`;
    params.push(type);
  }

  query += ` ORDER BY parent_id IS NOT NULL ASC, name ASC`;

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  const allCategories = (results || []) as Array<{
    id: string;
    userId: string | null;
    parentId: string | null;
    name: string;
    type: 'expense' | 'income';
    icon?: string;
    color?: string;
    createdAt?: string;
  }>;

  if (asTree) {
    // ساختار درختی ۲ سطحی یا چند سطحی
    const categoryMap = new Map<string, any>();
    allCategories.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    const roots: any[] = [];
    categoryMap.forEach((cat) => {
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId).children.push(cat);
      } else {
        roots.push(cat);
      }
    });

    return c.json({ success: true, data: roots });
  }

  return c.json({ success: true, data: allCategories });
});

/**
 * ایجاد دسته‌بندی جدید
 */
categoriesRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    name: string;
    parentId?: string | null;
    type: 'expense' | 'income';
    icon?: string;
    color?: string;
  }>();

  if (!body.name || !body.name.trim()) {
    return c.json({ success: false, error: 'نام دسته‌بندی الزامی است' }, 400);
  }

  if (!body.type || (body.type !== 'expense' && body.type !== 'income')) {
    return c.json({ success: false, error: 'نوع دسته‌بندی باید expense یا income باشد' }, 400);
  }

  const id = `cat_${crypto.randomUUID().slice(0, 8)}`;
  const parentId = body.parentId || null;
  const icon = body.icon || (body.type === 'income' ? 'plus-circle' : 'tag');
  const color = body.color || (body.type === 'income' ? '#22c55e' : '#f59e0b');

  await c.env.DB.prepare(
    'INSERT INTO categories (id, user_id, parent_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(id, userId, parentId, body.name.trim(), body.type, icon, color)
    .run();

  return c.json(
    {
      success: true,
      data: { id, userId, parentId, name: body.name.trim(), type: body.type, icon, color },
    },
    201
  );
});

/**
 * ویرایش دسته‌بندی
 */
categoriesRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');
  const body = await c.req.json<{
    name?: string;
    parentId?: string | null;
    type?: 'expense' | 'income';
    icon?: string;
    color?: string;
  }>();

  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.name !== undefined) {
    updates.push('name = ?');
    params.push(body.name.trim());
  }
  if (body.parentId !== undefined) {
    updates.push('parent_id = ?');
    params.push(body.parentId);
  }
  if (body.type !== undefined) {
    updates.push('type = ?');
    params.push(body.type);
  }
  if (body.icon !== undefined) {
    updates.push('icon = ?');
    params.push(body.icon);
  }
  if (body.color !== undefined) {
    updates.push('color = ?');
    params.push(body.color);
  }

  if (updates.length === 0) {
    return c.json({ success: false, error: 'هیچ فیلدی برای ویرایش ارسال نشده است' }, 400);
  }

  params.push(id, userId);
  const query = `UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND (user_id = ? OR user_id IS NULL)`;
  const result = await c.env.DB.prepare(query).bind(...params).run();

  if (result.meta?.changes === 0) {
    return c.json({ success: false, error: 'دسته‌بندی پیدا نشد یا قابل ویرایش نیست' }, 404);
  }

  return c.json({ success: true, message: 'دسته‌بندی با موفقیت به‌روزرسانی شد' });
});

/**
 * حذف دسته‌بندی
 */
categoriesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');

  // بررسی زیرمجموعه‌ها
  const childCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?')
    .bind(id)
    .first<{ count: number }>();

  if (childCount && childCount.count > 0) {
    return c.json({ success: false, error: 'این دسته‌بندی دارای زیرمجموعه است و ابتدا باید زیرمجموعه‌های آن حذف یا جابه‌جا شوند' }, 400);
  }

  // بررسی عدم استفاده در تراکنش‌ها
  const txCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?')
    .bind(id)
    .first<{ count: number }>();

  if (txCount && txCount.count > 0) {
    return c.json({ success: false, error: 'این دسته‌بندی در تراکنش‌ها استفاده شده و قابل حذف نیست' }, 400);
  }

  await c.env.DB.prepare('DELETE FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)')
    .bind(id, userId)
    .run();

  return c.json({ success: true, message: 'دسته‌بندی با موفقیت حذف شد' });
});
