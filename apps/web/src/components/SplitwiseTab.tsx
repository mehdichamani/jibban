import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  PlusCircle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  UserCheck,
  Sparkles,
  Percent,
  Calendar,
} from 'lucide-react';
import { calculateGroupBalances, simplifyDebts } from '@jibban/debt-engine';
import { formatJalali } from '../lib/date.js';

export interface GroupExpenseRecord {
  id: string;
  payerName: string;
  description: string;
  amount: number;
  date: string;
  splitType: 'equal' | 'percentage';
  splits: Array<{ userId: string; owedAmount: number; percentage?: number }>;
}

interface SplitwiseTabProps {
  onOpenAddExpense: () => void;
  externalExpenses?: GroupExpenseRecord[];
}

const STORAGE_KEY_GROUP_EXPENSES = 'jibban_local_group_expenses';

// هزینه‌های پایه اولیه گروه با تاریخ‌های استاندارد
const DEFAULT_EXPENSES: GroupExpenseRecord[] = [
  {
    id: 'exp_init_1',
    payerName: 'من',
    description: 'خرید مواد غذایی سوپرمارکت',
    amount: 340000,
    date: new Date(Date.now() - 3600000 * 3).toISOString(),
    splitType: 'equal',
    splits: [
      { userId: 'من', owedAmount: 113334 },
      { userId: 'رضا', owedAmount: 113333 },
      { userId: 'سارا', owedAmount: 113333 },
    ],
  },
  {
    id: 'exp_init_2',
    payerName: 'رضا',
    description: 'اسنپ و حمل و نقل گروهی',
    amount: 120000,
    date: new Date(Date.now() - 3600000 * 24).toISOString(),
    splitType: 'percentage',
    splits: [
      { userId: 'من', owedAmount: 60000, percentage: 50 },
      { userId: 'رضا', owedAmount: 36000, percentage: 30 },
      { userId: 'سارا', owedAmount: 24000, percentage: 20 },
    ],
  },
  {
    id: 'exp_init_3',
    payerName: 'من',
    description: 'کافه و عصرانه',
    amount: 110000,
    date: new Date(Date.now() - 3600000 * 48).toISOString(),
    splitType: 'equal',
    splits: [
      { userId: 'من', owedAmount: 36668 },
      { userId: 'رضا', owedAmount: 36666 },
      { userId: 'سارا', owedAmount: 36666 },
    ],
  },
];

