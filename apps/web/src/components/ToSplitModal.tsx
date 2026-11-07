import React, { useState, useMemo, useEffect } from 'react';
import { Transaction } from '../types.js';
import { calculateEqualSplits, calculatePercentageSplits } from '@jibban/debt-engine';
import { X, Sparkles, Users, Check, Percent, AlertCircle } from 'lucide-react';
import { formatJalali } from '../lib/date.js';
import { GroupMemberItem, getStoredGroupMembers } from '../lib/groupMembersStorage.js';

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
  const [members, setMembers] = useState<GroupMemberItem[]>(getStoredGroupMembers());

  useEffect(() => {
    if (isOpen) {
      setMembers(getStoredGroupMembers());
    }
  }, [isOpen]);

  const [selectedGroup] = useState<string>('grp_home');
  const [splitType, setSplitType] = useState<'equal' | 'percentage'>('equal');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // درصدهای پویا
  const [percentages, setPercentages] = useState<Record<string, number>>({});

  useEffect(() => {
    const count = members.length || 1;
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    const initial: Record<string, number> = {};
    members.forEach((m, idx) => {
      initial[m.id] = base + (idx < remainder ? 1 : 0);
    });
    setPercentages(initial);
  }, [members]);

  const participants = useMemo(() => members.map((m) => m.id), [members]);

  const totalPercentage = useMemo(() => {
    return Object.values(percentages).reduce((sum, p) => sum + (Number(p) || 0), 0);
  }, [percentages]);

  const isPercentageValid = totalPercentage === 100;

  // محاسبه سهم هر فرد با الگوریتم debt-engine
  const splits = useMemo(() => {
    if (!transaction?.amount) return [];
    if (splitType === 'equal') {
      return calculateEqualSplits(transaction.amount, participants);
    } else {
      const pctInput = participants.map((p) => ({
        userId: p,
        percentage: Number(percentages[p]) || 0,
      }));
      return calculatePercentageSplits(transaction.amount, pctInput);
    }
  }, [transaction?.amount, participants, splitType, percentages]);

  if (!isOpen || !transaction) return null;

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
      <div className="glass-modal max-w-md w-full p-5 sm:p-6 space-y-5 animate-scale-up">
        {/* هدر مودال */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">تبدیل به خرج گروهی (دنگ)</h3>
              <p className="text-[11px] text-slate-400">سهم‌بندی خودکار بین اعضای گروه</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* اطلاعات تراکنش شخصی انتخاب‌شده */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">شرح هزینه:</span>
            <span className="font-semibold text-white">{transaction.description || 'تراکنش بدون شرح'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">مبلغ کل پرداختی:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {formatToman(transaction.amount)} تومان
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">تاریخ:</span>
            <span className="font-mono text-slate-300">{formatJalali(transaction.transactionDate)}</span>
          </div>
        </div>

        {/* انتخاب نوع تقسیم */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">نحوه تسهیم دنگ:</span>
            <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setSplitType('equal')}
                className={`px-3 py-1 rounded-md transition ${
                  splitType === 'equal' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                مساوی
              </button>
              <button
                type="button"
                onClick={() => setSplitType('percentage')}
                className={`px-3 py-1 rounded-md transition ${
                  splitType === 'percentage' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                درصدی
              </button>
            </div>
          </div>

          {/* اعضا و سهم هر یک */}
          <div className="space-y-2">
            {members.map((m) => {
              const shareAmount = splits.find((s) => s.userId === m.id)?.owedAmount ?? 0;
              const isPayer = m.id === 'من';

              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-200">{m.name}</span>
                    {isPayer && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-medium">
                        پرداخت‌کننده
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    {splitType === 'percentage' && (
                      <div className="relative w-16">
                        <input
                          type="text"
                          value={percentages[m.id] ?? 0}
                          onChange={(e) => handlePercentageChange(m.id, e.target.value)}
                          className="input-field text-left text-xs py-1 pl-5 pr-1.5 w-full"
                          dir="ltr"
                        />
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">٪</span>
                      </div>
                    )}
                    <span className="text-white font-bold">{formatToman(shareAmount)} تومان</span>
                  </div>
                </div>
              );
            })}
          </div>

          {splitType === 'percentage' && !isPercentageValid && (
            <div className="text-[11px] text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>مجموع درصدها باید دقیقاً ۱۰۰٪ باشد (فعلی: {totalPercentage}٪)</span>
            </div>
          )}
        </div>

        {/* دکمه‌های تایید */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || (splitType === 'percentage' && !isPercentageValid)}
            className="flex-1 btn btn-primary text-xs py-2.5 rounded-xl font-bold disabled:opacity-50"
          >
            {isSubmitting ? 'در حال ثبت...' : 'تایید و ثبت در گروه دنگ'}
          </button>
          <button
            onClick={onClose}
            className="btn btn-secondary text-xs py-2.5 rounded-xl px-4"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
};
