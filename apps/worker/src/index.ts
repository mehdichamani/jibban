import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Bindings, Variables } from './types.js';
import { authMiddleware } from './middleware/auth.js';
import { smsRouter } from './routes/sms.js';
import { transactionsRouter } from './routes/transactions.js';
import { groupsRouter } from './routes/groups.js';
import { categoriesRouter } from './routes/categories.js';
import { ensureInitialSeed } from './db/seed.js';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ۱. تنظیمات CORS برای دسترسی امن وب‌اپلیکیشن و اپلیکیشن اندروید
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Sync-Token'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
  })
);

// ۲. اعمال احراز هویت و استخراج کاربر از توکن همگام‌سازی
app.use('/api/*', authMiddleware);

// ۳. روت سلامت و وضعیت سیستم
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'jibban-worker',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// ۴. دریافت اطلاعات کاربر و وضعیت اتصال
app.get('/api/auth/me', async (c) => {
  const user = c.get('user');
  const userId = c.get('userId');

  if (user) {
    return c.json({ success: true, data: user });
  }

  return c.json({
    success: true,
    data: {
      id: userId,
      name: 'کاربر جاری جیب‌بان',
      syncToken: 'jibban_sync_demo_token_12345',
    },
  });
});

// ۵. اندپوینت راه‌اندازی اولیه و ساخت خودکار جداول در صورت لزوم
app.post('/api/init', async (c) => {
  try {
    await ensureInitialSeed(c.env.DB);
    return c.json({ success: true, message: 'پایگاه داده با موفقیت راه‌اندازی و سید شد' });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ۶. اتصال روترهای بخش‌های مختلف
app.route('/api/sms', smsRouter);
app.route('/api/transactions', transactionsRouter);
app.route('/api/groups', groupsRouter);
app.route('/api/categories', categoriesRouter);

// ۷. صفحه اصلی
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>سرویس ابری جیب‌بان (JibBan Worker)</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 2rem 3rem; border-radius: 1rem; border: 1px solid #334155; text-align: center; max-width: 480px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
        h1 { color: #38bdf8; margin-bottom: 0.5rem; font-size: 1.8rem; }
        p { color: #94a3b8; line-height: 1.6; }
        .badge { display: inline-block; background: #0284c7; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.85rem; font-weight: bold; margin-top: 1rem; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>جیب‌بان (JibBan)</h1>
        <p>بک‌اند ابری سرورلس Cloudflare Worker با دیتابیس D1، پارسر پیامک‌های بانکی ایران و هسته محاسبات دنگ فعال است.</p>
        <span class="badge">API v0.1.0 Ready</span>
      </div>
    </body>
    </html>
  `);
});

// ۸. مدیریت خطاهای سرور
app.onError((err, c) => {
  console.error('Unhandled Worker Error:', err);
  return c.json(
    {
      success: false,
      error: 'خطای داخلی سرور رخ داده است',
      details: err.message,
    },
    500
  );
});

export default app;
