import { PARMIS_SEED_ACCOUNTS, PARMIS_SEED_BANKS } from './parmis-seed-data.js';
import { getCurrentShamsiDateTime } from '../lib/parmis-core.js';

/**
 * مقداردهی اولیه پایگاه داده بومی پارمیس برای کارکرد روان با دیتابیس سفید (Cold Start)
 */
export async function ensureInitialSeed(db: D1Database): Promise<void> {
  const defaultUserId = 'user_default';
  const defaultSyncToken = 'jibban_sync_demo_token_12345';

  // ۱. بررسی کاربر پیش‌فرض
  const user = await db
    .prepare('SELECT id FROM users WHERE id = ?')
    .bind(defaultUserId)
    .first<{ id: string }>();

  if (!user) {
    await db
      .prepare('INSERT OR IGNORE INTO users (id, name, email_or_phone, sync_token) VALUES (?, ?, ?, ?)')
      .bind(defaultUserId, 'کاربر اصلی جیب‌بان', 'user@jibban.local', defaultSyncToken)
      .run();
  }

  // ۲. بررسی و سید سال مالی فعال بر اساس سال شمسی جاری
  const fiscalCount = await db
    .prepare('SELECT COUNT(*) as count FROM FiscalYear')
    .first<{ count: number }>();

  if (!fiscalCount || fiscalCount.count === 0) {
    const { year } = getCurrentShamsiDateTime();
    await db
      .prepare(
        `INSERT OR IGNORE INTO FiscalYear (
          fiscal_id, fiscal_name, fiscal_beginDate, fiscal_endDate, fiscal_status
        ) VALUES (1, ?, ?, ?, 1)`
      )
      .bind(String(year), `${year}/01/01`, `${year}/12/30`)
      .run();
  }

  // ۳. بررسی و سید بانک‌های ایران (۵۱ بانک پارمیس)
  const bankCount = await db
    .prepare('SELECT COUNT(*) as count FROM Bank')
    .first<{ count: number }>();

  if (!bankCount || bankCount.count === 0) {
    const CHUNK = 25;
    for (let i = 0; i < PARMIS_SEED_BANKS.length; i += CHUNK) {
      const slice = PARMIS_SEED_BANKS.slice(i, i + CHUNK);
      await db.batch(
        slice.map((b) =>
          db
            .prepare('INSERT OR IGNORE INTO Bank (id, Bank_name, systematic, imageName) VALUES (?, ?, ?, ?)')
            .bind(b.id, b.Bank_name, b.systematic, b.imageName)
        )
      );
    }
  }

  // ۴. بررسی و سید درخت حساب‌های پایه پارمیس (۱۶۵ حساب کل و معین)
  const accCount = await db
    .prepare('SELECT COUNT(*) as count FROM accounts')
    .first<{ count: number }>();

  if (!accCount || accCount.count === 0) {
    const CHUNK = 25;
    for (let i = 0; i < PARMIS_SEED_ACCOUNTS.length; i += CHUNK) {
      const slice = PARMIS_SEED_ACCOUNTS.slice(i, i + CHUNK);
      await db.batch(
        slice.map((a) =>
          db
            .prepare(
              `INSERT OR IGNORE INTO accounts (
                Ac_id, Ac_parent_id, Ac_title, Ac_balance, Ac_isLeaf, Ac_isSystematic,
                Ac_payable, Ac_recivable, Ac_enable, ac_icon
              ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              a.Ac_id,
              a.Ac_parent_id,
              a.Ac_title,
              a.Ac_isLeaf ?? 1,
              a.Ac_isSystematic ?? 0,
              a.Ac_payable ?? 1,
              a.Ac_recivable ?? 1,
              a.Ac_enable ?? 1,
              a.ac_icon ?? 'defaultpic'
            )
        )
      );
    }
  }
}
