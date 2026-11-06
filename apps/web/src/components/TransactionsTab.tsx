import React, { useState } from 'react';
import { Transaction, Category, Account } from '../types.js';
import { formatJalali } from '../lib/date.js';
import { formatToman as formatTomanCurrency } from '../lib/currency.js';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Filter,
  CreditCard,
  Building2,
  Calendar,
  PlusCircle,
  Trash2,
  Edit2,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface TransactionsTabProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  selectedAccountId?: string | null;
  onSelectAccount?: (id: string | null) => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (tx: Transaction) => void;
  onOpenSplitModal: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  categories,
  accounts,
  selectedAccountId,
  onSelectAccount,
  onOpenAddModal,
  onOpenEditModal,
  onOpenSplitModal,
  onDeleteTransaction,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit' | 'transfer' | 'compound'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [internalAccountId, setInternalAccountId] = useState<string>(selectedAccountId || 'all');
  const [expandedCompoundIds, setExpandedCompoundIds] = useState<Set<string>>(new Set());

  const currentAccountId = selectedAccountId !== undefined ? (selectedAccountId || 'all') : internalAccountId;

  const handleAccountChange = (accId: string) => {
    setInternalAccountId(accId);
    if (onSelectAccount) {
      onSelectAccount(accId === 'all' ? null : accId);
    }
  };

  const toggleCompoundExpand = (id: string) => {
    setExpandedCompoundIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // محاسبات خلاصه مالی دوره
  const totalDebit = transactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCredit = transactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalTransfer = transactions
    .filter((t) => t.type === 'transfer')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalCredit - totalDebit;

  // فیلتر تراکنش‌ها
  const filteredTransactions = transactions.filter((t) => {
    if (filterType !== 'all') {
      if (filterType === 'compound' && !t.isCompound && t.type !== 'compound') return false;
      if (filterType !== 'compound' && t.type !== filterType) return false;
    }
    if (selectedCategory !== 'all') {
      const hasCat = t.categoryId === selectedCategory || t.items?.some((i) => i.categoryId === selectedCategory);
      if (!hasCat) return false;
    }
    if (currentAccountId !== 'all') {
      const hasAcc =
        t.fromAccountId === currentAccountId ||
        t.toAccountId === currentAccountId ||
        t.items?.some((i) => i.accountId === currentAccountId);
      if (!hasAcc) return false;
    }
    return true;
  });

  const formatToman = (amount: number) => {
    return formatTomanCurrency(amount, { showUnit: false });
  };

  const formatDate = (dateStr: string) => {
    return formatJalali(dateStr, 'relative');
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-8">
      {/* کارت‌های خلاصه وضعیت مالی و تراز */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* ۱. تراز کل / مانده */}
        <div className="glass-card p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-slate-400 font-medium">تراز کل دوره ۱۴۰۵</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
                netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatToman(Math.abs(netBalance))}
            </span>
            <span className="text-xs text-slate-400">تومان</span>
          </div>
        </div>

        {/* ۲. کل دریافتی‌ها */}
        <div className="glass-card p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-slate-400 font-medium">مجموع واریزی‌ها</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tracking-tight">
              {formatToman(totalCredit)}
            </span>
            <span className="text-xs text-slate-400">تومان</span>
          </div>
        </div>

        {/* ۳. کل پرداختی‌ها */}
        <div className="glass-card p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-slate-400 font-medium">مجموع هزینه‌ها</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-rose-400 tracking-tight">
              {formatToman(totalDebit)}
            </span>
            <span className="text-xs text-slate-400">تومان</span>
          </div>
        </div>
      </div>

      {/* نوار فیلتر و جستجو */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              filterType === 'all'
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            همه ({transactions.length})
          </button>
          <button
            onClick={() => setFilterType('debit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              filterType === 'debit'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            هزینه‌ها
          </button>
          <button
            onClick={() => setFilterType('credit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              filterType === 'credit'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            درآمدها
          </button>
          <button
            onClick={() => setFilterType('transfer')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              filterType === 'transfer'
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            انتقال‌ها
          </button>
          <button
            onClick={() => setFilterType('compound')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              filterType === 'compound'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            مرکب (چند حسابی)
          </button>
        </div>

        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-lg shadow-sky-500/20 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>ثبت تراکنش</span>
        </button>
      </div>

      {/* فیلترهای حساب و دسته */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
          <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-400 whitespace-nowrap">فیلتر حساب:</span>
          <select
            value={currentAccountId}
            onChange={(e) => handleAccountChange(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-200 focus:outline-none"
          >
            <option value="all" className="bg-slate-900">همه حساب‌های مالی (مبدا یا مقصد)</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id} className="bg-slate-900">
                {acc.name} ({formatToman(acc.balance || 0)} ت)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-400 whitespace-nowrap">دسته‌بندی:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-200 focus:outline-none"
          >
            <option value="all" className="bg-slate-900">همه دسته‌ها</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900">
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* لیست تراکنش‌های حسابداری */}
      <div className="space-y-3">
        {filteredTransactions.map((tx) => {
          const isDebit = tx.type === 'debit';
          const isCredit = tx.type === 'credit';
          const isTransfer = tx.type === 'transfer';
          const isCompound = tx.isCompound || tx.type === 'compound';
          const isExpanded = expandedCompoundIds.has(tx.id);

          return (
            <div
              key={tx.id}
              className="glass-card p-4 transition hover:border-slate-700/80 hover:bg-slate-900/70"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* آیکون نوع تراکنش */}
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isCompound
                        ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                        : isDebit
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                        : isCredit
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                        : 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                    }`}
                  >
                    {isCompound && <Layers className="w-5 h-5" />}
                    {!isCompound && isDebit && <ArrowDownLeft className="w-5 h-5" />}
                    {!isCompound && isCredit && <ArrowUpRight className="w-5 h-5" />}
                    {!isCompound && isTransfer && <ArrowLeftRight className="w-5 h-5" />}
                  </div>

                  {/* شرح و اطلاعات حسابداری */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-white truncate max-w-md">
                        {tx.description || tx.categoryName || (isCompound ? 'سند مرکب چند حسابی' : isTransfer ? 'انتقال وجه' : 'تراکنش مالی')}
                      </h4>

                      {/* بج نوع سند مرکب */}
                      {isCompound && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-purple-900/50 text-purple-300 border border-purple-700/50">
                          <span>سند چند حسابی</span>
                          {tx.items && <span>({tx.items.length} ردیف)</span>}
                        </span>
                      )}

                      {/* بج دسته‌بندی */}
                      {tx.categoryName && !isCompound && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                          <span>{tx.categoryIcon || '🏷️'}</span>
                          <span>{tx.categoryName}</span>
                        </span>
                      )}

                      {/* بج طرف‌حساب */}
                      {tx.counterpartyName && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-amber-300">
                          <span>👤 {tx.counterpartyName}</span>
                        </span>
                      )}
                    </div>

                    {/* مسیر انتقال وجه: همه حساب‌های مبدا و مقصد */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
                      {tx.fromAccountName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950/80 border border-slate-800 font-medium">
                          <span className="text-[10px] text-slate-500">مبدأ:</span>
                          <span style={{ color: tx.fromAccountColor || '#38bdf8' }}>
                            {tx.fromAccountName}
                          </span>
                        </span>
                      )}

                      {tx.toAccountName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950/80 border border-slate-800 font-medium">
                          <span className="text-[10px] text-slate-500">مقصد:</span>
                          <span style={{ color: tx.toAccountColor || '#34d399' }}>
                            {tx.toAccountName}
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{tx.shamsiDate || formatDate(tx.transactionDate)}</span>
                      {tx.time && <span>• ساعت {tx.time.slice(0, 5)}</span>}
                    </div>

                    {/* دکمه باز کردن ریز اقلام سند مرکب */}
                    {isCompound && tx.items && tx.items.length > 0 && (
                      <button
                        onClick={() => toggleCompoundExpand(tx.id)}
                        className="mt-2 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span>{isExpanded ? 'بستن ریز اقلام سند' : 'مشاهده ریز اقلام و تسهیم‌ها'}</span>
                      </button>
                    )}

                    {/* نمایش اقلام سند مرکب در صورت باز بودن */}
                    {isCompound && isExpanded && tx.items && (
                      <div className="mt-3 p-3 bg-slate-950/70 rounded-xl border border-purple-900/40 space-y-2">
                        <span className="text-[11px] font-bold text-slate-400 block mb-1">ریز ردیف‌های سند دوبل:</span>
                        {tx.items.map((it) => (
                          <div key={it.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${it.entryType === 'source' ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                                {it.entryType === 'source' ? 'بدهکار (مبدأ)' : 'بستانکار (مقصد)'}
                              </span>
                              <span className="text-slate-300 font-medium">
                                {it.accountName || it.categoryName || it.counterpartyName || it.description || 'ردیف'}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-slate-200">
                              {formatToman(it.amount)} ت
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* مبلغ و دکمه‌های عملیات */}
                <div className="text-left flex flex-col items-end shrink-0">
                  <div
                    className={`text-base sm:text-lg font-bold font-mono tracking-tight ${
                      isCompound
                        ? 'text-purple-300'
                        : isDebit
                        ? 'text-rose-400'
                        : isCredit
                        ? 'text-emerald-400'
                        : 'text-sky-400'
                    }`}
                  >
                    {isCompound ? '∑ ' : isDebit ? '-' : isCredit ? '+' : '⇄'}
                    {formatToman(tx.amount)}
                    <span className="text-[11px] font-normal text-slate-400 mr-1">تومان</span>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5">
                    {/* دکمه ویرایش و اصلاح تراکنش */}
                    <button
                      onClick={() => onOpenEditModal(tx)}
                      title="ویرایش و اصلاح تراکنش"
                      className="p-1 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* دکمه تبدیل به دنگ */}
                    {isDebit && (
                      <button
                        onClick={() => onOpenSplitModal(tx)}
                        title="تقسیم به عنوان دنگ گروهی"
                        className="inline-flex items-center gap-1 text-[11px] bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 px-2 py-1 rounded-lg transition"
                      >
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <span>تبدیل به دنگ</span>
                      </button>
                    )}

                    {/* دکمه حذف تراکنش */}
                    <button
                      onClick={() => {
                        if (confirm('آیا از حذف این تراکنش و اصلاح مانده حساب‌ها اطمینان دارید؟')) {
                          onDeleteTransaction(tx.id);
                        }
                      }}
                      title="حذف تراکنش"
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTransactions.length === 0 && (
          <div className="glass-card p-10 sm:p-14 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center mx-auto">
              <Building2 className="w-7 h-7" />
            </div>
            {transactions.length === 0 ? (
              <>
                <h3 className="text-base font-bold text-slate-200">هیچ تراکنشی یافت نشد</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  می‌توانید با دکمه ثبت تراکنش یا پردازش پیامک‌های بانکی تراکنش جدید ایجاد کنید.
                </p>
                <div className="pt-2">
                  <button
                    onClick={onOpenAddModal}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-sky-500/20 transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>ثبت اولین تراکنش</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-300 font-medium">هیچ تراکنشی با فیلترهای انتخابی تطابق ندارد.</p>
                <p className="text-xs text-slate-500">فیلتر حساب یا نوع تراکنش را تغییر دهید.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
