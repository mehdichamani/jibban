import React, { useState } from 'react';
import { Settings, Key, Copy, Check, Smartphone, ShieldCheck, Database, RefreshCw, Inbox, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { getSyncToken, setSyncToken, api } from '../lib/api.js';

export const SettingsTab: React.FC = () => {
  const [token, setToken] = useState<string>(getSyncToken());
  const [copied, setCopied] = useState<boolean>(false);
  const [serverUrl, setServerUrl] = useState<string>('https://jibban-api.ajbv.ir');
  const [resetDone, setResetDone] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  const isAndroid = typeof window !== 'undefined' && Boolean((window as any).AndroidBridge);

  const handleCopy = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGenerateNewToken = () => {
    const newToken = `jibban_sync_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    setSyncToken(newToken);
    setToken(newToken);
  };

  const handleScanInbox = async () => {
    const bridge = (window as any).AndroidBridge;
    if (!bridge || typeof bridge.scanInboxSms !== 'function') {
      alert('این قابلیت فقط در صورت اجرای برنامه از طریق اپلیکیشن اختصاصی اندروید فعال است.');
      return;
    }

    setIsScanning(true);
    setScanResult(null);

    try {
      const rawJson = bridge.scanInboxSms(100);
      const parsed = JSON.parse(rawJson);

      if (!parsed.success) {
        if (parsed.error === 'permission_denied' && typeof bridge.requestSmsPermissions === 'function') {
          bridge.requestSmsPermissions();
        }
        setScanResult({
          success: false,
          message: parsed.message || 'خطا در اسکن پیامک‌ها (بررسی دسترسی پیامک در اندروید)',
        });
        return;
      }

      const messages = parsed.messages || [];
      let importedCount = 0;

      for (const msg of messages) {
        const res = await api.ingestSms(msg.body);
        if (res.success) {
          importedCount++;
        }
      }

      setScanResult({
        success: true,
        message: `اسکن با موفقیت پایان یافت: از ${parsed.scannedCount} پیامک اخیر، ${parsed.bankFoundCount} پیامک بانکی شناسایی شد و ${importedCount} تراکنش به حساب شما افزوده شد.`,
      });

      setTimeout(() => {
        window.location.reload();
      }, 2500);
    } catch (e: any) {
      setScanResult({
        success: false,
        message: e?.message || 'خطا در ارتباط با ماژول خواندن پیامک اندروید',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleResetData = () => {
    if (confirm('آیا از بازنشانی داده‌های محلی و بارگذاری مجدد دیتای نمونه اطمینان دارید؟')) {
      localStorage.clear();
      setResetDone(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-sky-400" />
        <h2 className="text-lg font-bold text-white">تنظیمات و همگام‌سازی ابری</h2>
      </div>

      {/* کارت کلید اختصاصی اتصال اپ اندروید (Sync Token) */}
      <div className="glass-card p-5 sm:p-6 space-y-4 border-sky-500/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100">
                کلید امنیتی اتصال اندروید (Sync Token)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                این توکن را در اپلیکیشن اختصاصی اندروید وارد کنید تا پیامک‌ها خودکار ثبت شوند.
              </p>
            </div>
          </div>
          <span className="badge badge-credit text-xs shrink-0">فعال</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={token}
            className="input-field font-mono text-xs sm:text-sm bg-slate-950/80 text-sky-300"
          />
          <button
            onClick={handleCopy}
            className="btn btn-secondary text-xs sm:text-sm py-2 px-3.5 shrink-0"
            title="کپی کلید در حافظه"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'کپی شد' : 'کپی'}</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-500">
            برای امنیت بالاتر، می‌توانید هر زمان توکن جدید تولید کنید.
          </span>
          <button
            onClick={handleGenerateNewToken}
            className="text-xs text-sky-400 hover:text-sky-300 underline underline-offset-4"
          >
            تولید توکن جدید
          </button>
        </div>
      </div>

      {/* بخش اسکن و درون‌ریزی پیامک‌های قبلی گوشی (Inbox Scanner) */}
      <div className="glass-card p-5 sm:p-6 space-y-4 border-emerald-500/30 bg-gradient-to-br from-slate-900/90 to-emerald-950/20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <span>اسکن و درون‌ریزی پیامک‌های پیشین بانکی</span>
                {isAndroid ? (
                  <span className="badge badge-credit text-[10px] py-0.5">اپ اندروید فعال</span>
                ) : (
                  <span className="badge badge-other text-[10px] py-0.5">حالت وب</span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {isAndroid
                  ? 'خواندن خودکار ۱۰۰ پیامک اخیر صندوق پیامک‌های گوشی شما، جداسازی تراکنش‌های بانکی و ثبت یکجای آن‌ها.'
                  : 'این قابلیت در اپلیکیشن اندروید فعال است و پیامک‌های قبلی صندوق ورودی گوشی شما را با یک کلیک وارد می‌کند.'}
              </p>
            </div>
          </div>
        </div>

        {isAndroid ? (
          <div className="pt-1 space-y-3">
            <button
              onClick={handleScanInbox}
              disabled={isScanning}
              className="btn btn-primary w-full py-2.5 px-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/20"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>در حال بررسی صندوق ورودی و پردازش پیامک‌های بانکی...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>شروع اسکن و درون‌ریزی پیامک‌های بانکی گوشی</span>
                </>
              )}
            </button>

            {scanResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                  scanResult.success
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}
              >
                {scanResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{scanResult.message}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between gap-3">
            <span>برای استفاده از اسکن مستقیم پیامک‌های گوشی، از اپلیکیشن اندروید جیب‌بان استفاده فرمایید.</span>
          </div>
        )}
      </div>

      {/* راهنمای اتصال اپلیکیشن اندروید (فاز ۵) */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center gap-2.5 text-sm font-bold text-slate-200">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>نحوه عملکرد اتصال خودکار در اپلیکیشن اندروید:</span>
        </div>

        <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside pr-1 leading-relaxed">
          <li>اپلیکیشن بومی کاتلین جیب‌بان به عنوان دریافت‌کننده پیامک نصب می‌شود.</li>
          <li>به محض دریافت پیامک از بیش از ۲۶ بانک ایران، برودکست امن اندروید فعال می‌شود.</li>
          <li>پیامک بدون ذخیره شدن در سرور ثالث، مستقیماً با رمزنگاری TLS به کلادفلر شما ارسال می‌شود.</li>
          <li>موتور <code>sms-parser-ir</code> در کمتر از ۲۰ میلی‌ثانیه مبلغ و بانک را استخراج و تراز را آپدیت می‌کند.</li>
        </ol>
      </div>

      {/* تنظیمات سرور */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center gap-2.5 text-sm font-bold text-slate-200">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>آدرس اندپوینت وب‌سرویس ابری (Cloudflare Worker)</span>
        </div>

        <input
          type="text"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          placeholder="https://jibban-api.ajbv.ir"
          className="input-field text-xs sm:text-sm font-mono"
        />
        <div className="text-[11px] text-slate-500">
          در حالت لوکال آدرس <code>http://localhost:8787</code> و در حالت ابری <code>https://jibban-api.ajbv.ir</code> استفاده می‌شود.
        </div>
      </div>

      {/* بازنشانی داده‌های تست */}
      <div className="glass-card p-5 flex items-center justify-between gap-4 border-slate-800">
        <div>
          <div className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-slate-400" />
            <span>مدیریت حافظه موقت مرورگر</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            پاک کردن داده‌های لوکال و بازنشانی به تراکنش‌های پیش‌فرض
          </div>
        </div>

        <button
          onClick={handleResetData}
          className="btn btn-secondary text-xs py-2 px-3 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{resetDone ? 'انجام شد' : 'بازنشانی دیتا'}</span>
        </button>
      </div>
    </div>
  );
};
