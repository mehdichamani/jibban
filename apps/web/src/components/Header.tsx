import React from 'react';
import { Wallet, MessageSquarePlus, Sparkles, Wifi } from 'lucide-react';

interface HeaderProps {
  onOpenSimulator: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSimulator }) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 py-3 sm:px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">جیب‌بان</h1>
              <span className="badge badge-bank text-[10px] py-0.5">نسخه ابری</span>
            </div>
            <p className="text-xs text-slate-400">حسابداری شخصی و مدیریت هوشمند دنگ</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenSimulator}
            className="btn btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4 shadow-md shadow-sky-500/25"
            title="تست و استخراج متن پیامک بانکی"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>شبیه‌ساز پیامک بانکی</span>
          </button>
        </div>
      </div>
    </header>
  );
};
