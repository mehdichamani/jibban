import React from 'react';
import { Receipt, Users, PieChart, Settings } from 'lucide-react';

export type TabType = 'transactions' | 'split' | 'analytics' | 'settings';

interface NavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onChangeTab }) => {
  const tabs = [
    { id: 'transactions' as TabType, label: 'تراکنش‌ها', icon: Receipt },
    { id: 'split' as TabType, label: 'مدیریت دنگ', icon: Users },
    { id: 'analytics' as TabType, label: 'گزارش و آمار', icon: PieChart },
    { id: 'settings' as TabType, label: 'تنظیمات و اتصال', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 sm:static sm:mt-6 z-30 bg-slate-900/90 sm:bg-slate-900/50 backdrop-blur-lg border-t sm:border border-slate-800/80 sm:rounded-2xl max-w-xl mx-auto p-1.5 shadow-xl">
      <div className="grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 sm:py-2 px-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
