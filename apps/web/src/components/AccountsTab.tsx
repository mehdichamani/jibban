import React, { useState } from 'react';
import { Account } from '../types.js';
import {
  Landmark,
  Wallet,
  PiggyBank,
  PlusCircle,
  CreditCard,
  Building2,
  UserCheck,
  Edit2,
  Trash2,
  ArrowRightLeft,
  Coins,
  ShieldCheck,
} from 'lucide-react';
import { AddAccountModal } from './AddAccountModal.js';

interface AccountsTabProps {
  accounts: Account[];
  onAddAccount: (account: Partial<Account>) => Promise<void>;
  onUpdateAccount: (id: string, account: Partial<Account>) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
  onSelectAccountTransactions: (accountId: string) => void;
}

export const AccountsTab: React.FC<AccountsTabProps> = ({
  accounts,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onSelectAccountTransactions,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const formatToman = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount);
  };

  // محاسبات دارایی‌ها
  const liquidAccounts = accounts.filter((a) => a.type === 'bank' || a.type === 'wallet');
  const totalLiquidBalance = liquidAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  const savingsAccounts = accounts.filter((a) => a.type === 'savings');
  const totalSavingsBalance = savingsAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  const totalAssets = totalLiquidBalance + totalSavingsBalance;

  // فیلتر حساب‌ها
  const filteredAccounts = accounts.filter((a) => {
    if (filterType === 'all') return true;
    return a.type === filterType;
  });

  const getAccountIcon = (acc: Account) => {
    switch (acc.type) {
      case 'wallet':
        return <Wallet className="w-5 h-5" />;
      case 'savings':
        return <PiggyBank className="w-5 h-5" />;
      case 'counterparty':
        return <UserCheck className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getAccountTypeLabel = (type: Account['type']) => {
    switch (type) {
      case 'bank':
        return 'حساب بانکی';
      case 'wallet':
        return 'کیف پول نقد';
      case 'savings':
        return 'پس‌انداز و صندوق';
      case 'counterparty':
        return 'طرف‌حساب';
      case 'credit':
        return 'کارت اعتباری';
      default:
        return 'حساب مالی';
    }
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-8">
      {/* کارت خلاصه دارایی‌ها و تراز حسابداری */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* ۱. مجموع کل دارایی‌ها */}
        <div className="glass-card p-4 sm:p-5 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-sky-950/40 border-sky-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-sky-300 font-semibold">مجموع کل دارایی‌ها</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {formatToman(totalAssets)}
            <span className="text-xs sm:text-sm font-normal text-slate-400 mr-1.5">تومان</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            تراز کل دارایی‌های نقد، بانکی و پس‌انداز
          </div>
        </div>

        {/* ۲. نقدینگی و حساب‌های جاری */}
        <div className="glass-card p-4 sm:p-5 relative overflow-hidden border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-emerald-400 font-medium">نقدینگی در دسترس</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 tracking-tight">
            {formatToman(totalLiquidBalance)}
            <span className="text-xs sm:text-sm font-normal text-slate-400 mr-1.5">تومان</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">حساب‌های بانکی و کیف پول نقد</div>
        </div>

        {/* ۳. پس‌انداز و سرمایه‌گذاری */}
        <div className="glass-card p-4 sm:p-5 relative overflow-hidden border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-purple-400 font-medium">صندوق‌های پس‌انداز</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-400 tracking-tight">
            {formatToman(totalSavingsBalance)}
            <span className="text-xs sm:text-sm font-normal text-slate-400 mr-1.5">تومان</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">اندوخته و سرمایه‌گذاری‌های بلندمدت</div>
        </div>
      </div>

      {/* نوار فیلتر و دکمه افتتاح حساب */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* فیلتر نوع حساب */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'همه حساب‌ها' },
            { id: 'bank', label: 'حساب‌های بانکی' },
            { id: 'wallet', label: 'کیف پول نقد' },
            { id: 'savings', label: 'پس‌انداز' },
            { id: 'counterparty', label: 'طرف‌حساب‌ها' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterType(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                filterType === item.id
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* دکمه افتتاح حساب جدید */}
        <button
          onClick={() => {
            setEditingAccount(null);
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-sky-500/20 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>افتتاح / تعریف حساب جدید</span>
        </button>
      </div>

      {/* شبکه کارت‌های حساب‌های مالی */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.map((acc) => {
          return (
            <div
              key={acc.id}
              className="glass-card p-4 sm:p-5 relative overflow-hidden transition hover:border-slate-700/80 hover:shadow-xl group"
              style={{
                borderRightWidth: '4px',
                borderRightColor: acc.color || '#0284c7',
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
                    style={{ backgroundColor: `${acc.color || '#0284c7'}30`, color: acc.color || '#0284c7' }}
                  >
                    {getAccountIcon(acc)}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-sky-300 transition">
                      {acc.name}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {getAccountTypeLabel(acc.type)}
                      {acc.bankName && ` • ${acc.bankName}`}
                    </span>
                  </div>
                </div>

                {/* دکمه‌های ویرایش و حذف */}
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                  <button
                    onClick={() => {
                      setEditingAccount(acc);
                      setIsAddModalOpen(true);
                    }}
                    title="ویرایش حساب"
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`آیا از حذف حساب "${acc.name}" اطمینان دارید؟`)) {
                        onDeleteAccount(acc.id);
                      }
                    }}
                    title="حذف حساب"
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* شماره کارت یا حساب */}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono">
                  {acc.cardNumber || (acc.accountNumber ? `**** ${acc.accountNumber}` : '---')}
                </span>
                <div className="flex items-center gap-1.5">
                  {acc.isSource && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-sky-400 border border-sky-500/30">
                      مبدأ
                    </span>
                  )}
                  {acc.isDestination && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-emerald-400 border border-emerald-500/30">
                      مقصد
                    </span>
                  )}
                </div>
              </div>

              {/* مانده حساب */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-end justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">مانده فعلی حساب:</span>
                  <div className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {formatToman(acc.balance || 0)}
                    <span className="text-xs font-normal text-slate-400 mr-1">تومان</span>
                  </div>
                </div>

                {/* دکمه مشاهده تراکنش‌های این حساب */}
                <button
                  onClick={() => onSelectAccountTransactions(acc.id)}
                  className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition py-1 px-2.5 rounded-lg hover:bg-sky-500/10"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>گردش حساب</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAccounts.length === 0 && (
        <div className="glass-card p-10 text-center">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">هیچ حسابی در این دسته یافت نشد.</p>
          <button
            onClick={() => {
              setEditingAccount(null);
              setIsAddModalOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-2 bg-sky-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs hover:bg-sky-400 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>افتتاح حساب جدید</span>
          </button>
        </div>
      )}

      {/* مودال ایجاد و ویرایش حساب */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingAccount(null);
        }}
        initialData={editingAccount}
        onSave={async (data) => {
          if (editingAccount) {
            await onUpdateAccount(editingAccount.id, data);
          } else {
            await onAddAccount(data);
          }
        }}
      />
    </div>
  );
};
