import React from 'react';
import { Transaction, Account } from '../types.js';
import { PieChart, Award, Landmark } from 'lucide-react';
import { formatToman as formatTomanCurrency } from '../lib/currency.js';

interface AnalyticsTabProps {
  transactions: Transaction[];
  accounts: Account[];
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ transactions, accounts }) => {
  const debitTransactions = transactions.filter((t) => t.type === 'debit');
  const creditTransactions = transactions.filter((t) => t.type === 'credit');

  const totalDebit = debitTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalCredit = creditTransactions.reduce((acc, t) => acc + t.amount, 0);

  // تجمیع مخارج فقط از اسناد هزینه (debit) و اقلام مرکب هزینه
  const destinationSpendingMap = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.isCompound && tx.items) {
      for (const it of tx.items) {
        if ((it.entryType === 'destination' || !it.entryType) && it.accountId) {
          const acc = accounts.find((a) => a.id === it.accountId);
          if (!acc || acc.type === 'expense') {
            destinationSpendingMap.set(it.accountId, (destinationSpendingMap.get(it.accountId) || 0) + it.amount);
          }
        }
      }
    } else if (tx.type === 'debit' && tx.toAccountId) {
      destinationSpendingMap.set(tx.toAccountId, (destinationSpendingMap.get(tx.toAccountId) || 0) + tx.amount);
    }
  }

  const destinationBreakdown = Array.from(destinationSpendingMap.entries())
    .map(([accId, amount]) => {
      const acc = accounts.find((a) => a.id === accId);
      const percentage = totalDebit > 0 ? Math.round((amount / totalDebit) * 100) : 0;
      return {
        id: accId,
        name: acc?.name || 'سرفصل هزینه',
        icon: acc?.icon || '🏷️',
        color: acc?.color || '#38bdf8',
        amount,
        percentage,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const formatToman = (rialAmount: number) => {
    return formatTomanCurrency(rialAmount, { showUnit: false });
  };

  const topDestination = destinationBreakdown[0];

  // فقط حساب‌های برگ دارایی (بانک/صندوق/پس‌انداز) با مانده مثبت
  const parentIds = new Set(accounts.map((a) => a.parentId).filter(Boolean));
  const assetAccounts = accounts.filter(
    (a) =>
      (a.type === 'bank' || a.type === 'wallet' || a.type === 'savings') &&
      !parentIds.has(a.id) &&
      (a.balance || 0) > 0
  );
  const totalAssets = assetAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

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
                width: `${totalCredit + totalDebit > 0 ? Math.round((totalCredit / (totalCredit + totalDebit)) * 100) : 0}%`,
              }}
              title="واریز"
            />
            <div
              className="bg-rose-500 h-full transition-all"
              style={{
                width: `${totalCredit + totalDebit > 0 ? Math.round((totalDebit / (totalCredit + totalDebit)) * 100) : 0}%`,
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
            <div className="text-xs text-slate-400">بیشترین سرفصل مقصد مخارج:</div>
            {topDestination ? (
              <>
                <div className="text-base font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
                  <span>{topDestination.name}</span>
                </div>
                <div className="text-xs text-amber-400 font-bold mt-0.5">
                  {formatToman(topDestination.amount)} تومان ({topDestination.percentage}٪ کل مخارج)
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
          {assetAccounts.map((acc) => {
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

      {/* تفکیک حساب‌های مقصد هزینه */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Landmark className="w-4 h-4 text-sky-400" />
          <span>سهم حساب‌های مقصد از کل مخارج</span>
        </h3>

        {destinationBreakdown.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">هنوز تراکنش هزینه‌ای ثبت نشده است</div>
        ) : (
          <div className="space-y-3.5">
            {destinationBreakdown.slice(0, 10).map((item) => (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-400 text-xs">{item.percentage}٪</span>
                    <span className="font-bold text-slate-100">{formatToman(item.amount)} ت</span>
                  </div>
                </div>
                <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color || '#38bdf8',
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
