import {
  Expense,
  PastSettlement,
  UserBalance,
  Settlement,
  GroupSummary,
} from './types.js';

/**
 * محاسبه تراز مالی و خالص طلبکاری/بدهکاری هر کاربر در گروه
 */
export function calculateGroupBalances(
  expenses: Expense[],
  pastSettlements: PastSettlement[] = []
): Record<string, UserBalance> {
  const balances: Record<string, UserBalance> = {};

  const ensureUser = (userId: string) => {
    if (!balances[userId]) {
      balances[userId] = {
        userId,
        netBalance: 0,
        totalPaid: 0,
        totalShare: 0,
      };
    }
  };

  // ۱. اعمال مخارج ثبت‌شده
  for (const exp of expenses) {
    ensureUser(exp.payerId);
    balances[exp.payerId].totalPaid += exp.amount;
    balances[exp.payerId].netBalance += exp.amount;

    for (const split of exp.splits) {
      ensureUser(split.userId);
      balances[split.userId].totalShare += split.owedAmount;
      balances[split.userId].netBalance -= split.owedAmount;
    }
  }

  // ۲. اعمال تسویه‌حساب‌های گذشته ثبت‌شده در سیستم
  for (const s of pastSettlements) {
    ensureUser(s.fromUserId);
    ensureUser(s.toUserId);

    // کاربری که پول داده، بدهی‌اش کم شده یا طلبکارتر شده (+netBalance)
    balances[s.fromUserId].netBalance += s.amount;
    // کاربری که پول گرفته، طلبش وصول شده (-netBalance)
    balances[s.toUserId].netBalance -= s.amount;
  }

  return balances;
}

/**
 * الگوریتم ساده‌سازی گراف بدهی (Spliit Debt Simplification Algorithm)
 * کاهش تعداد تراکنش‌های تسویه به حداقل ممکن
 */
export function simplifyDebts(netBalances: Record<string, number>): Settlement[] {
  const settlements: Settlement[] = [];

  // تفکیک به بدهکاران (debtors) و طلبکاران (creditors)
  const debtors: Array<{ userId: string; amount: number }> = [];
  const creditors: Array<{ userId: string; amount: number }> = [];

  for (const [userId, net] of Object.entries(netBalances)) {
    // نادیده گرفتن مقادیر صفر یا خطاهای محاسباتی ناچیز
    if (net < -0.01) {
      debtors.push({ userId, amount: Math.round(-net) });
    } else if (net > 0.01) {
      creditors.push({ userId, amount: Math.round(net) });
    }
  }

  // مرتب‌سازی نزولی بر اساس بیشترین مبلغ بدهی و طلب
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0) {
      settlements.push({
        fromUser: debtor.userId,
        toUser: creditor.userId,
        amount: settleAmount,
      });

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;
    }

    if (debtor.amount === 0) {
      dIdx++;
    }
    if (creditor.amount === 0) {
      cIdx++;
    }
  }

  return settlements;
}

/**
 * محاسبه گزارش کامل وضعیت گروه شامل مخارج کل، تراز هر فرد و تراکنش‌های بهینه تسویه
 */
export function calculateGroupSummary(
  expenses: Expense[],
  pastSettlements: PastSettlement[] = []
): GroupSummary {
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const balances = calculateGroupBalances(expenses, pastSettlements);

  // استخراج خالص ترازها برای ساده‌سازی بدهی‌ها
  const netBalances: Record<string, number> = {};
  for (const [userId, userBal] of Object.entries(balances)) {
    netBalances[userId] = userBal.netBalance;
  }

  const settlements = simplifyDebts(netBalances);

  return {
    totalExpenses,
    balances,
    settlements,
  };
}
