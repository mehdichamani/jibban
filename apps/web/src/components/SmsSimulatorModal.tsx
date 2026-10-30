import React, { useState, useEffect } from 'react';
import { parseBankSms } from '@jibban/sms-parser-ir';
import { X, MessageSquare, Sparkles, Check, ArrowRight, AlertCircle, Building2 } from 'lucide-react';

interface SmsSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTransaction: (smsText: string) => Promise<void>;
}

const SAMPLE_BANK_SMS = [
  {
    name: 'بلوبانک (Blu)',
    badge: 'تومان',
    text: `خرید 45,000 تومان
از کارت 621986...4321
مانده: 1,230,000 تومان
1403/08/05 13:40
پایانه: فروشگاه کوروش
بلو`,
  },
  {
    name: 'بانک ملی ایران',
    badge: 'ریال',
    text: `بانک ملی ایران
برداشت از حساب: 0105891234
مبلغ: 2,500,000 ریال
مانده: 14,200,000 ریال
1403/08/01 11:30
پایانه: داروخانه دکتر راد`,
  },
  {
    name: 'بانک ملت (واریز)',
    badge: 'ریال',
    text: `بانک ملت
واریز به حساب: 1234567890
مبلغ: 10,000,000 ریال
مانده: 15,000,000 ریال
1403/08/01-14:20
واریز حقوق`,
  },
  {
    name: 'بانک سامان',
    badge: 'ریال',
    text: `سامان
برداشت از 849-800-9988
مبلغ: 650,000 ریال
موجودی: 4,350,000 ریال
1403/08/04 18:20
خرید رستوران نارنج`,
  },
  {
    name: 'بانک کشاورزی',
    badge: 'ریال',
    text: `بانک کشاورزی
برداشت از حساب 45612345
مبلغ: 180,000 ریال
مانده: 820,000 ریال
1403/08/02 10:15`,
  },
];

export const SmsSimulatorModal: React.FC<SmsSimulatorModalProps> = ({
  isOpen,
  onClose,
  onSaveTransaction,
}) => {
  const [smsText, setSmsText] = useState<string>(SAMPLE_BANK_SMS[0].text);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  // استخراج آنی با موتور مستقل @jibban/sms-parser-ir در مرورگر
  const parsed = parseBankSms(smsText);

  const formatToman = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount);
  };

  const handleSave = async () => {
    if (!parsed.isBankSms || parsed.amount <= 0) return;
    setIsSubmitting(true);
    try {
      await onSaveTransaction(smsText);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content p-5 sm:p-6 space-y-5">
        {/* هدر مودال */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">شبیه‌ساز پیامک بانکی ایران</h3>
              <p className="text-[11px] text-slate-400">تست استخراج هوشمند با پکیج sms-parser-ir</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* دکمه‌های پیامک آماده بانک‌ها */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            انتخاب پیامک نمونه از بانک‌های واقعی:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_BANK_SMS.map((sample) => (
              <button
                key={sample.name}
                type="button"
                onClick={() => setSmsText(sample.text)}
                className="text-xs py-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition-all flex items-center gap-1.5"
              >
                <span>{sample.name}</span>
                <span className="text-[10px] text-sky-400 font-mono">({sample.badge})</span>
              </button>
            ))}
          </div>
        </div>

        {/* فیلد متن پیامک */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            متن پیامک ورودی (می‌توانید پیامک بانکی خود را اینجا Paste کنید):
          </label>
          <textarea
            rows={5}
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            className="input-field font-mono text-xs leading-relaxed"
            placeholder="متن پیامک بانکی را اینجا بنویسید یا الصاق کنید..."
          />
        </div>

        {/* پیش‌نمایش زنده استخراج فیلدها */}
        <div className="glass-card p-4 space-y-3 bg-slate-900/90 border-slate-800">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <span className="font-bold text-sky-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              نتیجه استخراج خودکار (Live Parser):
            </span>
            {parsed.isBankSms ? (
              <span className="badge badge-credit text-[10px]">پیامک بانکی معتبر</span>
            ) : (
              <span className="badge badge-debit text-[10px]">غیربانکی / نامعتبر</span>
            )}
          </div>

          {parsed.isBankSms ? (
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                <span className="text-slate-400 text-[10px] block">نام بانک:</span>
                <span className="font-bold text-sky-300 text-sm">{parsed.bankName}</span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                <span className="text-slate-400 text-[10px] block">نوع تراکنش:</span>
                <span
                  className={`font-bold text-sm ${
                    parsed.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {parsed.type === 'credit' ? 'واریز (درآمد)' : 'برداشت (خرید)'}
                </span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 col-span-2">
                <span className="text-slate-400 text-[10px] block">مبلغ نرمال‌شده (همیشه به تومان):</span>
                <span className="font-bold text-lg font-mono text-white">
                  {formatToman(parsed.amount)}{' '}
                  <span className="text-xs font-normal text-slate-400">تومان</span>
                </span>
              </div>

              {parsed.balance !== undefined && (
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-slate-400 text-[10px] block">مانده حساب:</span>
                  <span className="font-semibold text-slate-200">{formatToman(parsed.balance)} ت</span>
                </div>
              )}

              {parsed.accountNumber && (
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-slate-400 text-[10px] block">کارت / حساب:</span>
                  <span className="font-mono text-slate-300 font-semibold">*{parsed.accountNumber}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-rose-400 flex items-center gap-1.5 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>موتور پیامک فیلد معتبر بانکی برای این متن پیدا نکرد.</span>
            </div>
          )}
        </div>

        {/* دکمه‌های عملیات */}
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
            disabled={!parsed.isBankSms || parsed.amount <= 0 || isSubmitting}
            onClick={handleSave}
            className="btn btn-primary text-xs py-2 px-5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'در حال ثبت...' : 'ثبت در لیست تراکنش‌ها'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
