import React, { useState } from 'react';
import { Account } from '../types.js';
import { X, Landmark, Wallet, PiggyBank, CreditCard, Building2, UserCheck, Check, FolderTree, ShoppingBag, TrendingUp } from 'lucide-react';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: Partial<Account>) => Promise<void>;
  initialData?: Account | null;
  accounts?: Account[];
  defaultParentId?: string | null;
}

const ACCOUNT_COLORS = [
  '#0284c7', // Sky
  '#3b82f6', // Blue
  '#ef4444', // Red (Blu Bank)
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
];

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  accounts = [],
  defaultParentId,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState<string>(initialData?.name || '');
  const [type, setType] = useState<Account['type']>(initialData?.type || 'bank');
  const [parentId, setParentId] = useState<string>(
    initialData?.parentId || defaultParentId || ''
  );
  const [bankName, setBankName] = useState<string>(initialData?.bankName || '');
  const [accountNumber, setAccountNumber] = useState<string>(initialData?.accountNumber || '');
  const [cardNumber, setCardNumber] = useState<string>(initialData?.cardNumber || '');
  const [initialBalance, setInitialBalance] = useState<string>(
    initialData ? String(Math.round(initialData.initialBalance / 10)) : '0'
  );
  const [color, setColor] = useState<string>(initialData?.color || '#0284c7');
  const [isSource, setIsSource] = useState<boolean>(initialData?.isSource !== false);
  const [isDestination, setIsDestination] = useState<boolean>(initialData?.isDestination !== false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const formatNumberWithCommas = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    if (!raw) return '';
    return new Intl.NumberFormat('fa-IR').format(parseInt(raw, 10));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setInitialBalance(raw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const numBalanceRials = (parseInt(initialBalance, 10) || 0) * 10;
      await onSave({
        name: name.trim(),
        type,
        parentId: parentId || undefined,
        bankName: bankName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        cardNumber: cardNumber.trim() || undefined,
        color,
        icon:
          type === 'wallet'
            ? 'wallet'
            : type === 'savings'
            ? 'piggy-bank'
            : type === 'expense'
            ? 'shopping-bag'
            : type === 'income'
            ? 'trending-up'
            : type === 'counterparty' || type === 'debt'
            ? 'user-check'
            : 'credit-card',
        initialBalance: numBalanceRials,
        balance: initialData ? initialData.balance : numBalanceRials,
        isSource,
        isDestination,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // گزینه‌های حساب سرگروه / والد (به استثنای خود حساب در زمان ویرایش)
  const potentialParents = accounts.filter(
    (a) => !initialData || a.id !== initialData.id
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {initialData ? 'ویرایش حساب مالی' : 'تعریف حساب مالی جدید'}
              </h3>
              <p className="text-xs text-slate-400">حساب‌های مبدا (پرداخت)، مقصد (دریافت) یا سرفصل‌های معین/تفصیلی</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* نوع حساب */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">نوع سرفصل حساب:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'bank', label: 'حساب بانکی', icon: Landmark },
                { id: 'wallet', label: 'کیف پول نقد', icon: Wallet },
                { id: 'expense', label: 'سرفصل هزینه', icon: ShoppingBag },
                { id: 'income', label: 'سرفصل درآمد', icon: TrendingUp },
                { id: 'savings', label: 'پس‌انداز', icon: PiggyBank },
                { id: 'counterparty', label: 'طرف‌حساب/شخص', icon: UserCheck },
                { id: 'credit', label: 'کارت اعتباری', icon: CreditCard },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = type === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setType(item.id as Account['type'])}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border transition-all text-right ${
                      isSelected
                        ? 'bg-sky-500/15 text-sky-400 border-sky-500/50 shadow-sm'
                        : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* حساب والد / سرگروه درختی */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              حساب والد / سرگروه (اختیاری جهت ساختار درختی پارمیس):
            </label>
            <div className="relative">
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="">(بدون والد - سرگروه اصلی ریشه)</option>
                {potentialParents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* نام حساب */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">عنوان حساب:</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: بلوبانک، نان، میوه و سبزیجات، حقوق"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* اطلاعات تکمیلی در صورت بانکی بودن */}
          {type === 'bank' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950/50 border border-slate-800/80 rounded-2xl">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">نام بانک:</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="مثلاً: سامان، پاسارگاد، بلو"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">۴ رقم آخر کارت / شماره حساب:</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="مثلاً: ۶۲۱۹"
                  maxLength={10}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-mono text-left focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          {/* موجودی اولیه */}
          {!initialData && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">موجودی اولیه (تومان):</label>
                {initialBalance && parseInt(initialBalance, 10) > 0 && (
                  <span className="text-[11px] text-sky-400 font-mono">
                    {formatNumberWithCommas(initialBalance)} تومان
                  </span>
                )}
              </div>
              <input
                type="text"
                value={initialBalance ? formatNumberWithCommas(initialBalance) : ''}
                onChange={handleAmountChange}
                placeholder="۰"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500 text-left"
              />
            </div>
          )}

          {/* نقش حساب در تراکنش‌ها (مبدا / مقصد) */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">کاربرد در دفاتر حسابداری:</span>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={isSource}
                  onChange={(e) => setIsSource(e.target.checked)}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <span>حساب مبدأ (امکان پرداخت / برداشت وجه)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={isDestination}
                  onChange={(e) => setIsDestination(e.target.checked)}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <span>حساب مقصد (امکان واریز / دریافت وجه)</span>
              </label>
            </div>
          </div>

          {/* انتخاب رنگ شاخص کارت */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">رنگ نمایشی کارت:</label>
            <div className="flex items-center gap-2.5">
              {ACCOUNT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                    color === c ? 'scale-110 ring-2 ring-white' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* دکمه‌های اقدام */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm transition shadow-lg shadow-sky-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'در حال ذخیره...' : initialData ? 'بروزرسانی حساب' : 'افتتاح و ثبت حساب'}
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
