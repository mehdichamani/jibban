import React, { useState } from 'react';
import { Transaction, Category } from '../types.js';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  CreditCard,
  Building2,
  Calendar,
} from 'lucide-react';

interface TransactionsTabProps {
  transactions: Transaction[];
  categories: Category[];
  onOpenSplitModal: (tx: Transaction) => void;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  categories,
  onOpenSplitModal,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // محاسبات خلاصه مالی
  const totalDebit = transactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCredit = transactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalCredit - totalDebit;

  // فیلتر تراکنش‌ها
  const filteredTransactions = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (selectedCategory !== 'all' && t.categoryId !== selectedCategory) return false;
    return true;
  });

  const formatToman = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('fa-IR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-8">
      {/* کارت‌های خلاصه وضعیت مالی */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* ۱. تراز کل / مانده */}
        <div className="glass-card p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-slate-400 font-medium">تراز کنونی حساب</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {formatToman(netBalance >= 0 ? netBalance : Math.abs(netBalance))}
            <span className="text-xs sm:text-sm font-normal text-slate-400 mr-1.5">تومان</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {netBalance >= 0 ? 'موجودی مثبت و پایدار' : 'کسری نسبت به واریزی‌ها'}
          </div>
        </div>

        {/* ۲. واریزی‌های ماه (Credit) */}
        <div className="glass-card p-4 sm:p-5 relative overflow-hidden border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-emerald-400 font-medium">مجموع واریزی‌ها</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 tracking-tight">
            +{formatToman(totalCredit)}
            <span className="text-xs sm:text-sm font-normal text-slate-400 mr-1.5">تومان</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">شامل حقوق، سود و انتقال وجه</div>
        </div>

        {/* ۳. مخارج ماه (Debit) */}
        <div className="glass-card p-4 sm:p-5 relative overflow-hidden border-rose-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-rose-400 font-medium">مجموع مخارج و خرید</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-400 tracking-tight">
            -{formatToman(totalDebit)}
            <span className="text-xs sm:text-sm font-normal text-slate-400 mr-1.5">تومان</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">استخراج‌شده از پیامک‌های بانکی</div>
        </div>
      </div>

      {/* بخش فیلترها و نوار ابزار */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* فیلتر نوع: همه، برداشت، واریز */}
        <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === 'all' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            همه تراکنش‌ها ({transactions.length})
          </button>
          <button
            onClick={() => setFilterType('debit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === 'debit' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            مخارج (برداشت)
          </button>
          <button
            onClick={() => setFilterType('credit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === 'credit' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            درآمد (واریز)
          </button>
        </div>

        {/* فیلتر دسته‌بندی */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field text-xs py-1.5 px-3 bg-slate-900/80 border-slate-700/60 rounded-xl"
          >
            <option value="all">همه دسته‌بندی‌ها</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* فید تراکنش‌ها */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="glass-card p-10 text-center text-slate-400">
            <Building2 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-base font-medium">هیچ تراکنشی با فیلتر انتخابی یافت نشد</p>
            <p className="text-xs text-slate-500 mt-1">
              با استفاده از دکمه «شبیه‌ساز پیامک بانکی» می‌توانید پیامک جدیدی اضافه کنید.
            </p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isCredit = tx.type === 'credit';
            return (
              <div
                key={tx.id}
                className="glass-card p-3.5 sm:p-4 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
              >
                {/* اطلاعات سمت راست: آیکون، نام بانک، پذیرنده، تاریخ */}
                <div className="flex items-start gap-3 w-full sm:w-auto">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      isCredit
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {isCredit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-100 text-sm sm:text-base truncate">
                        {tx.description || (isCredit ? 'واریز وجه' : 'خرید / برداشت')}
                      </span>
                      <span className="badge badge-bank text-[11px] py-0.5">
                        {tx.bankName}
                      </span>
                      {tx.accountNumber && (
                        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          *{tx.accountNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(tx.transactionDate)}
                      </span>
                      {tx.categoryName && (
                        <span className="text-slate-300 font-medium flex items-center gap-1">
                          <span>{tx.categoryIcon || '🏷️'}</span>
                          <span>{tx.categoryName}</span>
                        </span>
                      )}
                      {tx.balance !== undefined && (
                        <span className="text-slate-500 hidden md:inline">
                          مانده: {formatToman(tx.balance)} ت
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* اطلاعات سمت چپ: مبلغ و دکمه جادویی دنگ */}
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                  <div className="text-right">
                    <div
                      className={`text-base sm:text-lg font-bold font-mono tracking-tight ${
                        isCredit ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isCredit ? '+' : '-'}
                      {formatToman(tx.amount)}
                      <span className="text-xs font-normal text-slate-400 mr-1">تومان</span>
                    </div>
                  </div>

                  {/* دکمه جادویی اشتراک‌گذاری در دنگ (فقط برای برداشت و مخارج) */}
                  {!isCredit && (
                    <button
                      onClick={() => onOpenSplitModal(tx)}
                      className="btn btn-split text-xs py-1.5 px-3 rounded-xl shadow-sm hover:scale-105"
                      title="تبدیل آنی این خرج پیامکی به دنگ گروهی"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>اشتراک در دنگ</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
