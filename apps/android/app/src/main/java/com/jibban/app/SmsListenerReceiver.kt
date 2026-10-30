package com.jibban.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * برودکست رسیور شنود آنی و بلادرنگ پیامک‌های بانکی در اندروید
 */
class SmsListenerReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            return
        }

        val prefs = PrefsManager(context)
        if (!prefs.isSmsListenerEnabled) {
            Log.d(TAG, "شنود پیامک در تنظیمات کاربر غیرفعال است.")
            return
        }

        try {
            // ۱. استخراج پیام‌های پیامک دریافتی
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            if (messages.isNullOrEmpty()) return

            val sender = messages[0].displayOriginatingAddress ?: ""
            val fullMessageBuilder = StringBuilder()

            for (sms in messages) {
                fullMessageBuilder.append(sms.displayMessageBody)
            }
            val fullText = fullMessageBuilder.toString()

            Log.d(TAG, "پیامک جدید دریافت شد از فرستنده: $sender")

            // ۲. فیلتر سریع و سبک پیامک‌های بانکی برای جلوگیری از مصرف بیهوده باتری
            if (!isBankMessage(fullText)) {
                Log.d(TAG, "پیامک دریافتی غیربانکی تشخیص داده شد و نادیده گرفته می‌شود.")
                return
            }

            Log.d(TAG, "پیامک بانکی تایید شد؛ ارسال امن به فضای ابری جیب‌بان...")

            // ۳. ارسال پس‌زمینه به وب‌سرویس Cloudflare Worker
            CoroutineScope(Dispatchers.IO).launch {
                val result = NetworkClient.ingestSms(context, fullText, sender)
                result.onSuccess { responseJson ->
                    val isBank = responseJson.optBoolean("isBankSms", false)
                    if (isBank) {
                        val tx = responseJson.optJSONObject("transaction")
                        val bankName = tx?.optString("bankName") ?: "بانک"
                        val amount = tx?.optLong("amount", 0) ?: 0
                        val type = tx?.optString("type") ?: "debit"
                        val typeText = if (type == "credit") "واریز" else "برداشت"

                        // نمایش نوتیفیکیشن موفقیت‌آمیز به کاربر
                        showNotification(
                            context,
                            "جیب‌بان: $typeText $bankName",
                            "مبلغ ${formatNumber(amount)} تومان با موفقیت ثبت و همگام شد."
                        )
                    }
                }.onFailure { err ->
                    Log.e(TAG, "خطا در همگام‌سازی پیامک با سرور", err)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "خطا در پردازش برودکست پیامک", e)
        }
    }

    /**
     * بررسی سریع کلیدواژه‌های پیامک‌های بانکی
     */
    private fun isBankMessage(text: String): Boolean {
        if (text.length < 15) return false

        // کدهای تایید و رمز پویا رد می‌شوند
        if (text.contains("کد تایید") || text.contains("رمز پویا") || text.contains("کد ورود")) {
            return false
        }

        val hasAction = text.contains("برداشت") || text.contains("واریز") ||
                text.contains("خرید") || text.contains("انتقال") || text.contains("پرداخت")

        val hasAccount = text.contains("حساب") || text.contains("کارت") ||
                text.contains("مانده") || text.contains("موجودی")

        val hasCurrency = text.contains("ریال") || text.contains("تومان") ||
                text.contains("IRR") || text.contains("بلو")

        return (hasAction && (hasAccount || hasCurrency))
    }

    private fun showNotification(context: Context, title: String, content: String) {
        val notificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val channelId = "jibban_transactions"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "تراکنش‌های بانکی جیب‌بان",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "اعلام دریافت و ثبت خودکار پیامک‌های بانکی"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(content)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }

    private fun formatNumber(number: Long): String {
        return "%,d".format(number)
    }

    companion object {
        private const val TAG = "JibBan_SmsReceiver"
    }
}
