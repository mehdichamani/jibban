import React, { useState, useMemo } from 'react';
import { Transaction } from '../types.js';
import { calculateEqualSplits, calculatePercentageSplits } from '@jibban/debt-engine';
import { X, Sparkles, Users, Check, Percent, AlertCircle } from 'lucide-react';
import { formatJalali } from '../lib/date.js';

interface ToSplitModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSplit: (tx: Transaction, groupId: string, participants: string[], splits?: any[]) => Promise<void>;
}

export const ToSplitModal: React.FC<ToSplitModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onConfirmSplit,
}) => {
  if (!isOpen || !transaction) return null;

  const [selectedGroup, setSelectedGroup] = useState<string>('grp_home');
  const [participants] = useState<string[]>(['من', 'رضا', 'سارا']);
  const [splitType, setSplitType] = useState<'equal' | 'percentage'>('equal');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // درصد پیش‌فرض اعضا
  const [percentages, setPercentages] = useState<Record<string, number>>(() => {
    return {
      من: 34,
      رضا: 33,
      سارا: 33,
    };
  });

  const totalPercentage = useMemo(() => {
    return Object.values(percentages).reduce((sum, p) => sum + (Number(p) || 0), 0);
  }, [percentages]);

  const isPercentageValid = totalPercentage === 100;

  // محاسبه سهم هر فرد با الگوریتم debt-engine
  const splits = useMemo(() => {
    if (splitType === 'equal') {
      return calculateEqualSplits(transaction.amount, participants);
    } else {
      const pctInput = participants.map((p) => ({
        userId: p,
        percentage: Number(percentages[p]) || 0,
      }));
      return calculatePercentageSplits(transaction.amount, pctInput);
    }
  }, [transaction.amount, participants, splitType, percentages]);

  const formatToman = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount);
  };

  const handlePercentageChange = (userId: string, val: string) => {
    const num = Math.min(100, Math.max(0, parseInt(val.replace(/[^0-9]/g, ''), 10) || 0));
    setPercentages((prev) => ({
      ...prev,
      [userId]: num,
    }));
  };

  const handleConfirm = async () => {
    if (splitType === 'percentage' && !isPercentageValid) return;

    setIsSubmitting(true);
    try {
      await onConfirmSplit(transaction, selectedGroup, participants, splits);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* هدر */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">اشتراک‌گذاری هوشمند در دنگ</h3>
              <p className="text-[11px] text-slate-400">تبدیل آنی خرج بانکی به سهم گروهی</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* کارت مشخصات تراکنش با تاریخ شمسی */}
        <div className="glass-card p-4 bg-slate-900/80 border-purple-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>تراکنش انتخابی:</span>
            <span className="font-sans text-[11px] text-slate-400">
              {formatJalali(transaction.transactionDate, 'full')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 text-sm">
              {transaction.description || 'خرید بانکی'} ({transaction.bankName || 'بانک'})
            </span>
            <span className="font-bold text-base font-mono text-purple-400">
              {formatToman(transaction.amount)} تومان
            </span>
          </div>
        </div>

        {/* انتخاب گروه */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            گروه دنگ مقصد:
          </label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="input-field text-xs sm:text-sm"
          >
            <option value="grp_home">خرج‌های مشترک خانه (۳ عضو)</option>
            <option value="grp_trip">سفر شمال (۴ عضو)</option>
          </select>
        </div>

        {/* انتخاب شیوه تقسیم دنگ */}
        <div className="space-y-2 pt-1 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">روش تسهیم:</label>
            <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setSplitType('equal')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  splitType === 'equal'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>مساوی</span>
              </button>
              <button
                type="button"
                onClick={() => setSplitType('percentage')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  splitType === 'percentage'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>درصدی</span>
              </button>
            </div>
          </div>

          {splitType === 'percentage' && !isPercentageValid && (
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>مجموع درصدها باید دقیقاً ۱۰۰٪ باشد (فعلی: {totalPercentage}٪)</span>
            </div>
          )}

          {/* پیش‌نمایش تسهیم دنگ با الگوریتم debt-engine */}
          <div className="space-y-1.5 pt-1">
            {splits.map((s) => (
              <div
                key={s.userId}
                className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-[10px] flex items-center justify-center font-bold">
                    {s.userId[0]}
                  </div>
                  <span className="font-medium text-slate-200">{s.userId}</span>
                  {s.userId === 'من' && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      پرداخت‌کننده
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {splitType === 'percentage' && (
                    <div className="relative w-14">
                      <input
                        type="text"
                        value={percentages[s.userId] ?? 0}
                        onChange={(e) => handlePercentageChange(s.userId, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-1.5 py-0.5 text-center font-mono text-xs text-white focus:outline-none focus:border-purple-500 pr-4"
                      />
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">
                        ٪
                      </span>
                    </div>
                  )}

                  <div className="font-mono text-slate-300 font-bold">
                    {formatToman(s.owedAmount)} تومان
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* دکمه‌های تایید */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary text-xs py-2 px-4"
          >
            انصراف
          </button>
          <button
            type="button"
            disabled={isSubmitting || (splitType === 'percentage' && !isPercentageValid)}
            onClick={handleConfirm}
            className="btn btn-split text-xs py-2 px-5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'در حال ثبت...' : 'تایید و ثبت در گروه دنگ'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
