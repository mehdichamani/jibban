import React, { useState } from 'react';
import { Transaction } from '../types.js';
import { calculateEqualSplits } from '@jibban/debt-engine';
import { X, Sparkles, Users, Check, ArrowRight } from 'lucide-react';

interface ToSplitModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSplit: (tx: Transaction, groupId: string, participants: string[]) => Promise<void>;
}

export const ToSplitModal: React.FC<ToSplitModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onConfirmSplit,
}) => {
  if (!isOpen || !transaction) return null;

  const [selectedGroup, setSelectedGroup] = useState<string>('grp_home');
  const [participants, setParticipants] = useState<string[]>(['من', 'رضا', 'سارا']);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // محاسبه سهم هر فرد با الگوریتم debt-engine
  const splits = calculateEqualSplits(transaction.amount, participants);

  const formatToman = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmSplit(transaction, selectedGroup, participants);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content p-5 sm:p-6 space-y-5">
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

        {/* کارت مشخصات تراکنش */}
        <div className="glass-card p-4 bg-slate-900/80 border-purple-500/30 space-y-2">
          <div className="text-xs text-slate-400">تراکنش انتخابی:</div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 text-sm">
              {transaction.description || 'خرید بانکی'} ({transaction.bankName})
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

        {/* پیش‌نمایش تسهیم دنگ با الگوریتم debt-engine */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>سهم هر نفر (تقسیم مساوی دقیق):</span>
            <span className="text-[11px] text-purple-400 font-normal">
              نفری {formatToman(splits[0]?.owedAmount || 0)} تومان
            </span>
          </label>

          <div className="space-y-1.5">
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

                <div className="font-mono text-slate-300 font-bold">
                  {formatToman(s.owedAmount)} تومان
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
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="btn btn-split text-xs py-2 px-5"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'در حال ثبت...' : 'تایید و ثبت در گروه دنگ'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
