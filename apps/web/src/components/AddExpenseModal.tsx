import React, { useState, useMemo } from 'react';
import { calculateEqualSplits, calculatePercentageSplits } from '@jibban/debt-engine';
import { X, PlusCircle, Check, Percent, Users, AlertCircle, Sparkles } from 'lucide-react';

interface MemberPercentage {
  id: string;
  name: string;
  percentage: number;
}

export interface NewGroupExpenseData {
  description: string;
  amount: number;
  payerName: string;
  splitType: 'equal' | 'percentage';
  splits: Array<{ userId: string; owedAmount: number; percentage?: number }>;
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (data: NewGroupExpenseData) => void;
  groupMembers?: Array<{ id: string; name: string }>;
}

const DEFAULT_MEMBERS = [
  { id: 'من', name: 'من (کاربر اصلی)' },
  { id: 'رضا', name: 'رضا' },
  { id: 'سارا', name: 'سارا' },
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onAddExpense,
  groupMembers = DEFAULT_MEMBERS,
}) => {
  if (!isOpen) return null;

  const [description, setDescription] = useState<string>('');
  const [amountRaw, setAmountRaw] = useState<string>('');
  const [payerName, setPayerName] = useState<string>('من');
  const [splitType, setSplitType] = useState<'equal' | 'percentage'>('equal');

  // درصد پیش‌فرض اعضا: تقسیم تقریبی برابر
  const [memberPercentages, setMemberPercentages] = useState<Record<string, number>>(() => {
    const count = groupMembers.length || 3;
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    const initial: Record<string, number> = {};
    groupMembers.forEach((m, idx) => {
      initial[m.id] = base + (idx < remainder ? 1 : 0);
    });
    return initial;
  });

  // نرمال‌سازی ارقام فارسی و تبدیل به عدد انگلیسی
  const toAsciiDigits = (str: string): string => {
    return str
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ascii = toAsciiDigits(e.target.value).replace(/[^0-9]/g, '');
    setAmountRaw(ascii);
  };

  const numericAmount = parseInt(amountRaw, 10) || 0;

  const formatWithCommas = (val: number): string => {
    if (!val) return '۰';
    return new Intl.NumberFormat('fa-IR').format(val);
  };

  // مجموع درصدها
  const totalPercentage = useMemo(() => {
    return Object.values(memberPercentages).reduce((sum, p) => sum + (Number(p) || 0), 0);
  }, [memberPercentages]);

  const isPercentageValid = totalPercentage === 100;

  // محاسبه سهم هر عضو
  const computedSplits = useMemo(() => {
    if (numericAmount <= 0) return [];

    if (splitType === 'equal') {
      const pIds = groupMembers.map((m) => m.id);
      return calculateEqualSplits(numericAmount, pIds);
    } else {
      const pctInput = groupMembers.map((m) => ({
        userId: m.id,
        percentage: Number(memberPercentages[m.id]) || 0,
      }));
      return calculatePercentageSplits(numericAmount, pctInput);
    }
  }, [numericAmount, splitType, groupMembers, memberPercentages]);

  const handlePercentageChange = (userId: string, valStr: string) => {
    const ascii = toAsciiDigits(valStr).replace(/[^0-9]/g, '');
    const num = Math.min(100, Math.max(0, parseInt(ascii, 10) || 0));
    setMemberPercentages((prev) => ({
      ...prev,
      [userId]: num,
    }));
  };

  // تکمیل خودکار باقیمانده درصد برای یک عضو
  const handleAutoCompleteRemainder = (targetId: string) => {
    const otherSum = Object.entries(memberPercentages)
      .filter(([id]) => id !== targetId)
      .reduce((sum, [, p]) => sum + (Number(p) || 0), 0);

    const remainder = Math.max(0, 100 - otherSum);
    setMemberPercentages((prev) => ({
      ...prev,
      [targetId]: remainder,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || numericAmount <= 0) return;
    if (splitType === 'percentage' && !isPercentageValid) return;

    const finalSplits = computedSplits.map((s) => ({
      userId: s.userId,
      owedAmount: s.owedAmount,
      percentage: splitType === 'percentage' ? memberPercentages[s.userId] : undefined,
    }));

    onAddExpense({
      description: description.trim(),
      amount: numericAmount,
      payerName,
      splitType,
      splits: finalSplits,
    });

    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* هدر */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">ثبت هزینه جدید در گروه</h3>
              <p className="text-[11px] text-slate-400">محاسبه و تقسیم عادلانه دنگ بین اعضا</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* عنوان هزینه */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              عنوان هزینه:
            </label>
            <input
              type="text"
              required
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثلاً: خرید سوپرمارکت، شام رستوران، بنزین سفر..."
              className="input-field text-xs sm:text-sm"
            />
          </div>

          {/* مبلغ هزینه */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">مبلغ (تومان):</label>
              {numericAmount > 0 && (
                <span className="text-xs text-purple-400 font-mono font-bold">
                  {formatWithCommas(numericAmount)} تومان
                </span>
              )}
            </div>
            <input
              type="text"
              required
              value={numericAmount > 0 ? formatWithCommas(numericAmount) : ''}
              onChange={handleAmountChange}
              placeholder="مثلاً: ۲۵۰,۰۰۰"
              className="input-field font-mono text-xs sm:text-sm text-left"
            />
          </div>

          {/* پرداخت‌کننده */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              چه کسی پرداخت کرده؟
            </label>
            <select
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              className="input-field text-xs sm:text-sm"
            >
              {groupMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* انتخاب روش تسهیم دنگ: مساوی یا درصدی */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">نحوه تقسیم سهم دنگ:</label>
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
                  <span>درصدی (سهم دلخواه)</span>
                </button>
              </div>
            </div>

            {/* حالت تقسیم مساوی */}
            {splitType === 'equal' && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 space-y-1">
                <div className="font-semibold flex items-center justify-between">
                  <span>تقسیم مساوی بین {groupMembers.length} عضو فعال</span>
                  {numericAmount > 0 && computedSplits[0] && (
                    <span className="font-mono font-bold text-white">
                      نفری {formatWithCommas(computedSplits[0].owedAmount)} ت
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-purple-300/80">
                  باقیمانده‌های کسری مبلغ به صورت کاملاً عادلانه توزیع می‌شوند.
                </div>
              </div>
            )}

            {/* حالت تقسیم درصدی */}
            {splitType === 'percentage' && (
              <div className="space-y-2.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">درصد سهم هر عضو از هزینه:</span>
                  <div className="flex items-center gap-1.5 font-bold font-mono">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs ${
                        isPercentageValid
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      مجموع: {totalPercentage}٪
                    </span>
                  </div>
                </div>

                {!isPercentageValid && (
                  <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>
                        {totalPercentage < 100
                          ? `هنوز ${100 - totalPercentage}٪ از هزینه تسهیم نشده است.`
                          : `مجموع درصدها ${totalPercentage - 100}٪ بیشتر از ۱۰۰٪ است!`}
                      </span>
                    </div>
                  </div>
                )}

                {/* لیست اعضا و فیلد درصد هر نفر */}
                <div className="space-y-2">
                  {groupMembers.map((member) => {
                    const splitItem = computedSplits.find((s) => s.userId === member.id);
                    const memberAmount = splitItem ? splitItem.owedAmount : 0;
                    const pctVal = memberPercentages[member.id] ?? 0;

                    return (
                      <div
                        key={member.id}
                        className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-bold flex items-center justify-center">
                            {member.id[0]}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-200">{member.name}</span>
                            {member.id === payerName && (
                              <span className="mr-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded">
                                پرداخت‌کننده
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* مبلغ محاسبه‌شده به تومان */}
                          {numericAmount > 0 && (
                            <span className="font-mono text-slate-300 text-[11px] whitespace-nowrap">
                              {formatWithCommas(memberAmount)} ت
                            </span>
                          )}

                          {/* فیلد ورودی درصد */}
                          <div className="relative w-16">
                            <input
                              type="text"
                              value={pctVal}
                              onChange={(e) => handlePercentageChange(member.id, e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono text-xs text-white focus:outline-none focus:border-purple-500 pr-5"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">
                              ٪
                            </span>
                          </div>

                          {/* دکمه تکمیل باقی‌مانده درصد */}
                          {!isPercentageValid && totalPercentage < 100 && (
                            <button
                              type="button"
                              onClick={() => handleAutoCompleteRemainder(member.id)}
                              title="تکمیل مابقی درصد برای این عضو"
                              className="p-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* دکمه‌های تایید و انصراف */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary text-xs py-2 px-4"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={!description || numericAmount <= 0 || (splitType === 'percentage' && !isPercentageValid)}
              className="btn btn-split text-xs py-2 px-5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>ثبت هزینه</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
