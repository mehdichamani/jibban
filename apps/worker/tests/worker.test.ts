import { describe, it, expect, vi } from 'vitest';
import app from '../src/index.js';
import { Bindings } from '../src/types.js';

function createMockD1(): D1Database {
  const store = {
    transactions: [] as any[],
    groups: [
      { id: 'grp_home', name: 'خرج‌های مشترک خانه', currency: 'IRT', created_by: 'user_default' },
    ],
    group_members: [
      { group_id: 'grp_home', user_id: 'user_default', role: 'admin' },
      { group_id: 'grp_home', user_id: 'user_reza', role: 'member' },
    ],
    group_expenses: [] as any[],
    expense_splits: [] as any[],
    settlements: [] as any[],
    users: [
      { id: 'user_default', name: 'کاربر اصلی', sync_token: 'jibban_sync_demo_token_12345' },
      { id: 'user_reza', name: 'رضا', sync_token: 'token_reza' },
    ],
    categories: [] as any[],
  };

  return {
    prepare(query: string) {
      let boundParams: any[] = [];
      const stmt = {
        bind(...params: any[]) {
          boundParams = params;
          return stmt;
        },
        async first<T = unknown>(): Promise<T | null> {
          if (query.includes('FROM users WHERE sync_token = ?')) {
            const user = store.users.find((u) => u.sync_token === boundParams[0]);
            return (user as unknown as T) ?? null;
          }
          if (query.includes('FROM users LIMIT 1')) {
            return (store.users[0] as unknown as T) ?? null;
          }
          if (query.includes('SELECT COUNT(*) as count FROM categories')) {
            return { count: store.categories.length } as unknown as T;
          }
          if (query.includes('SELECT COUNT(*) as count FROM users')) {
            return { count: store.users.length } as unknown as T;
          }
          if (query.includes('FROM transactions WHERE id = ?')) {
            const tx = store.transactions.find((t) => t.id === boundParams[0]);
            return (tx as unknown as T) ?? null;
          }
          if (query.includes('FROM groups WHERE id = ?')) {
            const grp = store.groups.find((g) => g.id === boundParams[0]);
            return (grp as unknown as T) ?? null;
          }
          return null;
        },
        async all<T = unknown>(): Promise<{ results: T[] }> {
          if (query.includes('FROM group_members WHERE group_id = ?')) {
            const members = store.group_members.filter((m) => m.group_id === boundParams[0]);
            return { results: members as unknown as T[] };
          }
          if (query.includes('FROM group_members gm INNER JOIN users u')) {
            const users = store.users.filter((u) =>
              store.group_members.some((m) => m.group_id === boundParams[0] && m.user_id === u.id)
            );
            return { results: users as unknown as T[] };
          }
          if (query.includes('FROM transactions t')) {
            return { results: store.transactions as unknown as T[] };
          }
          if (query.includes('FROM categories')) {
            return { results: store.categories as unknown as T[] };
          }
          if (query.includes('FROM group_expenses e INNER JOIN expense_splits s')) {
            const results: any[] = [];
            for (const exp of store.group_expenses) {
              const splits = store.expense_splits.filter((s) => s.expense_id === exp.id);
              for (const sp of splits) {
                results.push({
                  id: exp.id,
                  payerId: exp.payer_id,
                  amount: exp.amount,
                  description: exp.description,
                  splitUserId: sp.user_id,
                  splitAmount: sp.owed_amount,
                });
              }
            }
            return { results: results as unknown as T[] };
          }
          if (query.includes('FROM settlements WHERE group_id = ?')) {
            const sets = store.settlements.filter((s) => s.group_id === boundParams[0]);
            return { results: sets as unknown as T[] };
          }
          return { results: [] };
        },
        async run(): Promise<{ success: boolean }> {
          if (query.startsWith('INSERT INTO transactions')) {
            store.transactions.push({
              id: boundParams[0],
              user_id: boundParams[1],
              bank_name: boundParams[2],
              account_number: boundParams[3],
              amount: boundParams[4],
              type: boundParams[5],
              balance: boundParams[6],
              category_id: boundParams[7],
              description: boundParams[8],
              raw_sms: boundParams[9],
              transaction_date: boundParams[10],
            });
          }
          if (query.startsWith('INSERT INTO group_expenses')) {
            store.group_expenses.push({
              id: boundParams[0],
              group_id: boundParams[1],
              payer_id: boundParams[2],
              amount: boundParams[3],
              description: boundParams[4],
              linked_transaction_id: boundParams[5],
              expense_date: boundParams[6],
            });
          }
          if (query.startsWith('INSERT INTO expense_splits')) {
            store.expense_splits.push({
              expense_id: boundParams[0],
              user_id: boundParams[1],
              owed_amount: boundParams[2],
            });
          }
          return { success: true };
        },
      };
      return stmt as any;
    },
    async batch(statements: any[]) {
      for (const st of statements) {
        await st.run();
      }
      return [];
    },
  } as unknown as D1Database;
}

