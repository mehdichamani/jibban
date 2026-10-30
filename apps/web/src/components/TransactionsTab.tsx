import React, { useState } from 'react';
import { Transaction, Category, Account } from '../types.js';
import { formatJalali } from '../lib/date.js';
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
  Hash,
  ArrowRight,
} from 'lucide-react';

interface TransactionsTabProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  selectedAccountId?: string | null;
  onSelectAccount?: (id: string | null) => void;
  onOpenAddModal: () => void;
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
  onOpenSplitModal,
  onDeleteTransaction,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit' | 'transfer'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [internalAccountId, setInternalAccountId] = useState<string>(selectedAccountId || 'all');

  // همگام‌سازی اکانت انتخاب شده از پراپ
  const currentAccountId = selectedAccountId !== undefined ? (selectedAccountId || 'all') : internalAccountId;

  const handleAccountChange = (accId: string) => {
    setInternalAccountId(accId);
    if (onSelectAccount) {
      onSelectAccount(accId === 'all' ? null : accId);
    }
  };

  // محاسبات خلاصه مالی
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
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (selectedCategory !== 'all' && t.categoryId !== selectedCategory) return false;
    if (currentAccountId !== 'all') {
      if (t.fromAccountId !== currentAccountId && t.toAccountId !== currentAccountId) return false;
    }
    return true;
  });

  const formatToman = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount);
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
            <span className="text-xs sm:text-sm text-slate-400 font-medium">تراز کل دوره</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {formatToman(netBalance >= 0 ? netBalance : Math.abs(netBalance))}
            <span className="text-xs sm:text-sm font-normal text-slate-400 mr-1.5">تومان</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {netBalance >= 0 ? 'مازاد درآمد بر هزینه‌ها' : 'کسری نسبت به واریزی‌ها'}
          </div>
        </div>

        {/* ۲. واریزی‌ها / درآمدها (Credit) */}
        <div className="glass-card p-4 sm:p-5 relative overflow-hidden border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-emerald-400 font-medium">مجموع درآمد و واریزی‌ها</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 tracking-tight">
            +{formatToman(totalCredit)}
            <span className="text-xs sm:text-sm font-normal text-slate-400 mr-1.5">تومان</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">واریزی به حساب‌های مقصد کاربر</div>
        </div>

        {/* ۳. مخارج / برداشت‌ها (Debit) */}
        <div className="glass-card p-4 sm:p-5 relative overflow-hidden border-rose-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-rose-400 font-medium">مجموع مخارج و برداشت‌ها</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-400 tracking-tight">
            -{formatToman(totalDebit)}
            <span className="text-xs sm:text-sm font-normal text-slate-400 mr-1.5">تومان</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">برداشت از حساب‌های مبدأ</div>
        </div>
      </div>

      {/* نوار اقدام اصلی و فیلترها */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* فیلتر نوع تراکنش */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-2xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              filterType === 'all'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            همه ({transactions.length})
          </button>
          <button
            onClick={() => setFilterType('debit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              filterType === 'debit'
                ? 'bg-rose-500 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            مخارج (هزینه)
          </button>
          <button
            onClick={() => setFilterType('credit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              filterType === 'credit'
                ? 'bg-emerald-500 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            درآمدها (واریز)
          </button>
          <button
            onClick={() => setFilterType('transfer')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              filterType === 'transfer'
                ? 'bg-indigo-500 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-indigo-400'
            }`}
          >
            انتقال‌ها
          </button>
        </div>

        {/* دکمه ثبت تراکنش جدید */}
        <button
          onClick={onOpenAddModal}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-sky-500/20 transition shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>ثبت تراکنش حسابداری</span>
        </button>
      </div>

      {/* فیلترهای تکمیلی: فیلتر حساب مالی و فیلتر دسته‌بندی */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* فیلتر بر اساس حساب مبدأ یا مقصد */}
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

        {/* فیلتر بر اساس دسته‌بندی */}
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

          return (
            <div
              key={tx.id}
              className="glass-card p-4 transition hover:border-slate-700/80 hover:bg-slate-900/70"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {/* آیکون نوع تراکنش */}
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isDebit
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                        : isCredit
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                        : 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                    }`}
                  >
                    {isDebit && <ArrowDownLeft className="w-5 h-5" />}
                    {isCredit && <ArrowUpRight className="w-5 h-5" />}
                    {isTransfer && <ArrowLeftRight className="w-5 h-5" />}
                  </div>

                  {/* شرح و اطلاعات حسابداری */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-white">
                        {tx.description || tx.categoryName || (isTransfer ? 'انتقال وجه' : 'تراکنش مالی')}
                      </h4>

                      {/* بج دسته‌بندی */}
                      {tx.categoryName && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                          <span>{tx.categoryIcon || '🏷️'}</span>
                          <span>{tx.categoryName}</span>
                        </span>
                      )}

                      {/* کد پیگیری */}
                      {tx.trackingCode && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 font-mono">
                          <Hash className="w-3 h-3" />
                          <span>{tx.trackingCode}</span>
                        </span>
                      )}
                    </div>

                    {/* مسیر انتقال وجه: حساب مبدأ ➔ حساب مقصد */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
                      {/* حساب مبدأ */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950/80 border border-slate-800 font-medium">
                        <span className="text-[10px] text-slate-500">از:</span>
                        <span style={{ color: tx.fromAccountColor || '#38bdf8' }}>
                          {tx.fromAccountName || tx.bankName || 'حساب مبدأ'}
                        </span>
                      </span>

                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 rotate-180" />

                      {/* حساب مقصد */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950/80 border border-slate-800 font-medium">
                        <span className="text-[10px] text-slate-500">به:</span>
                        <span style={{ color: tx.toAccountColor || '#34d399' }}>
                          {tx.toAccountName || (isDebit ? (tx.categoryName || 'پذیرنده/هزینه') : 'حساب مقصد')}
                        </span>
                      </span>
                    </div>

                    <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span title={formatJalali(tx.transactionDate, 'full')}>{formatDate(tx.transactionDate)}</span>
                      {tx.accountNumber && (
                        <span>• کارت: ****{tx.accountNumber}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* مبلغ و دکمه‌های عملیات */}
                <div className="text-left flex flex-col items-end shrink-0">
                  <div
                    className={`text-base sm:text-lg font-bold font-mono tracking-tight ${
                      isDebit
                        ? 'text-rose-400'
                        : isCredit
                        ? 'text-emerald-400'
                        : 'text-sky-400'
                    }`}
                  >
                    {isDebit ? '-' : isCredit ? '+' : '⇄'}
                    {formatToman(tx.amount)}
                    <span className="text-[11px] font-normal text-slate-400 mr-1">تومان</span>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5">
                    {/* دکمه تبدیل به دنگ (فقط برای هزینه‌ها) */}
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
                        if (confirm('آیا از حذف این تراکنش و برگشت اثر مالی آن اطمینان دارید؟')) {
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
                <h3 className="text-base font-bold text-slate-200">دفتر کل خالی است (شروع با وضعیت تمیز)</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  تمام داده‌های تستی اولیه پاک شدند. اکنون می‌توانید اولین تراکنش حسابداری واقعی خود را ثبت کنید یا با دریافت پیامک‌های بانکی آن را پر کنید.
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