export const SplitwiseTab: React.FC<SplitwiseTabProps> = ({ onOpenAddExpense }) => {
  const [expenses, setExpenses] = useState<GroupExpenseRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_GROUP_EXPENSES);
    if (!saved) {
      localStorage.setItem(STORAGE_KEY_GROUP_EXPENSES, JSON.stringify(DEFAULT_EXPENSES));
      return DEFAULT_EXPENSES;
    }
    try {
      return JSON.parse(saved);
    } catch {
      return DEFAULT_EXPENSES;
    }
  });

  const [settledSuccess, setSettledSuccess] = useState<string | null>(null);

  // محاسبه پویای تراز اعضا و تسویه‌حساب‌ها با الگوریتم debt-engine
  const { memberBalances, settlements } = useMemo(() => {
    const engineExpenses = expenses.map((exp) => ({
      id: exp.id,
      groupId: 'grp_home',
      payerId: exp.payerName,
      amount: exp.amount,
      description: exp.description,
      expenseDate: exp.date,
      splits: exp.splits.map((s) => ({
        userId: s.userId,
        owedAmount: s.owedAmount,
      })),
    }));

    const balances = calculateGroupBalances(engineExpenses, []);

    // نام اعضا
    const userNames: Record<string, string> = {
      من: 'من (کاربر اصلی)',
      رضا: 'رضا',
      سارا: 'سارا',
    };

    // اطمینان از حضور تمام اعضای ۳ نفره
    const allUsers = ['من', 'رضا', 'سارا'];
    const membersList = allUsers.map((uId) => {
      const b = balances[uId] || { userId: uId, netBalance: 0, totalPaid: 0, totalShare: 0 };
      return {
        id: uId,
        name: userNames[uId] || uId,
        netBalance: b.netBalance,
        totalPaid: b.totalPaid,
        totalShare: b.totalShare,
      };
    });

    const netMap: Record<string, number> = {};
    for (const m of membersList) {
      netMap[m.id] = m.netBalance;
    }

    const calculatedSettlements = simplifyDebts(netMap).map((s, idx) => ({
      id: `settle_${idx}_${s.fromUser}_${s.toUser}`,
      fromId: s.fromUser,
      fromName: userNames[s.fromUser] || s.fromUser,
      toId: s.toUser,
      toName: userNames[s.toUser] || s.toUser,
      amount: s.amount,
    }));

    return {
      memberBalances: membersList,
      settlements: calculatedSettlements,
    };
  }, [expenses]);

  const formatToman = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount);
  };

  const myBalance = memberBalances.find((m) => m.id === 'من')?.netBalance ?? 0;

  const handleSettle = (fromName: string, toName: string, amount: number) => {
    setSettledSuccess(`تسویه‌حساب بین ${fromName} و ${toName} به مبلغ ${formatToman(amount)} تومان با موفقیت ثبت شد.`);
    setTimeout(() => setSettledSuccess(null), 4000);
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-8">
      {/* پیام تسویه حساب موفق */}
      {settledSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{settledSuccess}</span>
        </div>
      )}

      {/* هدر بخش دنگ با کارت وضعیت کاربر */}
      <div className="glass-card p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/40 border-purple-500/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge badge-split text-xs font-bold">گروه: خرج‌های مشترک خانه</span>
              <span className="text-xs text-slate-400">۳ عضو فعال</span>
            </div>

            <div className="mt-3">
              <div className="text-xs text-slate-400">وضعیت تراز کلی شما در این گروه:</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className={`text-2xl sm:text-3xl font-extrabold font-mono ${
                    myBalance > 0
                      ? 'text-emerald-400'
                      : myBalance < 0
                      ? 'text-rose-400'
                      : 'text-slate-300'
                  }`}
                >
                  {myBalance > 0 ? '+' : ''}
                  {formatToman(myBalance)}
                </span>
                <span className="text-xs text-slate-400">تومان</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    myBalance > 0
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : myBalance < 0
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {myBalance > 0 ? 'طلبکار از گروه' : myBalance < 0 ? 'بدهکار به گروه' : 'بی‌حساب'}
                </span>
              </div>
            </div>
          </div>

          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
            <button
              onClick={onOpenAddExpense}
              className="btn btn-split text-xs sm:text-sm py-2.5 px-4 shadow-lg shadow-purple-500/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>ثبت هزینه جدید گروه</span>
            </button>
          </div>
        </div>
      </div>

      {/* بخش تسویه‌حساب‌های بهینه (Optimal Settlements) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-slate-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
            <span>تراکنش‌های بهینه تسویه (پیشنهادی موتور Spliit)</span>
          </h3>
          <span className="text-xs text-slate-400 font-normal">
            {settlements.length} تراکنش برای صفر کردن همه حساب‌ها
          </span>
        </div>

        {settlements.length === 0 ? (
          <div className="glass-card p-6 text-center text-slate-400 text-sm">
            🎉 تمامی حساب‌های این گروه تسویه و برابر شده است!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {settlements.map((s) => (
              <div
                key={s.id}
                className="glass-card p-4 flex items-center justify-between gap-3 border-purple-500/20 hover:border-purple-500/40"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-sm font-bold">
                    {s.fromName[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                      <span>{s.fromName}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 rotate-180" />
                      <span>{s.toName}</span>
                    </div>
                    <div className="text-xs text-purple-400 font-bold mt-0.5">
                      {formatToman(s.amount)} تومان
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSettle(s.fromName, s.toName, s.amount)}
                  className="btn btn-secondary text-xs py-1.5 px-3 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30"
                  title="ثبت تسویه این مبلغ"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>ثبت تسویه</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* لیست اعضا و تراز هر عضو */}
      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-slate-200 flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" />
          <span>تراز اعضای گروه</span>
        </h3>

        <div className="glass-card divide-y divide-slate-800/80 overflow-hidden">
          {memberBalances.map((member) => {
            const isCreditor = member.netBalance > 0;
            const isZero = member.netBalance === 0;

            return (
              <div key={member.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-base">
                    {member.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-100">{member.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      پرداختی: {formatToman(member.totalPaid)} ت | مصرف: {formatToman(member.totalShare)} ت
                    </div>
                  </div>
                </div>

                <div className="text-left font-mono">
                  {isZero ? (
                    <span className="text-xs text-slate-400 font-medium">بی‌حساب (۰ ت)</span>
                  ) : (
                    <div className={`text-sm font-bold ${isCreditor ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isCreditor ? '+' : ''}
                      {formatToman(member.netBalance)}
                      <span className="text-xs font-normal mr-1">تومان</span>
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500">
                    {isCreditor ? 'طلبکار' : isZero ? 'تسویه' : 'بدهکار'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* تاریخچه هزینه‌های گروه با تاریخ‌های شمسی و شیوه تقسیم */}
      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-slate-200 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-400" />
          <span>تاریخچه هزینه‌های ثبت‌شده گروه</span>
        </h3>

        <div className="glass-card divide-y divide-slate-800/80 overflow-hidden">
          {expenses.map((exp) => (
            <div key={exp.id} className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-200">{exp.description}</div>
                <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                  <span>پرداخت‌کننده: <strong className="text-slate-300">{exp.payerName}</strong></span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    {exp.splitType === 'percentage' ? (
                      <>
                        <Percent className="w-3 h-3" />
                        <span>تقسیم درصدی ({exp.splits.map((s) => `${s.userId}: ${s.percentage || Math.round((s.owedAmount / exp.amount) * 100)}٪`).join('، ')})</span>
                      </>
                    ) : (
                      <>
                        <Users className="w-3 h-3" />
                        <span>تقسیم مساوی بین {exp.splits.length} نفر</span>
                      </>
                    )}
                  </span>
                  <span>•</span>
                  <span className="text-[11px] text-slate-400" title={formatJalali(exp.date, 'full')}>
                    {formatJalali(exp.date, 'relative')}
                  </span>
                </div>
              </div>

              <div className="text-sm font-bold font-mono text-purple-300 shrink-0">
                {formatToman(exp.amount)} <span className="text-xs font-normal text-slate-400">تومان</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
