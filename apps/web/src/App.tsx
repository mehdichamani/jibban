import React, { useState, useEffect } from 'react';
import { Transaction, Category, Account } from './types.js';
import { api } from './lib/api.js';
import { Header } from './components/Header.js';
import { Navigation, TabType } from './components/Navigation.js';
import { TransactionsTab } from './components/TransactionsTab.js';
import { AccountsTab } from './components/AccountsTab.js';
import { SplitwiseTab } from './components/SplitwiseTab.js';
import { AnalyticsTab } from './components/AnalyticsTab.js';
import { SettingsTab } from './components/SettingsTab.js';
import { SmsSimulatorModal } from './components/SmsSimulatorModal.js';
import { ToSplitModal } from './components/ToSplitModal.js';
import { AddExpenseModal, NewGroupExpenseData } from './components/AddExpenseModal.js';
import { GroupExpenseRecord } from './components/SplitwiseTab.js';
import { AddTransactionModal } from './components/AddTransactionModal.js';
import { CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // وضعیت‌های مودال
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [splitModalTx, setSplitModalTx] = useState<Transaction | null>(null);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState<boolean>(false);

  // پیام موفقیت عمومی
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [txList, accList, catList] = await Promise.all([
        api.getTransactions(),
        api.getAccounts(),
        api.getCategories(),
      ]);
      setTransactions(txList);
      setAccounts(accList);
      setCategories(catList);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ثبت تراکنش جدید حسابداری
  const handleAddTransaction = async (data: {
    amount: number;
    type: 'debit' | 'credit' | 'transfer';
    fromAccountId?: string;
    toAccountId?: string;
    categoryId?: string;
    description?: string;
    trackingCode?: string;
    transactionDate?: string;
  }) => {
    const newTx = await api.createTransaction(data);
    setTransactions((prev) => [newTx, ...prev]);

    // بارگذاری مجدد مانده حساب‌ها
    const updatedAccounts = await api.getAccounts();
    setAccounts(updatedAccounts);

    const typeLabel = data.type === 'debit' ? 'هزینه' : data.type === 'credit' ? 'درآمد' : 'انتقال بین‌حسابی';
    showToast(`تراکنش ${typeLabel} به مبلغ ${new Intl.NumberFormat('fa-IR').format(data.amount)} ت ثبت شد.`);
  };

  // حذف تراکنش
  const handleDeleteTransaction = async (id: string) => {
    await api.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    const updatedAccounts = await api.getAccounts();
    setAccounts(updatedAccounts);
    showToast('تراکنش با موفقیت حذف و اثر مالی آن بازگردانده شد.');
  };

  // تعریف حساب جدید
  const handleAddAccount = async (accountData: Partial<Account>) => {
    const newAcc = await api.createAccount(accountData as any);
    setAccounts((prev) => [...prev, newAcc]);
    showToast(`حساب "${newAcc.name}" با موفقیت تعریف شد.`);
  };

  // ویرایش حساب
  const handleUpdateAccount = async (id: string, accountData: Partial<Account>) => {
    await api.updateAccount(id, accountData);
    const updated = await api.getAccounts();
    setAccounts(updated);
    showToast('اطلاعات حساب با موفقیت بروزرسانی شد.');
  };

  // حذف حساب
  const handleDeleteAccount = async (id: string) => {
    await api.deleteAccount(id);
    const updated = await api.getAccounts();
    setAccounts(updated);
    showToast('حساب با موفقیت حذف یا بایگانی شد.');
  };

  // هدایت از حساب‌ها به تب تراکنش‌ها برای مشاهده گردش حساب
  const handleSelectAccountTransactions = (accountId: string) => {
    setSelectedAccountId(accountId);
    setActiveTab('transactions');
  };

  // ثبت پیامک جدید از شبیه‌ساز یا دستگاه اندروید
  const handleSaveSmsTransaction = async (smsText: string) => {
    const res = await api.ingestSms(smsText);
    if (res.success && res.transaction) {
      setTransactions((prev) => [res.transaction!, ...prev]);
      const updatedAccounts = await api.getAccounts();
      setAccounts(updatedAccounts);
      showToast(`پیامک ${res.transaction.bankName || 'بانکی'} با موفقیت پردازش و ثبت شد!`);
    } else {
      showToast(res.message || 'خطا در ثبت پیامک');
    }
  };

  // تبدیل تراکنش به دنگ
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

    const splitLabel = data.splitType === 'percentage' ? 'درصدی' : 'مساوی';
    showToast(`هزینه "${data.description}" به مبلغ ${new Intl.NumberFormat('fa-IR').format(data.amount)} ت (${splitLabel}) ثبت شد.`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* پیام بازخورد شناور (Toast) */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-2xl shadow-xl font-bold text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* هدر اپلیکیشن */}
      <Header onOpenSimulator={() => setIsSimulatorOpen(true)} />

      {/* محتوای اصلی */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        {/* نوار ناوبری اصلی */}
        <Navigation activeTab={activeTab} onChangeTab={setActiveTab} />

        <div className="mt-5">
          {activeTab === 'transactions' && (
            <TransactionsTab
              transactions={transactions}
              categories={categories}
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onSelectAccount={setSelectedAccountId}
              onOpenAddModal={() => setIsAddTxOpen(true)}
              onOpenSplitModal={(tx) => setSplitModalTx(tx)}
              onDeleteTransaction={handleDeleteTransaction}
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
              categories={categories}
              accounts={accounts}
            />
          )}

          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>

      {/* مودال ثبت تراکنش جدید حسابداری */}
      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        accounts={accounts}
        categories={categories}
        onAddTransaction={handleAddTransaction}
      />

      {/* مودال شبیه‌ساز پیامک بانکی */}
      <SmsSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSaveTransaction={handleSaveSmsTransaction}
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
