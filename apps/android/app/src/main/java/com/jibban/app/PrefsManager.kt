package com.jibban.app

import android.content.Context
import android.content.SharedPreferences

/**
 * مدیریت ذخیره‌سازی محلی تنظیمات و کلید اختصاصی اتصال اپلیکیشن
 */
class PrefsManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var syncToken: String
        get() = prefs.getString(KEY_SYNC_TOKEN, DEFAULT_SYNC_TOKEN) ?: DEFAULT_SYNC_TOKEN
        set(value) = prefs.edit().putString(KEY_SYNC_TOKEN, value.trim()).apply()

    var serverUrl: String
        get() = prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
        set(value) = prefs.edit().putString(KEY_SERVER_URL, value.trim()).apply()

    var webAppUrl: String
        get() = prefs.getString(KEY_WEB_APP_URL, DEFAULT_WEB_APP_URL) ?: DEFAULT_WEB_APP_URL
        set(value) = prefs.edit().putString(KEY_WEB_APP_URL, value.trim()).apply()

    var isSmsListenerEnabled: Boolean
        get() = prefs.getBoolean(KEY_SMS_LISTENER_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_SMS_LISTENER_ENABLED, value).apply()

    companion object {
        private const val PREFS_NAME = "jibban_prefs"
        private const val KEY_SYNC_TOKEN = "sync_token"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_WEB_APP_URL = "web_app_url"
        private const val KEY_SMS_LISTENER_ENABLED = "sms_listener_enabled"

        // توکن اولیه پیش‌فرض برای همگام‌سازی آسان
        const val DEFAULT_SYNC_TOKEN = "jibban_sync_demo_token_12345"

        // آدرس‌های سرور ابری کلادفلر و وب‌اپلیکیشن
        const val DEFAULT_SERVER_URL = "https://jibban-worker.mahdi-chamani20.workers.dev"
        const val DEFAULT_WEB_APP_URL = "https://jibban-web.pages.dev"
    }
}
