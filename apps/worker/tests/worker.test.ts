import { describe, it, expect } from 'vitest';
import app from '../src/index.js';
import { Bindings } from '../src/types.js';

function createParmisMockD1(): D1Database {
  const store = {
    users: [{ id: 'user_default', name: 'کاربر اصلی', sync_token: 'jibban_sync_demo_token_12345' }],
    FiscalYear: [
      { fiscal_id: 1, fiscal_name: '1405', fiscal_beginDate: '1405/01/01', fiscal_endDate: '1405/12/29', fiscal_status: 1 },
    ],
    Bank: [{ id: 1, Bank_name: 'بلوبانک', systematic: 1, imageName: 'blu' }],
    accounts: [
      { Ac_id: 1, Ac_parent_id: 0, Ac_title: 'هزینه ها', Ac_balance: 0, Ac_enable: 1 },
      { Ac_id: 2, Ac_parent_id: 0, Ac_title: 'درآمد ها', Ac_balance: 0, Ac_enable: 1 },
      { Ac_id: 4, Ac_parent_id: 0, Ac_title: 'بانک ها', Ac_balance: 10000000, Ac_enable: 1 },
      { Ac_id: 12, Ac_parent_id: 1, Ac_title: 'خوراک و مواد غذایی', Ac_balance: 0, Ac_enable: 1 },
      { Ac_id: 51, Ac_parent_id: 12, Ac_title: 'سوپرمارکت', Ac_balance: 0, Ac_enable: 1 },
      { Ac_id: 36, Ac_parent_id: 2, Ac_title: 'حقوق و دستمزد', Ac_balance: 0, Ac_enable: 1 },
      { Ac_id: 173, Ac_parent_id: 4, Ac_title: 'بلوبانک', Ac_balance: 10000000, Ac_enable: 1 },
    ],
    BankAccounts: [
      { BAc_id: 1, BAc_bank_id: 1, BAc_ac_id: 173, BAc_account_cod: '123456', BAc_cart_number: '6219861912345678', BAc_sheba: '', BAc_isenable: 1, read_sms: 1 },
    ],
    RemainedAccount: [] as any[],
    Activity: [] as any[],
    MultiActivity: [] as any[],
    Pattern: [] as any[],
    smsTable: [] as any[],
    UnregisteredBankSms: [] as any[],
  };

  let smsSeq = 1;

  const execQuery = (query: string, boundParams: any[]) => {
    const q = query.replace(/\s+/g, ' ').trim();

    const first = async <T = unknown>(): Promise<T | null> => {
      if (q.includes('FROM users WHERE sync_token = ?')) {
        return (store.users.find((u) => u.sync_token === boundParams[0]) as unknown as T) ?? null;
      }
      if (q.includes('FROM users LIMIT 1')) {
        return (store.users[0] as unknown as T) ?? null;
      }
      if (q.includes('FROM FiscalYear WHERE fiscal_status = 1')) {
        const fy = store.FiscalYear.find((f) => f.fiscal_status === 1);
        return (fy ? { id: fy.fiscal_id, name: fy.fiscal_name, beginDate: fy.fiscal_beginDate, endDate: fy.fiscal_endDate, status: fy.fiscal_status } : null) as unknown as T;
      }
      if (q.includes('SELECT MAX(fiscal_id) as maxId FROM FiscalYear')) {
        const maxId = store.FiscalYear.reduce((m, f) => Math.max(m, f.fiscal_id), 0);
        return { maxId } as unknown as T;
      }
      if (q.includes('SELECT * FROM FiscalYear WHERE fiscal_id = ?')) {
        return (store.FiscalYear.find((f) => f.fiscal_id === boundParams[0]) as unknown as T) ?? null;
      }
      if (q.includes('SELECT MAX(Act_id) as maxId FROM Activity')) {
        const maxId = store.Activity.reduce((m, a) => Math.max(m, a.Act_id), 0);
        return { maxId } as unknown as T;
      }
      if (q.includes('SELECT MAX(MultiId) as maxMId FROM MultiActivity')) {
        const maxMId = store.MultiActivity.reduce((m, a) => Math.max(m, a.MultiId), 0);
        return { maxMId } as unknown as T;
      }
      if (q.includes('SELECT MAX(id) as maxId FROM RemainedAccount')) {
        const maxId = store.RemainedAccount.reduce((m, a) => Math.max(m, a.id), 0);
        return { maxId } as unknown as T;
      }
      if (q.includes('SELECT MAX(pat_id) as maxId FROM Pattern')) {
        const maxId = store.Pattern.reduce((m, p) => Math.max(m, p.pat_id), 0);
        return { maxId } as unknown as T;
      }
      if (q.includes('SELECT Ac_id, Ac_parent_id FROM accounts WHERE Ac_id = ?')) {
        return (store.accounts.find((a) => a.Ac_id === boundParams[0]) as unknown as T) ?? null;
      }
      if (q.includes('SELECT Ac_parent_id FROM accounts WHERE Ac_id = ?')) {
        return (store.accounts.find((a) => a.Ac_id === boundParams[0]) as unknown as T) ?? null;
      }
      if (q.includes('SELECT Ac_title FROM accounts WHERE Ac_id = ?')) {
        return (store.accounts.find((a) => a.Ac_id === boundParams[0]) as unknown as T) ?? null;
      }
      if (q.includes('SELECT * FROM Activity WHERE Act_id = ?')) {
        return (store.Activity.find((a) => a.Act_id === boundParams[0]) as unknown as T) ?? null;
      }
      if (q.includes('SELECT ID, TransactionId FROM smsTable WHERE Content = ?')) {
        return (store.smsTable.find((s) => s.Content === boundParams[0]) as unknown as T) ?? null;
      }
      if (q.includes('SELECT * FROM smsTable WHERE ID = ?')) {
        return (store.smsTable.find((s) => s.ID === boundParams[0]) as unknown as T) ?? null;
      }
      if (q.includes('FROM BankAccounts b INNER JOIN accounts a')) {
        const b = store.BankAccounts[0];
        const a = store.accounts.find((acc) => acc.Ac_id === b?.BAc_ac_id);
        return (b && a ? { accountId: a.Ac_id, accountName: a.Ac_title } : null) as unknown as T;
      }
      if (q.includes('FROM BankAccounts b INNER JOIN Bank k')) {
        const b = store.BankAccounts[0];
        const a = store.accounts.find((acc) => acc.Ac_id === b?.BAc_ac_id);
        return (b && a ? { accountId: a.Ac_id, accountName: a.Ac_title } : null) as unknown as T;
      }
      return null;
    };

    const all = async <T = unknown>(): Promise<{ results: T[] }> => {
      if (q.includes('FROM FiscalYear f')) {
        return {
          results: [...store.FiscalYear]
            .sort((a, b) => b.fiscal_id - a.fiscal_id)
            .map((f) => ({
            id: f.fiscal_id,
            name: f.fiscal_name,
            beginDate: f.fiscal_beginDate,
            endDate: f.fiscal_endDate,
            status: f.fiscal_status,
            txCount: store.Activity.filter((a) => a.Act_Fiscal_id === f.fiscal_id && a.Act_multiType !== 2).length,
            remainedCount: store.RemainedAccount.filter((r) => r.FiscalId === f.fiscal_id).length,
          })) as unknown as T[],
        };
      }
      if (q.includes('WITH RECURSIVE hier')) {
        const getRoot = (id: number): number => {
          let cur = store.accounts.find((a) => a.Ac_id === id);
          while (cur && cur.Ac_parent_id > 0) {
            cur = store.accounts.find((a) => a.Ac_id === cur!.Ac_parent_id);
          }
          return cur ? cur.Ac_id : id;
        };
        return {
          results: store.accounts.map((a) => ({ ...a, rootId: getRoot(a.Ac_id) })) as unknown as T[],
        };
      }
      if (q.includes('FROM Activity act') && q.includes('Act_multiType != 2')) {
        return {
          results: store.Activity.filter((a) => a.Act_multiType !== 2).map((a) => ({
            id: a.Act_id,
            amount: a.Act_amount,
            shamsiDate: a.Act_date,
            time: a.Act_time,
            description: a.Act_info,
            multiId: a.Act_multiId,
            multiType: a.Act_multiType,
            fiscalYearId: a.Act_Fiscal_id,
            payRootId: a.Act_pay_Root_id,
            recRootId: a.Act_rec_Root_id,
            inferredType:
              a.Act_multiType === 1
                ? 'compound'
                : a.Act_pay_Root_id === 1
                ? 'debit'
                : a.Act_rec_Root_id === 2
                ? 'credit'
                : 'transfer',
          })) as unknown as T[],
        };
      }
      if (q.includes('SELECT * FROM Activity WHERE Act_multiId = ?')) {
        return { results: store.Activity.filter((a) => a.Act_multiId === boundParams[0]) as unknown as T[] };
      }
      if (q.includes('FROM smsTable')) {
        return { results: store.smsTable.filter((s) => !s.TransactionId || s.TransactionId === 0) as unknown as T[] };
      }
      if (q.includes('FROM Pattern p')) {
        return {
          results: store.Pattern.map((p) => ({
            id: p.pat_id,
            title: p.pat_title,
            amount: p.pat_amount,
            description: p.pat_info,
            type: p.pat_type,
            recRootId: p.pat_rec_accParentId,
            recSubId: p.pat_rec_accChildId,
            recLeafId: p.pat_rec_accSubChildId,
            payRootId: p.pat_pay_accParentId,
            paySubId: p.pat_pay_accChildId,
            payLeafId: p.pat_pay_accSubChildId,
          })) as unknown as T[],
        };
      }
      return { results: [] };
    };

    const run = async () => {
      if (q.startsWith('INSERT INTO Activity')) {
        const [
          Act_id, Act_amount, Act_date, Act_time, Act_info,
          Act_rec_Root_id, Act_rec_Subacc_id, Act_accRecive_id, RecivePath,
          Act_pay_Root_id, Act_pay_Subacc_id, Act_accPay_id, PayPath,
          Act_multiId, Act_multiType, Act_Fiscal_id,
        ] = boundParams;
        store.Activity.push({
          Act_id, Act_amount, Act_date, Act_time, Act_info,
          Act_rec_Root_id, Act_rec_Subacc_id, Act_accRecive_id, RecivePath,
          Act_pay_Root_id, Act_pay_Subacc_id, Act_accPay_id, PayPath,
          Act_multiId, Act_multiType, Act_Fiscal_id,
        });
      } else if (q.startsWith('UPDATE Activity')) {
        const [amount, info, date, time, recR, recS, recL, recP, payR, payS, payL, payP, id] = boundParams;
        const row = store.Activity.find((a) => a.Act_id === id);
        if (row) {
          Object.assign(row, {
            Act_amount: amount, Act_info: info, Act_date: date, Act_time: time,
            Act_rec_Root_id: recR, Act_rec_Subacc_id: recS, Act_accRecive_id: recL, RecivePath: recP,
            Act_pay_Root_id: payR, Act_pay_Subacc_id: payS, Act_accPay_id: payL, PayPath: payP,
          });
        }
      } else if (q.startsWith('DELETE FROM Activity WHERE Act_id = ?')) {
        store.Activity = store.Activity.filter((a) => a.Act_id !== boundParams[0]);
      } else if (q.startsWith('UPDATE accounts SET Ac_balance = COALESCE(Ac_balance, 0) + ?')) {
        const acc = store.accounts.find((a) => a.Ac_id === boundParams[1]);
        if (acc) acc.Ac_balance += boundParams[0];
      } else if (q.startsWith('UPDATE accounts SET Ac_balance = 0 WHERE Ac_id = ?')) {
        const acc = store.accounts.find((a) => a.Ac_id === boundParams[0]);
        if (acc) acc.Ac_balance = 0;
      } else if (q.startsWith('INSERT INTO RemainedAccount')) {
        store.RemainedAccount.push({
          id: boundParams[0], AccountId: boundParams[1], FiscalId: boundParams[2], remained: boundParams[3],
        });
      } else if (q.startsWith('DELETE FROM RemainedAccount WHERE FiscalId = ?')) {
        store.RemainedAccount = store.RemainedAccount.filter((r) => r.FiscalId !== boundParams[0]);
      } else if (q.startsWith('UPDATE FiscalYear SET fiscal_status = 2 WHERE fiscal_id = ?')) {
        const fy = store.FiscalYear.find((f) => f.fiscal_id === boundParams[0]);
        if (fy) fy.fiscal_status = 2;
      } else if (q.startsWith('INSERT INTO FiscalYear')) {
        store.FiscalYear.push({
          fiscal_id: boundParams[0], fiscal_name: boundParams[1],
          fiscal_beginDate: boundParams[2], fiscal_endDate: boundParams[3], fiscal_status: boundParams[4] ?? 1,
        });
      } else if (q.startsWith('INSERT INTO smsTable')) {
        const id = smsSeq++;
        store.smsTable.push({
          ID: id, Content: boundParams[0], Type: boundParams[1], BankName: boundParams[2],
          Amount: boundParams[3], Date: boundParams[4], Time: boundParams[5],
          AccountNumber: boundParams[6], Description: boundParams[7], TransactionId: 0,
        });
        return { success: true, meta: { last_row_id: id } };
      } else if (q.startsWith('UPDATE smsTable SET TransactionId = ? WHERE ID = ?')) {
        const sms = store.smsTable.find((s) => s.ID === boundParams[1]);
        if (sms) sms.TransactionId = boundParams[0];
      } else if (q.startsWith('INSERT INTO Pattern')) {
        store.Pattern.push({
          pat_id: boundParams[0], pat_title: boundParams[1],
          pat_rec_accParentId: boundParams[2], pat_rec_accChildId: boundParams[3], pat_rec_accSubChildId: boundParams[4],
          pat_pay_accParentId: boundParams[5], pat_pay_accChildId: boundParams[6], pat_pay_accSubChildId: boundParams[7],
          pat_amount: boundParams[8], pat_info: boundParams[9], pat_type: boundParams[10],
        });
      }
      return { success: true, meta: {} };
    };

    return { first, all, run };
  };

  return {
    prepare(query: string) {
      let boundParams: any[] = [];
      const stmt = {
        bind(...params: any[]) {
          boundParams = params;
          return stmt;
        },
        first: <T = unknown>() => execQuery(query, boundParams).first<T>(),
        all: <T = unknown>() => execQuery(query, boundParams).all<T>(),
        run: () => execQuery(query, boundParams).run(),
      };
      return stmt as unknown as D1PreparedStatement;
    },
    async batch(statements: D1PreparedStatement[]) {
      const results = [];
      for (const s of statements) {
        results.push(await (s as any).run());
      }
      return results as D1Result[];
    },
  } as unknown as D1Database;
}

