import React, { useState, useEffect } from 'react';
import { Transaction, Account, PendingSms, FiscalYear } from './types.js';
import { api } from './lib/api.js';
import { Header } from './components/Header.js';
import { Navigation, TabType } from './components/Navigation.js';
import { TransactionsTab } from './components/TransactionsTab.js';
import { AccountsTab } from './components/AccountsTab.js';
import { SplitwiseTab } from './components/SplitwiseTab.js';
import { AnalyticsTab } from './components/AnalyticsTab.js';
import { SettingsTab } from './components/SettingsTab.js';
import { SmsInboxModal } from './components/SmsInboxModal.js';
import { ToSplitModal } from './components/ToSplitModal.js';
import { AddExpenseModal, NewGroupExpenseData } from './components/AddExpenseModal.js';
import { GroupExpenseRecord } from './components/SplitwiseTab.js';
import { AddTransactionModal } from './components/AddTransactionModal.js';
import { EditTransactionModal } from './components/EditTransactionModal.js';
import { CheckCircle2 } from 'lucide-react';

const PAGE_SIZE = 25;

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pendingSmsList, setPendingSmsList] = useState<PendingSms[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // وضعیت‌های مودال
  const [isInboxOpen, setIsInboxOpen] = useState<boolean>(false);
  const [splitModalTx, setSplitModalTx] = useState<Transaction | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState<boolean>(false);

  // پیام موفقیت عمومی
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async (fyId?: string | null) => {
    setIsLoading(true);
    try {
      const fyList = await api.getFiscalYears();
      setFiscalYears(fyList);
      const activeFy = fyList.find((f) => f.isActive === 1 || f.status === 'open') || fyList[0];
      const effectiveFyId = fyId !== undefined ? fyId : selectedFiscalYearId || activeFy?.id || null;
      if (effectiveFyId && effectiveFyId !== selectedFiscalYearId) {
        setSelectedFiscalYearId(effectiveFyId);
      }

      const [txList, accList, pendingList] = await Promise.all([
        api.getTransactions({
          limit: PAGE_SIZE,
          offset: 0,
          fiscalYearId: effectiveFyId || undefined,
        }),
        api.getAccounts(),
        api.getPendingSms(),
      ]);
      setTransactions(txList);
      setAccounts(accList);
      setPendingSmsList(pendingList);
      setHasMore(txList.length >= PAGE_SIZE);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFiscalYear = async (id: string) => {
    setSelectedFiscalYearId(id);
    await loadData(id);
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextBatch = await api.getTransactions({
        limit: PAGE_SIZE,
        offset: transactions.length,
        fiscalYearId: selectedFiscalYearId || undefined,
      });
      if (nextBatch.length > 0) {
        setTransactions((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const uniqueNew = nextBatch.filter((t) => !existingIds.has(t.id));
          return [...prev, ...uniqueNew];
        });
      }
      setHasMore(nextBatch.length >= PAGE_SIZE);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ثبت تراکنش جدید حسابداری
  const handleAddTransaction = async (data: {
    amount: number;
    type: 'debit' | 'credit' | 'transfer' | 'compound';
    fromAccountId?: string;
    toAccountId?: string;
    description?: string;
    trackingCode?: string;
    transactionDate?: string;
    items?: Array<{
      entryType: 'source' | 'destination';
      accountId?: string | null;
      amount: number;
      description?: string | null;
    }>;
  }) => {
    const newTx = await api.createTransaction(data);
    setTransactions((prev) => [newTx, ...prev]);

    // بارگذاری مجدد مانده حساب‌ها
    const updatedAccounts = await api.getAccounts();
    setAccounts(updatedAccounts);

    const typeLabel =
      data.type === 'debit'
        ? 'هزینه'
        : data.type === 'credit'
        ? 'درآمد'
        : data.type === 'compound'
        ? 'مرکب چند حسابی'
        : 'انتقال بین‌حسابی';
    showToast(`سند ${typeLabel} به مبلغ ${new Intl.NumberFormat('fa-IR').format(Math.round(data.amount / 10))} ت ثبت شد.`);
  };

  // ویرایش و اصلاح تراکنش
  const handleUpdateTransaction = async (
    id: string,
    data: {
      amount: number;
      type: 'debit' | 'credit' | 'transfer' | 'compound';
      fromAccountId?: string | null;
      toAccountId?: string | null;
      description?: string;
      transactionDate?: string;
      shamsiDate?: string;
    }
  ) => {
    const success = await api.updateTransaction(id, data);
    if (success) {
      await loadData();
      showToast('تراکنش با موفقیت اصلاح و مانده حساب‌ها بروزرسانی شد.');
    } else {
      showToast('خطا در ذخیره تغییرات تراکنش.');
    }
  };

  // حذف تراکنش
  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('آیا از حذف این سند مالی اطمینان دارید؟ اثر مالی آن به حساب‌ها بازگردانده می‌شود.')) {
      return;
    }

    const success = await api.deleteTransaction(id);
    if (success) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      const updatedAccounts = await api.getAccounts();
      setAccounts(updatedAccounts);
      showToast('تراکنش با موفقیت حذف و اثر آن برگردانده شد.');
    }
  };

  // ثبت حساب جدید با کلید والد درختی
  const handleAddAccount = async (accountData: Partial<Account>) => {
    if (!accountData.name) return;
    const newAcc = await api.createAccount({
      name: accountData.name,
      type: accountData.type,
      parentId: accountData.parentId,
      bankName: accountData.bankName,
      accountNumber: accountData.accountNumber,
      cardNumber: accountData.cardNumber,
      sheba: accountData.sheba,
      color: accountData.color,
      icon: accountData.icon,
      initialBalance: accountData.initialBalance,
      balance: accountData.balance,
    });
    setAccounts((prev) => [...prev, newAcc]);
    showToast(`حساب "${newAcc.name}" با موفقیت تعریف شد.`);
  };

  // بروزرسانی حساب
  const handleUpdateAccount = async (id: string, accountData: Partial<Account>) => {
    const success = await api.updateAccount(id, accountData);
    if (success) {
      const updatedList = await api.getAccounts();
      setAccounts(updatedList);
      showToast('اطلاعات حساب بروزرسانی شد.');
    }
  };

  // حذف یا آرشیو حساب
  const handleDeleteAccount = async (id: string) => {
    const success = await api.deleteAccount(id);
    if (success) {
      const updatedList = await api.getAccounts();
      setAccounts(updatedList);
      showToast('حساب با موفقیت حذف یا آرشیو شد.');
    }
  };

  // انتخاب حساب برای فیلتر
  const handleSelectAccountTransactions = (accId: string) => {
    setSelectedAccountId(accId);
    setActiveTab('transactions');
  };

  // دریافت و ذخیره پیامک خام
  const handleSaveSmsTransaction = async (smsText: string) => {
    const res = await api.ingestSms(smsText);
    if (res.success) {
      const pendingList = await api.getPendingSms();
      setPendingSmsList(pendingList);
      await loadData();
      showToast(res.message || 'پیامک بانکی دریافت و ذخیره شد.');
    } else {
      showToast(res.message || 'پیامک نامعتبر است.');
    }
  };

  // تبدیل پیامک صف به تراکنش
  const handleConvertPendingSms = async (
    smsId: string,
    data: {
      fromAccountId?: string;
      toAccountId?: string;
      amount?: number;
      description?: string;
    }
  ) => {
    const ok = await api.convertSmsToTransaction(smsId, data);
    if (ok) {
      await loadData();
      showToast('پیامک با موفقیت به سند حسابداری تبدیل شد.');
    } else {
      showToast('خطا در تبدیل پیامک به سند.');
    }
  };

  // نادیده گرفتن پیامک
  const handleIgnorePendingSms = async (smsId: string) => {
    const ok = await api.ignoreSms(smsId);
    if (ok) {
      setPendingSmsList((prev) => prev.filter((s) => s.id !== smsId));
      showToast('پیامک نادیده گرفته شد.');
    }
  };

  // تایید تبدیل به دنگ
  const handleConfirmSplit = async (
    tx: Transaction,
    groupId: string,
    participants: string[],
    splits?: Array<{ userId: string; owedAmount: number; percentage?: number }>
  ) => {
    await api.convertToSplit(tx.id, groupId, participants);

    const calculatedSplits =
      splits ||
      participants.map((p) => ({
        userId: p,
        owedAmount: Math.round(tx.amount / participants.length),
      }));

    const isPercentage = Boolean(splits && splits.some((s) => s.percentage !== undefined));

    const newRecord: GroupExpenseRecord = {
      id: `exp_tx_${tx.id}`,
      payerName: 'من',
      description: tx.description || `خرید ${tx.bankName || 'بانکی'}`,
      amount: tx.amount,
      date: tx.transactionDate,
      splitType: isPercentage ? 'percentage' : 'equal',
      splits: calculatedSplits,
    };

    const saved = localStorage.getItem('jibban_local_group_expenses');
    const list: GroupExpenseRecord[] = saved ? JSON.parse(saved) : [];
    localStorage.setItem('jibban_local_group_expenses', JSON.stringify([newRecord, ...list]));

    showToast(`تراکنش "${tx.description || tx.bankName || 'بانکی'}" با موفقیت در گروه دنگ ثبت شد.`);
  };

  // ثبت هزینه جدید گروهی
  const handleAddGroupExpense = (data: NewGroupExpenseData) => {
    const newRecord: GroupExpenseRecord = {
      id: `exp_${Date.now()}`,
      payerName: data.payerName,
      description: data.description,
      amount: data.amount,
      date: new Date().toISOString(),
      splitType: data.splitType,
      splits: data.splits,
    };

    const saved = localStorage.getItem('jibban_local_group_expenses');
    const list: GroupExpenseRecord[] = saved ? JSON.parse(saved) : [];
    localStorage.setItem('jibban_local_group_expenses', JSON.stringify([newRecord, ...list]));

    showToast(`هزینه "${data.description}" در گروه دنگ ذخیره شد.`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-200">
      {/* اعلان موفقیت / Toast */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-500/90 text-slate-950 font-bold px-4 py-2.5 rounded-2xl shadow-xl shadow-emerald-500/20 backdrop-blur-md text-xs sm:text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* هدر اپلیکیشن */}
      <Header
        onOpenInbox={() => setIsInboxOpen(true)}
        pendingCount={pendingSmsList.length}
        fiscalYears={fiscalYears}
        selectedFiscalYearId={selectedFiscalYearId}
        onSelectFiscalYear={handleSelectFiscalYear}
      />

      {/* محتوای اصلی */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        {/* نوار ناوبری اصلی */}
        <Navigation activeTab={activeTab} onChangeTab={setActiveTab} />

        <div className="mt-5">
          {activeTab === 'transactions' && (
            <TransactionsTab
              transactions={transactions}
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onSelectAccount={setSelectedAccountId}
              onOpenAddModal={() => setIsAddTxOpen(true)}
              onOpenEditModal={(tx) => setEditingTx(tx)}
              onOpenSplitModal={(tx) => setSplitModalTx(tx)}
              onDeleteTransaction={handleDeleteTransaction}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsTab
              accounts={accounts}
              onAddAccount={handleAddAccount}
              onUpdateAccount={handleUpdateAccount}
              onDeleteAccount={handleDeleteAccount}
              onSelectAccountTransactions={handleSelectAccountTransactions}
            />
          )}

          {activeTab === 'split' && (
            <SplitwiseTab onOpenAddExpense={() => setIsAddExpenseOpen(true)} />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab
              transactions={transactions}
              accounts={accounts}
            />
          )}

          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>

      {/* مودال صندوق پیامک‌های بانکی */}
      <SmsInboxModal
        isOpen={isInboxOpen}
        onClose={() => setIsInboxOpen(false)}
        pendingList={pendingSmsList}
        accounts={accounts}
        onConvert={handleConvertPendingSms}
        onIgnore={handleIgnorePendingSms}
      />

      {/* مودال ثبت تراکنش جدید حسابداری */}
      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        accounts={accounts}
        onAddTransaction={handleAddTransaction}
      />

      {/* مودال ویرایش و اصلاح تراکنش */}
      <EditTransactionModal
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
        accounts={accounts}
        onUpdateTransaction={handleUpdateTransaction}
      />

      {/* مودال اشتراک‌گذاری در دنگ (Magic Modal) */}
      <ToSplitModal
        isOpen={Boolean(splitModalTx)}
        transaction={splitModalTx}
        onClose={() => setSplitModalTx(null)}
        onConfirmSplit={handleConfirmSplit}
      />

      {/* مودال ثبت خرج گروهی */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onAddExpense={handleAddGroupExpense}
      />
    </div>
  );
};
