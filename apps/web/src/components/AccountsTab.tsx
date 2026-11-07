import React, { useState } from 'react';
import { Account } from '../types.js';
import {
  Wallet,
  PiggyBank,
  Plus,
  CreditCard,
  UserCheck,
  Edit2,
  Trash2,
  ArrowRightLeft,
  Coins,
  ChevronDown,
  ChevronLeft,
  Folder,
  FolderOpen,
  ShoppingBag,
  TrendingUp,
  CornerDownLeft,
} from 'lucide-react';
import { AddAccountModal } from './AddAccountModal.js';
import { formatToman as formatTomanCurrency } from '../lib/currency.js';

interface AccountsTabProps {
  accounts: Account[];
  onAddAccount: (account: Partial<Account>) => Promise<void>;
  onUpdateAccount: (id: string, account: Partial<Account>) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
  onSelectAccountTransactions: (accountId: string) => void;
}

interface AccountTreeNode extends Account {
  children: AccountTreeNode[];
  subtreeBalance: number;
}

export const AccountsTab: React.FC<AccountsTabProps> = ({
  accounts,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onSelectAccountTransactions,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);

  // گره‌های باز شده در درخت (هم شناسه‌های عددی و هم پیشوند دار acc_)
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    accounts.forEach((a) => {
      // باز بودن سرفصل‌های ریشه اصلی
      if (!a.parentId || a.parentId === '0') {
        initial.add(a.id);
      }
    });
    ['1', '2', '3', '4', '161', 'acc_1', 'acc_2', 'acc_3', 'acc_4', 'acc_161'].forEach((id) =>
      initial.add(id)
    );
    return initial;
  });

  const formatToman = (amount: number) => {
    return formatTomanCurrency(amount, { showUnit: false });
  };

  const toggleExpand = (id: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // محاسبات دارایی‌ها
  const liquidAccounts = accounts.filter((a) => a.type === 'bank' || a.type === 'wallet');
  const totalLiquidBalance = liquidAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  const savingsAccounts = accounts.filter((a) => a.type === 'savings');
  const totalSavingsBalance = savingsAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  const totalAssets = totalLiquidBalance + totalSavingsBalance;

  // نرمال‌سازی شناسه والد برای تطبیق
  const normalizeId = (id?: string | null): string => {
    if (!id) return '';
    const str = String(id).trim();
    if (str === '0' || str === '-1') return '';
    return str;
  };

  // ساخت درخت سرفصل‌های پارمیس
  const buildAccountTree = (accountList: Account[]): AccountTreeNode[] => {
    const map = new Map<string, AccountTreeNode>();

    accountList.forEach((acc) => {
      const node: AccountTreeNode = {
        ...acc,
        children: [],
        subtreeBalance: acc.balance || 0,
      };
      map.set(acc.id, node);
      const rawId = acc.id.replace(/^acc_/, '');
      if (rawId !== acc.id) {
        map.set(rawId, node);
      }
    });

    const roots: AccountTreeNode[] = [];

    accountList.forEach((acc) => {
      const node = map.get(acc.id)!;
      const pid = normalizeId(acc.parentId);

      if (pid) {
        const parentNode = map.get(pid) || map.get(`acc_${pid}`) || map.get(pid.replace(/^acc_/, ''));
        if (parentNode && parentNode.id !== acc.id) {
          parentNode.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    // محاسبه بازگشتی تراز زیردرخت
    const computeSubtree = (node: AccountTreeNode): number => {
      let sum = node.balance || 0;
      for (const child of node.children) {
        sum += computeSubtree(child);
      }
      node.subtreeBalance = sum;
      return sum;
    };

    roots.forEach(computeSubtree);
    return roots;
  };

  const accountTree = buildAccountTree(accounts);

  const getAccountIcon = (acc: Account) => {
    switch (acc.type) {
      case 'wallet':
        return <Wallet className="w-4 h-4 text-emerald-400" />;
      case 'savings':
        return <PiggyBank className="w-4 h-4 text-amber-400" />;
      case 'expense':
        return <ShoppingBag className="w-4 h-4 text-rose-400" />;
      case 'income':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'counterparty':
      case 'debt':
        return <UserCheck className="w-4 h-4 text-indigo-400" />;
      default:
        return <CreditCard className="w-4 h-4 text-sky-400" />;
    }
  };

  // رندر گره‌های درختی با خطوط راهنما و تورفتگی واقعی RTL
  const renderTreeNode = (node: AccountTreeNode, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodeIds.has(node.id) || expandedNodeIds.has(node.id.replace(/^acc_/, ''));

    const indentPixels = depth * 28;

    return (
      <div key={node.id} className="relative space-y-1">
        <div
          className={`flex items-center justify-between p-2.5 rounded-xl transition-all duration-150 group ${
            depth === 0
              ? 'bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-sm'
              : depth === 1
              ? 'bg-slate-900/40 border border-slate-800/60 hover:bg-slate-900/70'
              : 'bg-slate-950/40 hover:bg-slate-900/50 border border-slate-800/30'
          }`}
          style={{ marginRight: `${indentPixels}px` }}
        >
          {/* سمت راست: خط اتصال، آیکون باز/بسته، آیکون و نام حساب */}
          <div className="flex items-center gap-2.5 min-w-0">
            {depth > 0 && (
              <CornerDownLeft className="w-3.5 h-3.5 text-slate-600 shrink-0 opacity-60" />
            )}

            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-sky-400" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                )}
              </button>
            ) : (
              <div className="w-5 text-center text-slate-600 text-xs shrink-0">•</div>
            )}

            <div className="shrink-0">
              {hasChildren ? (
                isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-amber-400" />
                ) : (
                  <Folder className="w-4 h-4 text-amber-500/80" />
                )
              ) : (
                getAccountIcon(node)
              )}
            </div>

            <div className="min-w-0 flex items-center gap-2">
              <span
                className={`text-xs sm:text-sm font-semibold truncate ${
                  depth === 0 ? 'text-white' : depth === 1 ? 'text-slate-100' : 'text-slate-300'
                }`}
              >
                {node.name}
              </span>
              {node.bankName && (
                <span className="text-[10px] text-slate-400 hidden sm:inline">({node.bankName})</span>
              )}
              {hasChildren && (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
                  {node.children.length}
                </span>
              )}
            </div>
          </div>

          {/* سمت چپ: مانده و دکمه‌های اقدام */}
          <div className="flex items-center gap-3">
            <div className="text-left font-mono">
              <span className="text-xs sm:text-sm font-bold text-white">
                {formatToman(hasChildren ? node.subtreeBalance : node.balance || 0)}
              </span>
              <span className="text-[10px] text-slate-400 mr-1">تومان</span>
            </div>

            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
              {/* دکمه افزودن زیرحساب */}
              <button
                onClick={() => {
                  setDefaultParentId(node.id);
                  setEditingAccount(null);
                  setIsAddModalOpen(true);
                }}
                title="افزودن زیرمجموعه به این سرفصل"
                className="w-6 h-6 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 flex items-center justify-center transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* گردش حساب */}
              <button
                onClick={() => onSelectAccountTransactions(node.id)}
                title="مشاهده گردش حساب"
                className="w-6 h-6 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 flex items-center justify-center transition"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>

              {/* ویرایش */}
              <button
                onClick={() => {
                  setEditingAccount(node);
                  setIsAddModalOpen(true);
                }}
                title="ویرایش سرفصل"
                className="w-6 h-6 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              {/* حذف */}
              <button
                onClick={() => {
                  if (confirm(`آیا از حذف حساب "${node.name}" اطمینار دارید؟`)) {
                    onDeleteAccount(node.id);
                  }
                }}
                title="حذف حساب"
                className="w-6 h-6 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* فرزندان زیرمجموعه در صورت باز بودن */}
        {hasChildren && isExpanded && (
          <div className="space-y-1 relative pr-3 border-r-2 border-sky-500/20 my-1">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-28 sm:pb-12 relative">
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
          <div className="mt-2 text-xs text-slate-400">تراز کل دارایی‌های نقد، بانکی و پس‌انداز</div>
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
          <div className="mt-2 text-xs text-slate-400">بانک‌ها و کیف‌پول‌های نقدی</div>
        </div>

        {/* ۳. پس‌انداز و صندوق‌ها */}
        <div className="glass-card p-4 sm:p-5 relative overflow-hidden border-amber-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-amber-400 font-medium">پس‌انداز و صندوق</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-400 tracking-tight">
            {formatToman(totalSavingsBalance)}
            <span className="text-xs sm:text-sm font-normal text-slate-400 mr-1.5">تومان</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">سپرده‌ها و صندوق‌های پس‌انداز</div>
        </div>
      </div>

      {/* درخت حساب‌ها */}
      <div className="glass-card p-3 sm:p-5 space-y-2 border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400">
          <span>درخت حسابداری (سرفصل‌های کل، معین و تفصیلی)</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpandedNodeIds(new Set(accounts.map((a) => a.id)))}
              className="hover:text-sky-400 transition"
            >
              باز کردن همه
            </button>
            <span>•</span>
            <button
              onClick={() => setExpandedNodeIds(new Set())}
              className="hover:text-sky-400 transition"
            >
              بستن همه
            </button>
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          {accountTree.map((root) => renderTreeNode(root, 0))}
        </div>

        {accountTree.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-xs">
            هیچ حسابی یافت نشد.
          </div>
        )}
      </div>

      {/* دکمه شناور ایجاد حساب جدید (Floating Action Button) */}
      <button
        onClick={() => {
          setDefaultParentId(null);
          setEditingAccount(null);
          setIsAddModalOpen(true);
        }}
        aria-label="افزودن حساب جدید"
        className="fixed bottom-20 sm:bottom-8 left-6 sm:left-8 z-40 flex items-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold px-4 py-3.5 rounded-full shadow-2xl shadow-sky-500/40 hover:scale-105 active:scale-95 transition-all duration-200 border border-sky-400/30"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
        <span className="text-xs sm:text-sm font-semibold pl-1">حساب جدید</span>
      </button>

      {/* مودال ایجاد و ویرایش حساب */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingAccount(null);
          setDefaultParentId(null);
        }}
        accounts={accounts}
        defaultParentId={defaultParentId}
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
