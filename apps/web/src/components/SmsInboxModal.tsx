import React, { useState } from 'react';
import { PendingSms, Account } from '../types.js';
import {
  X,
  Inbox,
  ArrowRight,
  Check,
  Ban,
  Clock,
  Sparkles,
  CreditCard,
  Building2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { formatToman } from '../lib/currency.js';
import { parseBankSms } from '@jibban/sms-parser-ir';

interface SmsInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingList: PendingSms[];
  accounts: Account[];
  onConvert: (
    smsId: string,
    data: {
      fromAccountId?: string;
      toAccountId?: string;
      amount?: number;
      description?: string;
    }
  ) => Promise<void>;
  onIgnore: (smsId: string) => Promise<void>;
}

export const SmsInboxModal: React.FC<SmsInboxModalProps> = ({
  isOpen,
  onClose,
  pendingList,
  accounts,
  onConvert,
  onIgnore,
}) => {
  if (!isOpen) return null;

  const [selectedSms, setSelectedSms] = useState<PendingSms | null>(
    pendingList[0] || null
  );
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // هنگام تغییر پیامک انتخابی، فیلدها را پیش‌پر کن
  const handleSelectSms = (sms: PendingSms) => {
    setSelectedSms(sms);
    const parsed = parseBankSms(sms.rawText, sms.sender);
    const amountToman = Math.round((sms.parsedAmount || parsed.amount || 0) / 10);
    setCustomAmount(amountToman > 0 ? String(amountToman) : '');
    setDescription(parsed.description || (sms.bankName ? `تراکنش ${sms.bankName}` : ''));

    // حدس حساب بانکی بر اساس شماره کارت یا نام بانک
    const matched = accounts.find(
      (a) =>
        (sms.parsedAccount && (a.accountNumber?.includes(sms.parsedAccount) || a.cardNumber?.includes(sms.parsedAccount))) ||
        (sms.bankName && a.bankName?.includes(sms.bankName))
    );

    if (parsed.type === 'debit') {
      setFromAccountId(matched?.id || accounts.find((a) => a.type === 'bank' || a.type === 'wallet')?.id || '');
      setToAccountId(accounts.find((a) => a.type === 'expense')?.id || '');
    } else {
      setToAccountId(matched?.id || accounts.find((a) => a.type === 'bank' || a.type === 'wallet')?.id || '');
      setFromAccountId(accounts.find((a) => a.type === 'income')?.id || '');
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSms) return;

    setIsSubmitting(true);
    try {
      const numToman = parseInt(customAmount.replace(/,/g, ''), 10) || 0;
      await onConvert(selectedSms.id, {
        fromAccountId: fromAccountId || undefined,
        toAccountId: toAccountId || undefined,
        amount: numToman > 0 ? numToman * 10 : undefined,
        description: description.trim() || undefined,
      });

      // پیامک بعدی
      const remaining = pendingList.filter((s) => s.id !== selectedSms.id);
      if (remaining.length > 0) {
        handleSelectSms(remaining[0]);
      } else {
        setSelectedSms(null);
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIgnore = async (smsId: string) => {
    setIsSubmitting(true);
    try {
      await onIgnore(smsId);
      const remaining = pendingList.filter((s) => s.id !== smsId);
      if (remaining.length > 0) {
        handleSelectSms(remaining[0]);
      } else {
        setSelectedSms(null);
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-3xl p-5 sm:p-6 border-slate-700/80 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* هدر */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">صندوق ورودی پیامک‌ها (SMS Inbox)</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {pendingList.length} در انتظار
                </span>
              </div>
              <p className="text-xs text-slate-400">
                پیامک‌های بانکی خوانده‌شده از گوشی که نیازمند تایید و تخصیص سرفصل هستند
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* محتوای مودال */}
        {pendingList.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Inbox className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">صندوق ورودی پیامک‌های شما خالی است!</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              تمامی پیامک‌های دریافتی تبدیل به سند شده‌اند یا هیچ پیامک جدیدی در انتظار نیست.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4 overflow-y-auto flex-1 pr-1">
            {/* ستون راست: لیست پیامک‌های انتظار */}
            <div className="md:col-span-5 space-y-2 max-h-[60vh] overflow-y-auto">
              {pendingList.map((sms) => {
                const isSelected = selectedSms?.id === sms.id;
                return (
                  <div
                    key={sms.id}
                    onClick={() => handleSelectSms(sms)}
                    className={`p-3 rounded-2xl border transition cursor-pointer text-right ${
                      isSelected
                        ? 'bg-slate-900 border-sky-500/50 shadow-md'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-sky-400" />
                        {sms.bankName || 'بانک نامشخص'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {sms.receivedAt ? sms.receivedAt.slice(0, 10) : ''}
                      </span>
                    </div>

                    <div className="text-xs font-mono font-bold text-amber-400 mb-1">
                      {formatToman(sms.parsedAmount || 0)} تومان
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 font-mono leading-relaxed">
                      {sms.rawText}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* ستون چپ: جزئیات و فرم تبدیل به سند */}
            <div className="md:col-span-7 bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              {selectedSms ? (
                <form onSubmit={handleConvert} className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      فرم تبدیل به سند حسابداری
                    </span>
                    <button
                      type="button"
                      onClick={() => handleIgnore(selectedSms.id)}
                      className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                    >
                      <Ban className="w-3 h-3" />
                      <span>نادیده گرفتن</span>
                    </button>
                  </div>

                  {/* متن کامل پیامک */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                    {selectedSms.rawText}
                  </div>

                  {/* مبلغ */}
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">مبلغ سند (تومان):</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-sm font-bold font-mono text-white focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>

                  {/* حساب مبدا */}
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">از حساب (مبدأ پرداخت):</label>
                    <select
                      value={fromAccountId}
                      onChange={(e) => setFromAccountId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="">(بدون حساب مبدا)</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* حساب مقصد */}
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">به حساب (مقصد / هزینه):</label>
                    <select
                      value={toAccountId}
                      onChange={(e) => setToAccountId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="">(بدون حساب مقصد)</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* شرح */}
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">شرح و بابت سند:</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="بابت تراکنش..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* دکمه تایید نهایی */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isSubmitting ? 'در حال ثبت سند...' : 'تایید و ثبت قطعی سند مالی'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="py-20 text-center text-slate-500 text-xs">
                  یک پیامک را از لیست راست انتخاب کنید
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
