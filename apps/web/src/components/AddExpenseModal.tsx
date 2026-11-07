import React, { useState, useMemo, useEffect } from 'react';
import { calculateEqualSplits, calculatePercentageSplits } from '@jibban/debt-engine';
import { X, PlusCircle, Check, Percent, Users, AlertCircle, Sparkles } from 'lucide-react';
import { GroupMemberItem, getStoredGroupMembers } from '../lib/groupMembersStorage.js';

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
  groupMembers?: GroupMemberItem[];
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onAddExpense,
  groupMembers: propMembers,
}) => {
  const [members, setMembers] = useState<GroupMemberItem[]>(() => {
    return propMembers && propMembers.length > 0 ? propMembers : getStoredGroupMembers();
  });

  useEffect(() => {
    if (propMembers && propMembers.length > 0) {
      setMembers(propMembers);
    } else {
      setMembers(getStoredGroupMembers());
    }
  }, [propMembers, isOpen]);

  const [description, setDescription] = useState<string>('');
  const [amountRaw, setAmountRaw] = useState<string>('');
  const [payerName, setPayerName] = useState<string>('من');
  const [splitType, setSplitType] = useState<'equal' | 'percentage'>('equal');

  // درصد پیش‌فرض اعضا: تقسیم تقریبی برابر
  const [memberPercentages, setMemberPercentages] = useState<Record<string, number>>({});

  useEffect(() => {
    const count = members.length || 1;
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    const initial: Record<string, number> = {};
    members.forEach((m, idx) => {
      initial[m.id] = base + (idx < remainder ? 1 : 0);
    });
    setMemberPercentages(initial);
    if (!members.some((m) => m.id === payerName)) {
      setPayerName(members[0]?.id || 'من');
    }
  }, [members]);

  if (!isOpen) return null;

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
  const totalPercentage = Object.values(memberPercentages).reduce((sum, p) => sum + (Number(p) || 0), 0);
  const isPercentageValid = totalPercentage === 100;

  // محاسبه سهم ریالی با الگوریتم موتور محاسباتی (debt-engine)
  const splits = useMemo(() => {
    if (!numericAmount || numericAmount <= 0) return [];

    if (splitType === 'equal') {
      const pIds = members.map((m) => m.id);
      return calculateEqualSplits(numericAmount, pIds);
    } else {
      const pctInput = members.map((m) => ({
        userId: m.id,
        percentage: Number(memberPercentages[m.id]) || 0,
      }));
      return calculatePercentageSplits(numericAmount, pctInput);
    }
  }, [numericAmount, splitType, members, memberPercentages]);

  const handlePercentageInputChange = (memberId: string, val: string) => {
    const num = Math.min(100, Math.max(0, parseInt(toAsciiDigits(val).replace(/[^0-9]/g, ''), 10) || 0));
    setMemberPercentages((prev) => ({
      ...prev,
      [memberId]: num,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('لطفاً عنوان هزینه را وارد کنید');
      return;
    }
    if (numericAmount <= 0) {
      alert('مبلغ هزینه باید بزرگتر از صفر باشد');
      return;
    }
    if (splitType === 'percentage' && !isPercentageValid) {
      alert('مجموع درصدهای اعضا باید دقیقاً ۱۰۰٪ باشد');
      return;
    }

    const finalSplits = splits.map((s) => ({
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
    setDescription('');
    setAmountRaw('');
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-modal max-w-lg w-full p-5 sm:p-6 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
        {/* هدر */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">ثبت هزینه جدید در دنگ</h3>
              <p className="text-xs text-slate-400">تقسیم خودکار هزینه با موتور هوشمند بدهی</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* عنوان هزینه */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">بابت / شرح هزینه</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثلاً خرید سوپرمارکت، شام رستوران، بنزین..."
              className="input-field w-full text-xs sm:text-sm py-2 px-3"
              required
            />
          </div>

          {/* مبلغ هزینه به تومان */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">مبلغ کل هزینه (تومان)</label>
            <div className="relative">
              <input
                type="text"
                value={amountRaw ? formatWithCommas(numericAmount) : ''}
                onChange={handleAmountChange}
                placeholder="۰"
                className="input-field w-full text-left font-mono text-base sm:text-lg font-bold py-2 pl-14 pr-3 text-emerald-400"
                dir="ltr"
                required
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">تومان</span>
            </div>
          </div>

          {/* پرداخت‌کننده */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">چه کسی پرداخت کرده؟</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {members.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setPayerName(m.id)}
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition ${
                    payerName === m.id
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{m.name}</span>
                  {payerName === m.id && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* شیوه تسهیم و سهم‌بندی */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">روش تقسیم هزینه بین اعضا</label>
              <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setSplitType('equal')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    splitType === 'equal' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  مساوی
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType('percentage')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    splitType === 'percentage' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  درصدی
                </button>
              </div>
            </div>

            {splitType === 'equal' ? (
              <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>تقسیم مساوی بین {members.length} عضو فعال</span>
                </div>
                {numericAmount > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {splits.map((s) => {
                      const m = members.find((x) => x.id === s.userId);
                      return (
                        <div key={s.userId} className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs">
                          <span className="text-slate-400 block truncate">{m?.name || s.userId}</span>
                          <span className="font-mono font-bold text-white">{formatWithCommas(s.owedAmount)} تومان</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-3">
                <div className="space-y-2">
                  {members.map((member) => {
                    const currentPct = memberPercentages[member.id] || 0;
                    const calculatedShare = splits.find((s) => s.userId === member.id)?.owedAmount || 0;

                    return (
                      <div key={member.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-950/50 border border-slate-800/50">
                        <span className="text-xs text-slate-300 font-medium truncate">{member.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="relative w-20">
                            <input
                              type="text"
                              value={currentPct}
                              onChange={(e) => handlePercentageInputChange(member.id, e.target.value)}
                              className="input-field text-left font-mono text-xs py-1 pl-6 pr-2 w-full"
                              dir="ltr"
                            />
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">٪</span>
                          </div>
                          <span className="text-xs font-mono text-slate-400 w-24 text-left">
                            {formatWithCommas(calculatedShare)} ت
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* وضعیت اعتبار درصد */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400">مجموع درصدها:</span>
                  <span
                    className={`font-mono font-bold flex items-center gap-1 ${
                      isPercentageValid ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {!isPercentageValid && <AlertCircle className="w-3.5 h-3.5" />}
                    {totalPercentage}٪ از ۱۰۰٪
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* دکمه‌های اقدام */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={!numericAmount || (splitType === 'percentage' && !isPercentageValid)}
              className="flex-1 btn btn-primary text-xs py-2.5 rounded-xl font-bold disabled:opacity-50"
            >
              ثبت هزینه در گروه
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary text-xs py-2.5 rounded-xl px-4"
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
