import React, { useState } from 'react';
import { calculateEqualSplits, calculateShareSplits, calculatePercentageSplits } from '@jibban/debt-engine';
import { X, PlusCircle, Check } from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (data: {
    description: string;
    amount: number;
    payerName: string;
  }) => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onAddExpense,
}) => {
  if (!isOpen) return null;

  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [payerName, setPayerName] = useState<string>('من');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    if (!description || isNaN(numAmount) || numAmount <= 0) return;

    onAddExpense({
      description,
      amount: numAmount,
      payerName,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">ثبت هزینه جدید در گروه</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              عنوان هزینه:
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثلاً: خرید روغن و گوشت، شام پیتزا، بنزین..."
              className="input-field text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              مبلغ (تومان):
            </label>
            <input
              type="text"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="مثلاً: ۲۵۰,۰۰۰"
              className="input-field font-mono text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              چه کسی پرداخت کرده؟
            </label>
            <select
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              className="input-field text-xs sm:text-sm"
            >
              <option value="من">من (کاربر اصلی)</option>
              <option value="رضا">رضا</option>
              <option value="سارا">سارا</option>
            </select>
          </div>

          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
            این هزینه به طور پیش‌فرض به صورت کاملاً مساوی بین اعضای فعال گروه (من، رضا، سارا) تقسیم خواهد شد.
          </div>

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
              className="btn btn-split text-xs py-2 px-5"
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
