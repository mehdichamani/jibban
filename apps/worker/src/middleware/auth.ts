import { Context, Next } from 'hono';
import { Bindings, Variables } from '../types.js';

/**
 * اعتبارسنجی توکن اتصال اختصاصی (Sync Token) اپلیکیشن اندروید و وب‌اپلیکیشن
 */
export async function authMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) {
  const syncToken =
    c.req.header('X-Sync-Token') ||
    c.req.header('Authorization')?.replace('Bearer ', '') ||
    c.req.query('syncToken');

  // اگر توکنی ارسال شده بود، کاربر متناظر را از دیتابیس D1 می‌خوانیم
  if (syncToken) {
    const user = await c.env.DB.prepare(
      'SELECT id, name, sync_token as syncToken FROM users WHERE sync_token = ?'
    )
      .bind(syncToken)
      .first<{ id: string; name: string; syncToken: string }>();

    if (user) {
      c.set('userId', user.id);
      c.set('user', user);
      await next();
      return;
    }
  }

  // در صورت عدم ارسال یا برای راحتی محیط توسعه/تست، اولین کاربر موجود را به عنوان کاربر جاری در نظر می‌گیریم
  const defaultUser = await c.env.DB.prepare(
    'SELECT id, name, sync_token as syncToken FROM users LIMIT 1'
  ).first<{ id: string; name: string; syncToken: string }>();

  if (defaultUser) {
    c.set('userId', defaultUser.id);
    c.set('user', defaultUser);
    await next();
    return;
  }

  // اگر هنوز هیچ کاربری ایجاد نشده باشد
  c.set('userId', 'user_default');
  await next();
}
