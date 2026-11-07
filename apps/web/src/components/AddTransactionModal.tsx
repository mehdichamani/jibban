import React, { useState } from 'react';
import { Account } from '../types.js';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Check,
  Plus,
  Trash2,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { JalaliDatePicker } from './JalaliDatePicker.js';

interface CompoundRow {
  accountId: string;
  amount: string;
  description: string;
}

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onAddTransaction: (data: {
    amount: number;
    type: 'debit' | 'credit' | 'transfer' | 'compound';
    fromAccountId?: string;
    toAccountId?: string;
    description?: string;
    trackingCode?: string;
    transactionDate?: string;
    items?: Array<{
      entryType: 'source' | 'destination';
      accountId?: string | null;
      amount: number;
      description?: string | null;
    }>;
  }) => Promise<void>;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onAddTransaction,
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'simple' | 'compound'>('simple');
  const [type, setType] = useState<'debit' | 'credit' | 'transfer'>('debit');

  // فیلدهای سند ساده
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

  // ردیف‌های سند چند حسابی (مرکب - مانند پارمیس)
  const [compoundRows, setCompoundRows] = useState<CompoundRow[]>([
    { accountId: accounts.find((a) => a.type === 'expense')?.id || '', amount: '', description: '' },
    { accountId: '', amount: '', description: '' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const formatNumberWithCommas = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    if (!raw) return '';
    return Number(raw).toLocaleString('en-US');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(formatNumberWithCommas(e.target.value));
  };

  // مدیریت ردیف‌های مرکب
  const handleAddCompoundRow = () => {
    setCompoundRows((prev) => [...prev, { accountId: '', amount: '', description: '' }]);
  };

  const handleRemoveCompoundRow = (index: number) => {
    if (compoundRows.length <= 1) return;
    setCompoundRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCompoundRow = (index: number, field: keyof CompoundRow, value: string) => {
    setCompoundRows((prev) => {
      const next = [...prev];
      if (field === 'amount') {
        next[index] = { ...next[index], amount: formatNumberWithCommas(value) };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  // جمع کل سند مرکب به تومان
  const totalCompoundToman = compoundRows.reduce((sum, r) => {
    const num = parseInt(r.amount.replace(/,/g, ''), 10) || 0;
    return sum + num;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'simple') {
      const raw = parseInt(amount.replace(/,/g, ''), 10);
      if (isNaN(raw) || raw <= 0) {
        alert('لطفاً مبلغ معتبری به تومان وارد کنید');
        return;
      }

      setIsSubmitting(true);
      try {
        await onAddTransaction({
          amount: raw * 10, // تبدیل تومان به ریال
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
    } else {
      // ثبت سند مرکب / چند حسابی
      if (totalCompoundToman <= 0) {
        alert('لطفاً مبالغ ردیف‌های مقصد را به درستی وارد نمایید');
        return;
      }
      const validRows = compoundRows.filter((r) => {
        const num = parseInt(r.amount.replace(/,/g, ''), 10) || 0;
        return r.accountId && num > 0;
      });

      if (validRows.length === 0) {
        alert('حداقل یک ردیف مقصد با حساب و مبلغ مشخص باید وجود داشته باشد');
        return;
      }

      setIsSubmitting(true);
      try {
        const items = validRows.map((r) => ({
          entryType: 'destination' as const,
          accountId: r.accountId,
          amount: (parseInt(r.amount.replace(/,/g, ''), 10) || 0) * 10,
          description: r.description.trim() || description.trim() || undefined,
        }));

        await onAddTransaction({
          amount: totalCompoundToman * 10,
          type: 'compound',
          fromAccountId: fromAccountId || undefined,
          description: description.trim() || 'سند مرکب چند مقصدی',
          transactionDate: new Date(transactionDate).toISOString(),
          items,
        });
        onClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const sourceAccounts = accounts.filter(
    (a) =>
      a.type === 'bank' ||
      a.type === 'wallet' ||
      a.type === 'savings' ||
      a.type === 'income' ||
      a.type === 'debt'
  );
  const destAccounts = accounts.filter(
    (a) =>
      a.type === 'expense' ||
      a.type === 'bank' ||
      a.type === 'wallet' ||
      a.type === 'savings' ||
      a.type === 'debt'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-xl p-5 sm:p-6 border-slate-700/80 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">ثبت سند مالی جدید</h3>
            <span className="text-[10px] bg-slate-800 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/30">
              {mode === 'simple' ? 'سند ساده' : 'سند چند حسابی (مرکب)'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* سوییچ حالت: ساده یا چند حسابی */}
        <div className="mt-3 flex rounded-xl bg-slate-900 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setMode('simple')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              mode === 'simple'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>سند تک‌حسابی (ساده)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('compound')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              mode === 'compound'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>سند چند حسابی (مرکب پارمیس)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {mode === 'simple' && (
            /* نوع سند ساده */
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
                  <span>انتقال بین‌بانکی</span>
                </button>
              </div>
            </div>
          )}

          {/* حساب مبدأ (پرداخت‌کننده) */}
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
              {accounts
                .filter((a) => !sourceAccounts.includes(a))
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
            </select>
          </div>

          {mode === 'simple' ? (
            /* مبلغ و حساب مقصد ساده */
            <>
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
                  {accounts
                    .filter((a) => !destAccounts.includes(a))
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                      </option>
                    ))}
                </select>
              </div>
            </>
          ) : (
            /* ردیف‌های نامحدود مقصد سند چند حسابی */
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">ریزاقلام و حساب‌های مقصد سند (مرکب):</span>
                <button
                  type="button"
                  onClick={handleAddCompoundRow}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 py-1 px-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن ردیف</span>
                </button>
              </div>

              <div className="space-y-2">
                {compoundRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                    <div className="w-5 text-center text-xs font-mono text-slate-500">{idx + 1}</div>
                    <select
                      value={row.accountId}
                      onChange={(e) => handleUpdateCompoundRow(idx, 'accountId', e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none focus:border-sky-500"
                      required
                    >
                      <option value="">انتخاب سرفصل مقصد...</option>
                      {destAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.type})
                        </option>
                      ))}
                      {accounts.filter((a) => !destAccounts.includes(a)).map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.type})
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      dir="ltr"
                      value={row.amount}
                      onChange={(e) => handleUpdateCompoundRow(idx, 'amount', e.target.value)}
                      placeholder="مبلغ (تومان)"
                      className="w-28 bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs font-mono text-white text-left focus:outline-none focus:border-sky-500"
                      required
                    />

                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => handleUpdateCompoundRow(idx, 'description', e.target.value)}
                      placeholder="شرح قلم"
                      className="w-28 hidden sm:block bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />

                    {compoundRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCompoundRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* مجموع ردیف‌ها */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <span className="text-slate-400">جمع کل سند مرکب:</span>
                <span className="font-bold font-mono text-sky-400 text-sm">
                  {totalCompoundToman.toLocaleString('fa-IR')} تومان
                </span>
              </div>
            </div>
          )}

          {/* تاریخ */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">تاریخ سند</label>
            <JalaliDatePicker
              value={transactionDate}
              onChange={(iso: string) => setTransactionDate(iso)}
            />
          </div>

          {/* شرح و بابت سند */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">بابت و شرح سند</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثلاً: خرید میوه و نان، شارژ ساختمان، حقوق"
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