describe('Parmis Core Worker API', () => {
  const mockEnv: Bindings = {
    DB: createParmisMockD1(),
    ENVIRONMENT: 'test',
  };

  it('بررسی روت سلامت (GET /api/health)', async () => {
    const res = await app.request('/api/health', {}, mockEnv);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe('ok');
  });

  it('ثبت، ویرایش و حذف سند ۳ سطحی با به‌روزرسانی مانده درختی حساب‌ها', async () => {
    // ۱. ثبت هزینه ۵۰۰,۰۰۰ ریالی از بلوبانک (173) به سوپرمارکت (51)
    const createRes = await app.request(
      '/api/transactions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Sync-Token': 'jibban_sync_demo_token_12345' },
        body: JSON.stringify({
          type: 'debit',
          amount: 500000,
          fromAccountId: 173,
          toAccountId: 51,
          description: 'خرید نان و لبنیات',
        }),
      },
      mockEnv
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as any;
    expect(created.data.fiscalYearId).toBe('1');

    // ۲. ثبت درآمد ۲,۰۰۰,۰۰۰ ریالی از حقوق (36) به بلوبانک (173)
    const incomeRes = await app.request(
      '/api/transactions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Sync-Token': 'jibban_sync_demo_token_12345' },
        body: JSON.stringify({
          type: 'credit',
          amount: 2000000,
          fromAccountId: 36,
          toAccountId: 173,
          description: 'واریز حقوق',
        }),
      },
      mockEnv
    );
    expect(incomeRes.status).toBe(201);

    // بررسی تشخیص صحیح نوع تراکنش‌ها در GET
    const listRes = await app.request('/api/transactions', {
      headers: { 'X-Sync-Token': 'jibban_sync_demo_token_12345' },
    }, mockEnv);
    const listJson = (await listRes.json()) as any;
    expect(listJson.data.some((t: any) => t.type === 'credit' && t.amount === 2000000)).toBe(true);
    expect(listJson.data.some((t: any) => t.type === 'debit' && t.amount === 500000)).toBe(true);

    // حذف سند هزینه و اطمینان از برگشت مانده
    const delRes = await app.request(`/api/transactions/${created.data.id}`, {
      method: 'DELETE',
      headers: { 'X-Sync-Token': 'jibban_sync_demo_token_12345' },
    }, mockEnv);
    expect(delRes.status).toBe(200);
  });

  it('تطبیق خودکار پیامک بانکی با BankAccounts و رد پیامک غیربانکی', async () => {
    const otpRes = await app.request(
      '/api/sms/ingest',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Sync-Token': 'jibban_sync_demo_token_12345' },
        body: JSON.stringify({ sender: '983000', rawText: 'رمز پویا: 123456' }),
      },
      mockEnv
    );
    expect(otpRes.status).toBe(200);
    const otpJson = (await otpRes.json()) as any;
    expect(otpJson.isBankSms).toBe(false);

    const bankRes = await app.request(
      '/api/sms/ingest',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Sync-Token': 'jibban_sync_demo_token_12345' },
        body: JSON.stringify({
          sender: 'BLUBANK',
          rawText: 'بلو\nبرداشت پول\nمبلغ: 350,000 ریال\nحساب: 123456\nمانده: 9,650,000 ریال',
        }),
      },
      mockEnv
    );
    expect(bankRes.status).toBe(201);
    const bankJson = (await bankRes.json()) as any;
    expect(bankJson.isBankSms).toBe(true);
    expect(bankJson.matchedAccountId).toBe('173');
  });

  it('بستن سال مالی، ثبت RemainedAccount و افتتاح سال جدید', async () => {
    const closeRes = await app.request(
      '/api/fiscal-years/1/close',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Sync-Token': 'jibban_sync_demo_token_12345' },
        body: JSON.stringify({ nextYearName: '1406' }),
      },
      mockEnv
    );
    expect(closeRes.status).toBe(200);
    const closeJson = (await closeRes.json()) as any;
    expect(closeJson.data.newFiscalName).toBe('1406');
    expect(closeJson.data.remainedAccountsCount).toBe(7);

    const fyListRes = await app.request('/api/fiscal-years', {
      headers: { 'X-Sync-Token': 'jibban_sync_demo_token_12345' },
    }, mockEnv);
    const fyList = (await fyListRes.json()) as any;
    expect(fyList.data.length).toBe(2);
    expect(fyList.data[0].name).toBe('1406');
    expect(fyList.data[0].status).toBe('open');
  });

  it('ایجاد و دریافت الگوهای تراکنش سریع (Pattern)', async () => {
    const patRes = await app.request(
      '/api/patterns',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Sync-Token': 'jibban_sync_demo_token_12345' },
        body: JSON.stringify({
          title: 'خرید روزانه سوپرمارکت',
          fromAccountId: 173,
          toAccountId: 51,
          amount: 250000,
          type: 'debit',
        }),
      },
      mockEnv
    );
    expect(patRes.status).toBe(201);

    const listPat = await app.request('/api/patterns', {
      headers: { 'X-Sync-Token': 'jibban_sync_demo_token_12345' },
    }, mockEnv);
    const listJson = (await listPat.json()) as any;
    expect(listJson.data.length).toBe(1);
    expect(listJson.data[0].title).toBe('خرید روزانه سوپرمارکت');
  });
});
