import { Context, Next } from 'hono';
import { Bindings, Variables } from '../types.js';

/**
 * میان‌افزار مدیریت کاربر برای محیط پارمیس تک‌کاربره
 */
export async function authMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) {
  // در فایل پارمیس جدول Users حاوی Usr_id, Usr_name است
  try {
    const userRow = await c.env.DB.prepare(
      'SELECT Usr_id as id, Usr_name as name FROM Users LIMIT 1'
    ).first<{ id: number; name: string }>();

    if (userRow) {
      c.set('userId', String(userRow.id));
      c.set('user', {
        id: String(userRow.id),
        name: userRow.name || 'کاربر اصلی',
        syncToken: 'jibban_sync_demo_token_12345',
      });
      await next();
      return;
    }
  } catch (e) {
    // در صورت بروز خطا به حالت پیش‌فرض برمی‌گردد
  }

  c.set('userId', '1');
  c.set('user', {
    id: '1',
    name: 'مهدی چمنی',
    syncToken: 'jibban_sync_demo_token_12345',
  });
  await next();
}
