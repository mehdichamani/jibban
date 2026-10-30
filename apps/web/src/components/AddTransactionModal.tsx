import React, { useState } from 'react';
import { Account, Category } from '../types.js';
import { X, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Check, Calendar, Hash, FileText } from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  onAddTransaction: (data: {
    amount: number;
    type: 'debit' | 'credit' | 'transfer';
    fromAccountId?: string;
    toAccountId?: string;
    categoryId?: string;
    description?: string;
    trackingCode?: string;
    transactionDate?: string;
  }) => Promise<void>;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  onAddTransaction,
}) => {
  if (!isOpen) return null;

  const [type, setType] = useState<'debit' | 'credit' | 'transfer'>('debit');
  const [amount, setAmount] = useState<string>('');
  const [fromAccountId, setFromAccountId] = useState<string>(
    accounts.find((a) => a.isSource && a.type !== 'counterparty')?.id || accounts[0]?.id || ''
  );
  const [toAccountId, setToAccountId] = useState<string>(
    accounts.find((a) => a.isDestination && a.id !== fromAccountId)?.id || ''
  );
  const [categoryId, setCategoryId] = useState<string>('cat_supermarket');
  const [description, setDescription] = useState<string>('');
  const [trackingCode, setTrackingCode] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const formatNumberWithCommas = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    if (!raw) return '';
    return new Intl.NumberFormat('fa-IR').format(parseInt(raw, 10));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setAmount(raw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await onAddTransaction({
        amount: numAmount,
        type,
        fromAccountId: fromAccountId || undefined,
        toAccountId: toAccountId || undefined,
        categoryId: categoryId || undefined,
        description: description.trim() || undefined,
        trackingCode: trackingCode.trim() || undefined,
        transactionDate: new Date(transactionDate).toISOString(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // فیلتر حساب‌های مجاز برای مبدا و مقصد
  const sourceAccounts = accounts.filter((a) => {
    if (type === 'credit') return true; // در درآمد، طرف حساب یا کارفرما می‌تواند مبدا باشد
    return a.isSource;
  });

  const destinationAccounts = accounts.filter((a) => {
    if (type === 'debit') return true; // در هزینه، فروشگاه یا هر حساب می‌تواند مقصد باشد
    return a.isDestination && (type !== 'transfer' || a.id !== fromAccountId);
  });

  const filteredCategories = categories.filter((c) => {
    if (type === 'credit') return c.isIncome || c.type === 'income';
    if (type === 'transfer') return c.type === 'transfer' || c.id === 'cat_transfer';
    return !c.isIncome && c.type !== 'transfer';
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* هدر */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">ثبت تراکنش حسابداری</h3>
            <p className="text-xs text-slate-400">ثبت گردش مالی با تفکیک حساب‌های مبدأ و مقصد</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* تب‌های نوع تراکنش */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setType('debit');
              setCategoryId('cat_supermarket');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
              type === 'debit'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-rose-400" />
            <span>هزینه (برداشت)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setType('credit');
              setCategoryId('cat_salary');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
              type === 'credit'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            <span>درآمد (واریز)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setType('transfer');
              setCategoryId('cat_transfer');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
              type === 'transfer'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 text-sky-400" />
            <span>انتقال بین‌حسابی</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* مبلغ */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">مبلغ تراکنش (تومان):</label>
              {amount && parseInt(amount, 10) > 0 && (
                <span className="text-xs text-sky-400 font-mono font-bold">
                  {formatNumberWithCommas(amount)} تومان
                </span>
              )}
            </div>
            <input
              type="text"
              required
              autoFocus
              value={amount ? formatNumberWithCommas(amount) : ''}
              onChange={handleAmountChange}
              placeholder="مثلاً: ۲۵۰,۰۰۰"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm sm:text-base text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500 text-left"
            />
          </div>

          {/* حساب مبدأ و حساب مقصد */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* حساب مبدأ */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                {type === 'credit' ? 'حساب یا شخص مبدأ (واریزکننده):' : 'حساب مبدأ (برداشت از):'}
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="">(انتخاب نشده)</option>
                {sourceAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} {acc.balance ? `(${new Intl.NumberFormat('fa-IR').format(acc.balance)} ت)` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* حساب مقصد */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                {type === 'debit' ? 'حساب مقصد یا پذیرنده:' : 'حساب مقصد (واریز به):'}
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="">(انتخاب نشده)</option>
                {destinationAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} {acc.balance ? `(${new Intl.NumberFormat('fa-IR').format(acc.balance)} ت)` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* دسته‌بندی تراکنش */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">دسته‌بندی تراکنش:</label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
              {filteredCategories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                      isSelected
                        ? 'border-sky-500 bg-sky-500/20 text-sky-300 shadow-sm'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* تاریخ و شرح */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">تاریخ و ساعت:</label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">کد پیگیری / ارجاع (اختیاری):</label>
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="مثلاً: ۹۸۴۵۱۲"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono text-left focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">شرح و بابت تراکنش:</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثلاً: خرید میوه، ناهار شرکت، کارت به کارت برای اجاره..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* دکمه‌های اقدام */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !amount}
              className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm transition shadow-lg shadow-sky-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'در حال ثبت...' : 'ثبت قطعی در دفتر حسابداری'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs sm:text-sm font-semibold transition"
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
