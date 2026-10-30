import React from 'react';
import { Wallet, MessageSquarePlus, Sparkles, Wifi } from 'lucide-react';

interface HeaderProps {
  onOpenSimulator: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSimulator }) => {
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
              <span className="badge badge-bank text-[10px] py-0.5 px-1.5 shrink-0">ابری</span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">حسابداری شخصی و مدیریت هوشمند دنگ</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenSimulator}
            className="btn btn-primary text-xs py-1.5 px-2.5 sm:py-2 sm:px-4 shadow-md shadow-sky-500/25 shrink-0"
            title="تست و استخراج متن پیامک بانکی"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">شبیه‌ساز پیامک بانکی</span>
            <span className="sm:hidden text-xs">تست پیامک</span>
          </button>
        </div>
      </div>
    </header>
  );
};
