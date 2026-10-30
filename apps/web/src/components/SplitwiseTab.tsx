import React, { useState } from 'react';
import {
  Users,
  PlusCircle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  UserCheck,
  Sparkles,
} from 'lucide-react';

interface MemberBalance {
  id: string;
  name: string;
  netBalance: number; // مثبت طلبکار، منفی بدهکار
  totalPaid: number;
  totalShare: number;
}

interface SettlementItem {
  id: string;
  fromName: string;
  toName: string;
  amount: number;
}

interface GroupExpenseItem {
  id: string;
  payerName: string;
  description: string;
  amount: number;
  date: string;
  splitCount: number;
}

interface SplitwiseTabProps {
  onOpenAddExpense: () => void;
}

export const SplitwiseTab: React.FC<SplitwiseTabProps> = ({ onOpenAddExpense }) => {
  // دیتای تستی اولیه و پویا بر پایه الگوریتم debt-engine
  const [selectedGroup, setSelectedGroup] = useState<string>('grp_home');

  const [members, setMembers] = useState<MemberBalance[]>([
    { id: 'u_me', name: 'من (کاربر اصلی)', netBalance: 185000, totalPaid: 450000, totalShare: 265000 },
    { id: 'u_reza', name: 'رضا', netBalance: -45000, totalPaid: 120000, totalShare: 165000 },
    { id: 'u_sara', name: 'سارا', netBalance: -140000, totalPaid: 0, totalShare: 140000 },
  ]);

  const [settlements, setSettlements] = useState<SettlementItem[]>([
    { id: 'set_1', fromName: 'سارا', toName: 'من (شما)', amount: 140000 },
    { id: 'set_2', fromName: 'رضا', toName: 'من (شما)', amount: 45000 },
  ]);

  const [expenses, setExpenses] = useState<GroupExpenseItem[]>([
    {
      id: 'exp_1',
      payerName: 'من (شما)',
      description: 'خرید مواد غذایی سوپرمارکت',
      amount: 340000,
      date: 'امروز، ۱۱:۳۰',
      splitCount: 3,
    },
    {
      id: 'exp_2',
      payerName: 'رضا',
      description: 'اسنپ و حمل و نقل گروهی',
      amount: 120000,
      date: 'دیروز، ۱۹:۱۵',
      splitCount: 2,
    },
    {
      id: 'exp_3',
      payerName: 'من (شما)',
      description: 'کافه و شیرینی عصرانه',
      amount: 110000,
      date: '۲ روز پیش',
      splitCount: 3,
    },
  ]);

  const [settledSuccess, setSettledSuccess] = useState<string | null>(null);

  const formatToman = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount);
  };

  const myBalance = members.find((m) => m.id === 'u_me')?.netBalance ?? 0;

  const handleSettle = (settlementId: string) => {
    const item = settlements.find((s) => s.id === settlementId);
    if (!item) return;

    // حذف تسویه انجام شده
    setSettlements((prev) => prev.filter((s) => s.id !== settlementId));
    setSettledSuccess(`تسویه‌حساب با ${item.fromName} به مبلغ ${formatToman(item.amount)} تومان با موفقیت ثبت شد.`);
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

      {/* انتخابگر گروه و دکمه ثبت خرج جدید */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white">مدیریت دنگ گروهی</h2>
          <span className="badge badge-bank text-xs">گروه: خرج‌های خانه</span>
        </div>

        <button
          onClick={onOpenAddExpense}
          className="btn btn-split text-xs sm:text-sm py-2 px-4 shadow-lg shadow-purple-500/20"
        >
          <PlusCircle className="w-4 h-4" />
          <span>ثبت هزینه جدید در گروه</span>
        </button>
      </div>

      {/* بنر تراز شما در این گروه */}
      <div
        className={`glass-card p-5 sm:p-6 border ${
          myBalance >= 0 ? 'border-emerald-500/30' : 'border-rose-500/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
              <span>وضعیت تراز شما در این گروه:</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2">
              <span className={myBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {myBalance >= 0 ? 'شما ' : 'شما '}
                {formatToman(Math.abs(myBalance))} تومان
                {myBalance >= 0 ? ' طلبکارید' : ' بدهکارید'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              محاسبه‌شده با الگوریتم هوشمند Spliit و حداقل تعداد تراکنش‌های تسویه
            </p>
          </div>

          <div className="w-full sm:w-auto flex items-center justify-end">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* بخش تسویه‌حساب‌های بهینه (Optimal Settlements) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-slate-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
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
                className="glass-card p-4 flex items-center justify-between gap-3 border-indigo-500/20 hover:border-indigo-500/40"
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
                    <div className="text-xs text-indigo-400 font-bold mt-0.5">
                      {formatToman(s.amount)} تومان
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSettle(s.id)}
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
          <Users className="w-4 h-4 text-indigo-400" />
          <span>تراز اعضای گروه</span>
        </h3>

        <div className="glass-card divide-y divide-slate-800/80 overflow-hidden">
          {members.map((member) => {
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

      {/* تاریخچه هزینه‌های گروه */}
      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-slate-200 flex items-center gap-2">
          <span>تاریخچه هزینه‌های ثبت‌شده گروه</span>
        </h3>

        <div className="glass-card divide-y divide-slate-800/80 overflow-hidden">
          {expenses.map((exp) => (
            <div key={exp.id} className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-200">{exp.description}</div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span>پرداخت‌کننده: <strong className="text-slate-300">{exp.payerName}</strong></span>
                  <span>•</span>
                  <span>تقسیم بین {exp.splitCount} نفر</span>
                  <span>•</span>
                  <span>{exp.date}</span>
                </div>
              </div>

              <div className="text-sm font-bold font-mono text-purple-300">
                {formatToman(exp.amount)} <span className="text-xs font-normal text-slate-400">تومان</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
