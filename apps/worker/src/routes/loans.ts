import { Hono } from 'hono';
import { Bindings, Variables, Loan, LoanInstallment } from '../types.js';

export const loansRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * دریافت لیست تمام وام‌های کاربر همراه با وضعیت اقساط
 */
loansRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const status = c.req.query('status'); // 'active' | 'completed' | 'overdue'

  let query = `
    SELECT 
      l.id, l.user_id as userId, l.title, l.account_id as accountId,
      l.total_amount as totalAmount, l.total_profit as totalProfit,
      l.installment_amount as installmentAmount, l.total_installments as totalInstallments,
      l.paid_installments as paidInstallments, l.start_date as startDate,
      l.status, l.created_at as createdAt,
      a.name as accountName
    FROM loans l
    LEFT JOIN accounts a ON l.account_id = a.id
    WHERE l.user_id = ?
  `;
  const params: unknown[] = [userId];

  if (status) {
    query += ` AND l.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY l.status ASC, l.start_date DESC`;

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  return c.json({
    success: true,
    data: results || [],
  });
});

/**
 * ثبت وام جدید و تولید خودکار رکوردهای اقساط ماهانه
 */
loansRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    title: string;
    accountId?: string | null;
    totalAmount: number; // ریال
    totalProfit?: number; // ریال
    installmentAmount: number; // ریال
    totalInstallments: number;
    startDate: string; // ISO date
  }>();

  if (!body.title || !body.totalAmount || !body.installmentAmount || !body.totalInstallments || !body.startDate) {
    return c.json({ success: false, error: 'اطلاعات وام و اقساط ناقص است' }, 400);
  }

  const loanId = `loan_${crypto.randomUUID()}`;
  const totalAmount = Math.round(body.totalAmount);
  const totalProfit = Math.round(body.totalProfit || 0);
  const installmentAmount = Math.round(body.installmentAmount);
  const totalInstallments = Math.max(1, Math.round(body.totalInstallments));

  const statements: D1PreparedStatement[] = [];

  // ۱. ثبت وام
  statements.push(
    c.env.DB.prepare(
      `INSERT INTO loans (
        id, user_id, title, account_id, total_amount, total_profit,
        installment_amount, total_installments, paid_installments, start_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'active')`
    ).bind(
      loanId,
      userId,
      body.title.trim(),
      body.accountId ?? null,
      totalAmount,
      totalProfit,
      installmentAmount,
      totalInstallments,
      body.startDate
    )
  );

  // ۲. تولید اقساط ماهانه
  const startDateObj = new Date(body.startDate);
  for (let i = 1; i <= totalInstallments; i++) {
    const instId = `inst_${crypto.randomUUID()}`;
    const dueDate = new Date(startDateObj);
    dueDate.setMonth(startDateObj.getMonth() + (i - 1));

    statements.push(
      c.env.DB.prepare(
        `INSERT INTO loan_installments (
          id, loan_id, installment_number, amount, due_date, is_paid
        ) VALUES (?, ?, ?, ?, ?, 0)`
      ).bind(instId, loanId, i, installmentAmount, dueDate.toISOString())
    );
  }

  await c.env.DB.batch(statements);

  return c.json(
    {
      success: true,
      data: {
        id: loanId,
        userId,
        title: body.title.trim(),
        totalAmount,
        totalProfit,
        installmentAmount,
        totalInstallments,
        paidInstallments: 0,
        startDate: body.startDate,
        status: 'active',
      },
    },
    201
  );
});

/**
 * دریافت جزئیات یک وام به همراه تمام اقساط آن
 */
loansRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');

  const loan = await c.env.DB.prepare(
    `SELECT 
      l.*,
      a.name as accountName
    FROM loans l
    LEFT JOIN accounts a ON l.account_id = a.id
    WHERE l.id = ? AND l.user_id = ?`
  )
    .bind(id, userId)
    .first<any>();

  if (!loan) {
    return c.json({ success: false, error: 'وام پیدا نشد' }, 404);
  }

  const { results: installments } = await c.env.DB.prepare(
    `SELECT 
      id, loan_id as loanId, installment_number as installmentNumber,
      amount, due_date as dueDate, paid_date as paidDate,
      is_paid as isPaid, linked_transaction_id as linkedTransactionId
    FROM loan_installments
    WHERE loan_id = ?
    ORDER BY installment_number ASC`
  )
    .bind(id)
    .all();

  return c.json({
    success: true,
    data: {
      ...loan,
      installments: (installments || []).map((inst: any) => ({
        ...inst,
        isPaid: Boolean(inst.isPaid),
      })),
    },
  });
});

/**
 * ثبت پرداخت یک قسط وام
 */
loansRouter.post('/:id/installments/:instId/pay', async (c) => {
  const loanId = c.req.param('id');
  const instId = c.req.param('instId');
  const userId = c.get('userId');
  const body = await c.req.json<{
    accountId?: string;
    paidDate?: string;
  }>();

  const loan = await c.env.DB.prepare('SELECT * FROM loans WHERE id = ? AND user_id = ?')
    .bind(loanId, userId)
    .first<any>();

  if (!loan) {
    return c.json({ success: false, error: 'وام پیدا نشد' }, 404);
  }

  const installment = await c.env.DB.prepare('SELECT * FROM loan_installments WHERE id = ? AND loan_id = ?')
    .bind(instId, loanId)
    .first<any>();

  if (!installment) {
    return c.json({ success: false, error: 'قسط مورد نظر پیدا نشد' }, 404);
  }

  if (installment.is_paid) {
    return c.json({ success: false, error: 'این قسط قبلاً پرداخت شده است' }, 400);
  }

  const payDate = body.paidDate || new Date().toISOString();
  const payAccountId = body.accountId || loan.account_id;
  const txId = `tx_${crypto.randomUUID()}`;

  const statements: D1PreparedStatement[] = [];

  // ۱. ایجاد تراکنش پرداخت قسط
  statements.push(
    c.env.DB.prepare(
      `INSERT INTO transactions (
        id, user_id, type, amount, from_account_id, description, tag, transaction_date
      ) VALUES (?, ?, 'debit', ?, ?, ?, 'قسط وام', ?)`
    ).bind(
      txId,
      userId,
      installment.amount,
      payAccountId ?? null,
      `پرداخت قسط شماره ${installment.installment_number} از وام ${loan.title}`,
      payDate
    )
  );

  // ۲. کسر از حساب مبدا در صورت وجود
  if (payAccountId) {
    statements.push(
      c.env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?')
        .bind(installment.amount, payAccountId, userId)
    );
  }

  // ۳. آپدیت وضعیت قسط
  statements.push(
    c.env.DB.prepare(
      'UPDATE loan_installments SET is_paid = 1, paid_date = ?, linked_transaction_id = ? WHERE id = ?'
    ).bind(payDate, txId, instId)
  );

  // ۴. افزایش تعداد اقساط پرداخت شده و در صورت اتمام، تکمیل وام
  const newPaidCount = loan.paid_installments + 1;
  const isCompleted = newPaidCount >= loan.total_installments;
  statements.push(
    c.env.DB.prepare(
      'UPDATE loans SET paid_installments = ?, status = ? WHERE id = ? AND user_id = ?'
    ).bind(newPaidCount, isCompleted ? 'completed' : 'active', loanId, userId)
  );

  await c.env.DB.batch(statements);

  return c.json({
    success: true,
    message: 'قسط با موفقیت پرداخت و تراکنش مربوطه ثبت شد',
    data: {
      loanId,
      installmentId: instId,
      paidInstallments: newPaidCount,
      isCompleted,
      transactionId: txId,
    },
  });
});

/**
 * حذف وام
 */
loansRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');

  const statements = [
    c.env.DB.prepare('DELETE FROM loan_installments WHERE loan_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM loans WHERE id = ? AND user_id = ?').bind(id, userId),
  ];

  await c.env.DB.batch(statements);

  return c.json({ success: true, message: 'وام و اقساط مربوطه با موفقیت حذف شدند' });
});