describe('Worker API Endpoints (فاز ۳)', () => {
  const mockEnv: Bindings = {
    DB: createMockD1(),
    KV: {} as any,
  };

  it('بررسی روت سلامت (GET /api/health)', async () => {
    const res = await app.request('/api/health', {}, mockEnv);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe('ok');
    expect(body.service).toBe('jibban-worker');
  });

  it('پردازش و ذخیره پیامک بانکی با موتور sms-parser-ir (POST /api/sms/ingest)', async () => {
    const sms = `بانک ملی ایران
برداشت از حساب: 0105891234
مبلغ: 2,500,000 ریال
مانده: 14,200,000 ریال
1403/08/01 11:30
پایانه: فروشگاه کوروش`;

    const res = await app.request(
      '/api/sms/ingest',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawSms: sms }),
      },
      mockEnv
    );

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
    expect(data.isBankSms).toBe(true);
    expect(data.transaction.bankName).toBe('ملی');
    expect(data.transaction.amount).toBe(250000); // 2,500,000 ریال = 250,000 تومان
    expect(data.transaction.balance).toBe(1420000);
    expect(data.transaction.categoryId).toBe('cat_supermarket');
  });

  it('رد پیامک‌های غیربانکی و رمز پویا در روت ingest', async () => {
    const res = await app.request(
      '/api/sms/ingest',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawSms: 'کد تایید ورود شما به سامانه: 98124' }),
      },
      mockEnv
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(false);
    expect(data.isBankSms).toBe(false);
  });

  it('تبدیل آنی تراکنش بانکی به دنگ گروهی با موتور debt-engine (POST /api/transactions/:id/to-split)', async () => {
    // ابتدا تراکنش واریز یا برداشت ثبت شده
    const tx = (mockEnv.DB as any).prepare('').first();
    // فراخوانی روت to-split برای اولین تراکنش موجود
    const res = await app.request(
      '/api/transactions/tx_mock_1/to-split',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: 'grp_home',
          participantIds: ['user_default', 'user_reza'],
        }),
      },
      // تزریق تراکنش نمونه
      {
        ...mockEnv,
        DB: {
          ...mockEnv.DB,
          prepare(q: string) {
            if (q.includes('FROM transactions WHERE id = ?')) {
              return {
                bind: () => ({
                  first: async () => ({
                    id: 'tx_mock_1',
                    user_id: 'user_default',
                    amount: 60000,
                    description: 'خرید میوه',
                    bank_name: 'سامان',
                    transaction_date: '2024-10-30T10:00:00Z',
                  }),
                }),
              } as any;
            }
            return (mockEnv.DB as any).prepare(q);
          },
        } as any,
      }
    );

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
    expect(data.data.amount).toBe(60000);
    // تقسیم مساوی بین ۲ نفر: هر کدام ۳۰ هزار تومان
    expect(data.data.splits).toHaveLength(2);
    expect(data.data.splits[0].owedAmount).toBe(30000);
    expect(data.data.splits[1].owedAmount).toBe(30000);
  });

  it('محاسبه تراز و تسویه بهینه بدهی گروه (GET /api/groups/:id/settlements)', async () => {
    const res = await app.request('/api/groups/grp_home/settlements', {}, mockEnv);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
    expect(data.data.groupId).toBe('grp_home');
    expect(Array.isArray(data.data.settlements)).toBe(true);
  });
});
