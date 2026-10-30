import React, { useState, useEffect } from 'react';
import { Transaction, Category } from './types.js';
import { api } from './lib/api.js';
import { Header } from './components/Header.js';
import { Navigation, TabType } from './components/Navigation.js';
import { TransactionsTab } from './components/TransactionsTab.js';
import { SplitwiseTab } from './components/SplitwiseTab.js';
import { AnalyticsTab } from './components/AnalyticsTab.js';
import { SettingsTab } from './components/SettingsTab.js';
import { SmsSimulatorModal } from './components/SmsSimulatorModal.js';
import { ToSplitModal } from './components/ToSplitModal.js';
import { AddExpenseModal } from './components/AddExpenseModal.js';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // وضعیت‌های مودال
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [splitModalTx, setSplitModalTx] = useState<Transaction | null>(null);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);

  // پیام موفقیت عمومی
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [txList, catList] = await Promise.all([
        api.getTransactions(),
        api.getCategories(),
      ]);
      setTransactions(txList);
      setCategories(catList);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ثبت پیامک جدید از شبیه‌ساز
  const handleSaveSmsTransaction = async (smsText: string) => {
    const res = await api.ingestSms(smsText);
    if (res.success && res.transaction) {
      setTransactions((prev) => [res.transaction!, ...prev]);
      showToast(`پیامک ${res.transaction.bankName} با موفقیت پردازش و ثبت شد!`);
    } else {
      showToast(res.message || 'خطا در ثبت پیامک');
    }
  };

  // تبدیل تراکنش به دنگ
  const handleConfirmSplit = async (tx: Transaction, groupId: string, participants: string[]) => {
    await api.convertToSplit(tx.id, groupId, participants);
    showToast(`تراکنش "${tx.description || tx.bankName}" با موفقیت بین اعضا تقسیم شد.`);
  };

  // ثبت هزینه جدید گروهی
  const handleAddGroupExpense = (data: { description: string; amount: number; payerName: string }) => {
    showToast(`هزینه "${data.description}" به مبلغ ${new Intl.NumberFormat('fa-IR').format(data.amount)} ت ثبت شد.`);
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
        {/* نوار ناوبری بالا در دسکتاپ و پایین در موبایل */}
        <Navigation activeTab={activeTab} onChangeTab={setActiveTab} />

        <div className="mt-5">
          {activeTab === 'transactions' && (
            <TransactionsTab
              transactions={transactions}
              categories={categories}
              onOpenSplitModal={(tx) => setSplitModalTx(tx)}
            />
          )}

          {activeTab === 'split' && (
            <SplitwiseTab onOpenAddExpense={() => setIsAddExpenseOpen(true)} />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab transactions={transactions} categories={categories} />
          )}

          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>

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
