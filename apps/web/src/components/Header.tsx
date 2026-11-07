import React from 'react';
import { Wallet, Inbox } from 'lucide-react';

interface HeaderProps {
  onOpenInbox: () => void;
  pendingCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenInbox,
  pendingCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-3.5 py-2.5 sm:px-6 sm:py-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Logo & Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 shrink-0">
            <Wallet className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-white">جیب‌بان</h1>
              <span className="badge badge-bank text-[10px] py-0.5 px-1.5 shrink-0">ابری ۳.۰</span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">
              حسابداری شخصی پارمیس و دنگ گروهی
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* دکمه صندوق ورودی پیامک‌ها با بج شمارنده */}
          <button
            onClick={onOpenInbox}
            className="relative inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs py-1.5 px-2.5 sm:py-2 sm:px-3 rounded-xl transition shadow-sm"
            title="صندوق پیامک‌های بانکی در انتظار تایید"
          >
            <Inbox className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            <span className="hidden sm:inline font-semibold">صندوق پیامک‌ها</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 font-mono">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
