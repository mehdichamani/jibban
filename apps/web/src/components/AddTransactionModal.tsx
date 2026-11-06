import React, { useState } from 'react';
import { Account } from '../types.js';
import { X, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Check } from 'lucide-react';
import { JalaliDatePicker } from './JalaliDatePicker.js';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onAddTransaction: (data: {
    amount: number;
    type: 'debit' | 'credit' | 'transfer';
    fromAccountId?: string;
    toAccountId?: string;
    description?: string;
    trackingCode?: string;
    transactionDate?: string;
  }) => Promise<void>;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onAddTransaction,
}) => {
  if (!isOpen) return null;

  const [type, setType] = useState<'debit' | 'credit' | 'transfer'>('debit');
  const [amount, setAmount] = useState<string>('');
  const [fromAccountId, setFromAccountId] = useState<string>(
    accounts.find((a) => a.type === 'bank' || a.type === 'wallet')?.id || accounts[0]?.id || ''
  );
  const [toAccountId, setToAccountId] = useState<string>(
    accounts.find((a) => a.type === 'expense')?.id || accounts[1]?.id || ''
  );
  const [description, setDescription] = useState<string>('');
  const [trackingCode, setTrackingCode] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(() =>
    new Date().toISOString()
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const formatNumberWithCommas = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    if (!raw) return '';
    return Number(raw).toLocaleString('en-US');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(formatNumberWithCommas(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = parseInt(amount.replace(/,/g, ''), 10);
    if (isNaN(raw) || raw <= 0) {
      alert('لطفاً مبلغ معتبری به تومان وارد کنید');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddTransaction({
        amount: raw * 10, // تبدیل تومان ورودی کاربر به ریال
        type,
        fromAccountId: fromAccountId || undefined,
        toAccountId: toAccountId || undefined,
        description: description.trim() || undefined,
        trackingCode: trackingCode.trim() || undefined,
        transactionDate: new Date(transactionDate).toISOString(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const sourceAccounts = accounts.filter(
    (a) => a.type === 'bank' || a.type === 'wallet' || a.type === 'savings' || a.type === 'income' || a.type === 'debt'
  );
  const destAccounts = accounts.filter(
    (a) => a.type === 'expense' || a.type === 'bank' || a.type === 'wallet' || a.type === 'savings' || a.type === 'debt'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-lg p-5 sm:p-6 border-slate-700/80 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white">ثبت سند مالی جدید</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* نوع سند */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">نوع سند</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('debit')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition border ${
                  type === 'debit'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>برداشت (هزینه)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('credit')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition border ${
                  type === 'credit'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>واریز (درآمد)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('transfer')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition border ${
                  type === 'transfer'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>انتقال بین‌حسابی</span>
              </button>
            </div>
          </div>

          {/* مبلغ */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">مبلغ سند (تومان)</label>
            <div className="relative">
              <input
                type="text"
                dir="ltr"
                value={amount}
                onChange={handleAmountChange}
                placeholder="مثلاً: ۵۰,۰۰۰"
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl py-2.5 pl-3 pr-14 text-white text-base font-bold font-mono focus:outline-none focus:border-sky-500 transition"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                تومان
              </span>
            </div>
          </div>

          {/* حساب مبدأ */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">از حساب (حساب مبدأ)</label>
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-sky-500 transition"
              required
            >
              <option value="">انتخاب حساب مبدأ...</option>
              {sourceAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type === 'bank' ? 'بانک' : acc.type === 'wallet' ? 'صندوق' : acc.type})
                </option>
              ))}
              {accounts.filter(a => !sourceAccounts.includes(a)).map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type})
                </option>
              ))}
            </select>
          </div>

          {/* حساب مقصد */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">به حساب (حساب مقصد / بابت / هزینه)</label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-sky-500 transition"
              required
            >
              <option value="">انتخاب حساب مقصد...</option>
              {destAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type === 'expense' ? 'هزینه' : acc.type === 'bank' ? 'بانک' : acc.type})
                </option>
              ))}
              {accounts.filter(a => !destAccounts.includes(a)).map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type})
                </option>
              ))}
            </select>
          </div>

          {/* تاریخ */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">تاریخ سند</label>
            <JalaliDatePicker
              value={transactionDate}
              onChange={(iso: string) => setTransactionDate(iso)}
            />
          </div>

          {/* شرح و بابت */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">بابت و شرح سند</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثلاً: خرید میوه یا نان"
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl py-2.5 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 transition"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-lg shadow-sky-500/20"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'در حال ثبت...' : 'ثبت سند'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
