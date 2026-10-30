import React from 'react';
import { Transaction, Category, Account } from '../types.js';
import { PieChart, TrendingUp, TrendingDown, Award, Tag, Landmark, Wallet, ArrowLeftRight } from 'lucide-react';

interface AnalyticsTabProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ transactions, categories, accounts }) => {
  const debitTransactions = transactions.filter((t) => t.type === 'debit');
  const creditTransactions = transactions.filter((t) => t.type === 'credit');
  const transferTransactions = transactions.filter((t) => t.type === 'transfer');

  const totalDebit = debitTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalCredit = creditTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalTransfer = transferTransactions.reduce((acc, t) => acc + t.amount, 0);

  // تجمیع هزینه‌ها بر حسب دسته‌بندی
  const categorySpendingMap = new Map<string, number>();
  for (const tx of debitTransactions) {
    const catId = tx.categoryId || 'cat_other';
    categorySpendingMap.set(catId, (categorySpendingMap.get(catId) || 0) + tx.amount);
  }

  const categoryBreakdown = Array.from(categorySpendingMap.entries())
    .map(([catId, amount]) => {
      const cat = categories.find((c) => c.id === catId);
      const percentage = totalDebit > 0 ? Math.round((amount / totalDebit) * 100) : 0;
      return {
        id: catId,
        name: cat?.name || 'متفرقه',
        icon: cat?.icon || '📦',
        color: cat?.color || '#38bdf8',
        amount,
        percentage,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // تجمیع هزینه‌ها بر حسب حساب‌های مبدأ
  const accountSpendingMap = new Map<string, number>();
  for (const tx of debitTransactions) {
    const accId = tx.fromAccountId || 'unknown';
    accountSpendingMap.set(accId, (accountSpendingMap.get(accId) || 0) + tx.amount);
  }

  const accountBreakdown = Array.from(accountSpendingMap.entries())
    .map(([accId, amount]) => {
      const acc = accounts.find((a) => a.id === accId);
      const percentage = totalDebit > 0 ? Math.round((amount / totalDebit) * 100) : 0;
      return {
        id: accId,
        name: acc?.name || 'حساب مبدأ',
        color: acc?.color || '#38bdf8',
        amount,
        percentage,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const formatToman = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount);
  };

  const topCategory = categoryBreakdown[0];

  // محاسبه کل دارایی‌های مثبت
  const totalAssets = accounts
    .filter((a) => a.type !== 'counterparty')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  return (
    <div className="space-y-6 pb-24 sm:pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-bold text-white">گزارش تراز و تحلیل حسابداری</h2>
        </div>
        <span className="badge badge-bank text-xs">دفتر کل و آمار گردش مالی</span>
      </div>

      {/* خلاصه نسبت درآمد به مخارج */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>نسبت دخل به خرج (تراز عملیاتی)</span>
            <span className="text-emerald-400 font-bold">
              {totalCredit > 0 ? Math.round(((totalCredit - totalDebit) / totalCredit) * 100) : 0}% پس‌انداز
            </span>
          </div>

          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{
                width: `${totalCredit > 0 ? Math.min(100, Math.round((totalCredit / (totalCredit + totalDebit || 1)) * 100)) : 50}%`,
              }}
              title="واریز"
            />
            <div
              className="bg-rose-500 h-full transition-all"
              style={{
                width: `${totalDebit > 0 ? Math.min(100, Math.round((totalDebit / (totalCredit + totalDebit || 1)) * 100)) : 50}%`,
              }}
              title="برداشت"
            />
          </div>

          <div className="flex items-center justify-between mt-3 text-xs">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              درآمد: {formatToman(totalCredit)} ت
            </span>
            <span className="text-rose-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              مخارج: {formatToman(totalDebit)} ت
            </span>
          </div>
        </div>

        {/* بیشترین هزینه انجام شده */}
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400">بیشترین سرفصل مخارج:</div>
            {topCategory ? (
              <>
                <div className="text-base font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
                  <span>{topCategory.icon}</span>
                  <span>{topCategory.name}</span>
                </div>
                <div className="text-xs text-amber-400 font-bold mt-0.5">
                  {formatToman(topCategory.amount)} تومان ({topCategory.percentage}٪ کل مخارج)
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400 mt-1">تراکنشی ثبت نشده است</div>
            )}
          </div>
        </div>
      </div>

      {/* تفکیک موجودی و دارایی‌ها به تفکیک حساب‌های مالی */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Landmark className="w-4 h-4 text-sky-400" />
          <span>تراز موجودی حساب‌های مالی (توزیع دارایی‌ها)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts
            .filter((a) => a.type !== 'counterparty')
            .map((acc) => {
              const pct = totalAssets > 0 ? Math.round(((acc.balance || 0) / totalAssets) * 100) : 0;
              return (
                <div
                  key={acc.id}
                  className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">{acc.name}</span>
                    <span className="font-mono text-sky-400 font-semibold">{pct}٪</span>
                  </div>
                  <div className="text-sm sm:text-base font-bold text-white font-mono">
                    {formatToman(acc.balance || 0)} <span className="text-[10px] text-slate-400 font-normal">ت</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: acc.color || '#38bdf8' }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* تفکیک دسته‌بندی‌های هزینه (Progress Bars) */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Tag className="w-4 h-4 text-sky-400" />
          <span>سهم دسته‌بندی‌ها از کل مخارج</span>
        </h3>

        {categoryBreakdown.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">هنوز تراکنش هزینه‌ای ثبت نشده است</div>
        ) : (
          <div className="space-y-3.5">
            {categoryBreakdown.map((item) => (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.icon}</span>
                    <span className="font-semibold text-slate-200">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-300 font-bold">
                      {formatToman(item.amount)} <span className="text-[10px] text-slate-400 font-normal">ت</span>
                    </span>
                    <span className="text-xs font-bold text-sky-400 w-9 text-left">
                      {item.percentage}٪
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
