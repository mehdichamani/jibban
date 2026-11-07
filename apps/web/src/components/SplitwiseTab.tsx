import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  PlusCircle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  UserCheck,
  UserPlus,
  Settings,
  Sparkles,
  Percent,
  Calendar,
} from 'lucide-react';
import { calculateGroupBalances, simplifyDebts } from '@jibban/debt-engine';
import { formatJalali } from '../lib/date.js';
import { GroupMemberItem, getStoredGroupMembers, saveStoredGroupMembers } from '../lib/groupMembersStorage.js';
import { ManageMembersModal } from './ManageMembersModal.js';

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

export const SplitwiseTab: React.FC<SplitwiseTabProps> = ({ onOpenAddExpense }) => {
  const [members, setMembers] = useState<GroupMemberItem[]>(getStoredGroupMembers());
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);

  const [expenses, setExpenses] = useState<GroupExpenseRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_GROUP_EXPENSES);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  const [settledSuccess, setSettledSuccess] = useState<string | null>(null);

  const handleSaveMembers = (newMembers: GroupMemberItem[]) => {
    setMembers(newMembers);
    saveStoredGroupMembers(newMembers);
  };

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

    // نام اعضا از لیست اعضای ذخیره‌شده
    const userNames: Record<string, string> = {};
    members.forEach((m) => {
      userNames[m.id] = m.name;
    });

    // استخراج اعضا بر اساس لیست اعضای جاری گروه
    const userSet = new Set<string>(members.map((m) => m.id));
    for (const exp of expenses) {
      if (exp.payerName) userSet.add(exp.payerName);
      for (const s of exp.splits) {
        if (s.userId) userSet.add(s.userId);
      }
    }

    const allUsers = Array.from(userSet);
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
  }, [expenses, members]);

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
              <span className="badge badge-split text-xs font-bold">گروه: خرج‌های مشترک</span>
              <span className="text-xs text-slate-400">{members.length} عضو فعال</span>
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
                <span className="text-xs text-slate-500 mr-2">
                  {myBalance > 0 ? '(شما طلبکارید)' : myBalance < 0 ? '(شما بدهکارید)' : '(بی‌حساب)'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsManageMembersOpen(true)}
              className="btn btn-secondary text-xs py-2 sm:py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
            >
              <Users className="w-4 h-4 text-purple-400" />
              <span>مدیریت اعضا</span>
            </button>

            <button
              onClick={onOpenAddExpense}
              className="btn btn-primary text-xs py-2 sm:py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1.5 flex-1 sm:flex-initial shadow-md shadow-purple-500/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>ثبت خرج جدید</span>
            </button>
          </div>
        </div>
      </div>

      {/* بخش اعضا و تراز تفکیکی */}
      <div className="glass-card p-4 sm:p-5 border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">اعضای گروه و وضعیت تراز</h3>
          </div>
          <button
            onClick={() => setIsManageMembersOpen(true)}
            className="text-xs text-purple-400 hover:text-purple-300 transition flex items-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>ویرایش / افزودن اعضا</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {memberBalances.map((member) => (
            <div
              key={member.id}
              className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-slate-800 text-slate-200 font-bold text-sm flex items-center justify-center border border-slate-700">
                  {member.name.slice(0, 1)}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate max-w-[120px]">
                    {member.name}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    پرداختی: {formatToman(member.totalPaid)} ت
                  </span>
                </div>
              </div>

              <div className="text-left font-mono">
                <span
                  className={`text-xs sm:text-sm font-extrabold ${
                    member.netBalance > 0
                      ? 'text-emerald-400'
                      : member.netBalance < 0
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {member.netBalance > 0 ? '+' : ''}
                  {formatToman(member.netBalance)}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  {member.netBalance > 0 ? 'طلبکار' : member.netBalance < 0 ? 'بدهکار' : 'تسویه'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* پیشنهادهای تسویه بهینه (Debt Simplification) */}
      <div className="glass-card p-4 sm:p-5 border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">تراکنش‌های بهینه تسویه‌حساب</h3>
          </div>
          <span className="text-[11px] text-slate-400">الگوریتم کاهش تعداد تراکنش‌ها</span>
        </div>

        {settlements.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs bg-slate-900/30 rounded-xl border border-slate-800/50">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <span>تمامی حساب‌های گروه کاملاً تسویه است و بدهی معوقه‌ای وجود ندارد.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {settlements.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2 text-slate-200">
                  <span className="font-bold text-rose-400">{s.fromName}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-bold text-emerald-400">{s.toName}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-extrabold text-white text-xs sm:text-sm">
                    {formatToman(s.amount)} تومان
                  </span>
                  <button
                    onClick={() => handleSettle(s.fromName, s.toName, s.amount)}
                    className="btn btn-secondary text-[11px] py-1 px-2.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30 transition"
                  >
                    تسویه شد
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* تاریخچه مخارج گروهی ثبت شده */}
      <div className="glass-card p-4 sm:p-5 border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white">تاریخچه مخارج گروه</h3>
          </div>
          <span className="text-xs text-slate-400">{expenses.length} مورد ثبت‌شده</span>
        </div>

        {expenses.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            هنوز هیچ خرجی برای این گروه ثبت نشده است. با دکمه «ثبت خرج جدید» اولین هزینه را اضافه کنید.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <h4 className="font-semibold text-white">{exp.description}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span>پرداخت‌کننده: {members.find((m) => m.id === exp.payerName)?.name || exp.payerName}</span>
                    <span>•</span>
                    <span>{formatJalali(exp.date)}</span>
                    <span>•</span>
                    <span className="text-purple-400">
                      {exp.splitType === 'equal' ? 'تقسیم مساوی' : 'تقسیم درصدی'}
                    </span>
                  </div>
                </div>

                <div className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                  {formatToman(exp.amount)} تومان
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* مودال مدیریت اعضای گروه */}
      <ManageMembersModal
        isOpen={isManageMembersOpen}
        onClose={() => setIsManageMembersOpen(false)}
        members={members}
        onSaveMembers={handleSaveMembers}
      />
    </div>
  );
};
