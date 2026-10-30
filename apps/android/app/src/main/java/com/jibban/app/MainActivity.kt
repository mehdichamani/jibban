package com.jibban.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.*
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import org.json.JSONArray
import org.json.JSONObject

/**
 * اکتیویتی اصلی جیب‌بان و میزبان Full WebView برای اجرای رابط کاربری React PWA
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var prefsManager: PrefsManager

    // درخواست دسترسی‌های پیامک و نوتیفیکیشن
    private val requestPermissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val smsGranted = permissions[Manifest.permission.RECEIVE_SMS] == true
        if (smsGranted) {
            Toast.makeText(this, "دسترسی شنود پیامک بانکی با موفقیت تایید شد.", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(
                this,
                "بدون دسترسی پیامک، استخراج خودکار تراکنش‌ها غیرفعال خواهد بود.",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // تنظیم پدینگ هوشمند برای جلوگیری از تداخل هدر با نوار وضعیت گوشی (Status Bar / Notch)
        val root = findViewById<View>(R.id.rootContainer)
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val statusBarInsets = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.setPadding(0, statusBarInsets.top, 0, 0)
            insets
        }

        prefsManager = PrefsManager(this)
        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)

        setupWebView()
        setupBackPressHandler()
        checkAndRequestPermissions()

        // بارگذاری آدرس وب‌اپلیکیشن
        webView.loadUrl(prefsManager.webAppUrl)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(false)

        // پل ارتباطی جاوااسکریپت بین وب‌اپلیکیشن و اندروید
        webView.addJavascriptInterface(WebAppInterface(this, prefsManager), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    progressBar.visibility = View.GONE
                    // صفحه آفلاین یا خطای اتصال به سرور
                    val errorHtml = """
                        <!DOCTYPE html>
                        <html dir="rtl" lang="fa">
                        <head><meta charset="utf-8"><style>
                        body { background: #090d16; color: #f8fafc; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 90vh; text-align: center; margin: 0; padding: 1.5rem; }
                        h2 { color: #f43f5e; margin-bottom: 0.5rem; }
                        p { color: #94a3b8; font-size: 0.9rem; line-height: 1.6; }
                        button { margin-top: 1.5rem; background: #0ea5e9; color: white; border: none; padding: 0.75rem 1.75rem; border-radius: 0.75rem; font-weight: bold; cursor: pointer; }
                        </style></head>
                        <body>
                            <h2>عدم برقراری ارتباط با وب‌سرور</h2>
                            <p>ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود یا آدرس سرور را بررسی فرمایید.</p>
                            <button onclick="location.reload()">تلاش مجدد</button>
                        </body>
                        </html>
                    """.trimIndent()
                    webView.loadDataWithBaseURL(null, errorHtml, "text/html", "UTF-8", null)
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress >= 90) {
                    progressBar.visibility = View.GONE
                }
            }
        }
    }

    private fun setupBackPressHandler() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun checkAndRequestPermissions() {
        val permissionsToRequest = mutableListOf<String>()

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.RECEIVE_SMS)
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.READ_SMS)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        if (permissionsToRequest.isNotEmpty()) {
            requestPermissionsLauncher.launch(permissionsToRequest.toTypedArray())
        }
    }

    /**
     * کلاس اینترفیس پل جاوااسکریپت
     */
    class WebAppInterface(private val activity: MainActivity, private val prefs: PrefsManager) {

        @JavascriptInterface
        fun getSyncToken(): String {
            return prefs.syncToken
        }

        @JavascriptInterface
        fun setSyncToken(token: String) {
            prefs.syncToken = token
        }

        @JavascriptInterface
        fun isAndroidApp(): Boolean {
            return true
        }

        @JavascriptInterface
        fun getAppVersion(): String {
            return "0.1.0"
        }

        @JavascriptInterface
        fun isSmsPermissionGranted(): Boolean {
            return ContextCompat.checkSelfPermission(
                activity,
                Manifest.permission.READ_SMS
            ) == PackageManager.PERMISSION_GRANTED
        }

        @JavascriptInterface
        fun requestSmsPermissions() {
            activity.runOnUiThread {
                activity.checkAndRequestPermissions()
            }
        }

        /**
         * اسکن پیامک‌های قبلی صندوق ورودی گوشی و فیلتر پیامک‌های بانکی
         */
        @JavascriptInterface
        fun scanInboxSms(limit: Int): String {
            val maxLimit = if (limit in 1..300) limit else 50
            val result = JSONObject()

            if (ContextCompat.checkSelfPermission(
                    activity,
                    Manifest.permission.READ_SMS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                result.put("success", false)
                result.put("error", "permission_denied")
                result.put("message", "دسترسی خواندن پیامک‌ها تایید نشده است.")
                return result.toString()
            }

            try {
                val uri = Uri.parse("content://sms/inbox")
                val projection = arrayOf("address", "body", "date")
                val cursor = activity.contentResolver.query(
                    uri,
                    projection,
                    null,
                    null,
                    "date DESC"
                )

                val bankList = JSONArray()
                var scannedCount = 0

                cursor?.use {
                    val bodyIndex = it.getColumnIndex("body")
                    val addressIndex = it.getColumnIndex("address")
                    val dateIndex = it.getColumnIndex("date")

                    while (it.moveToNext() && scannedCount < maxLimit) {
                        scannedCount++
                        val body = if (bodyIndex != -1) it.getString(bodyIndex) ?: "" else ""
                        val address = if (addressIndex != -1) it.getString(addressIndex) ?: "" else ""
                        val date = if (dateIndex != -1) it.getLong(dateIndex) else System.currentTimeMillis()

                        if (SmsListenerReceiver.isBankMessage(body)) {
                            val item = JSONObject().apply {
                                put("body", body)
                                put("sender", address)
                                put("timestamp", date)
                            }
                            bankList.put(item)
                        }
                    }
                }

                result.put("success", true)
                result.put("scannedCount", scannedCount)
                result.put("bankFoundCount", bankList.length())
                result.put("messages", bankList)
            } catch (e: Exception) {
                Log.e("MainActivity", "خطا در اسکن پیامک‌های صندوق ورودی", e)
                result.put("success", false)
                result.put("error", e.message ?: "خطای ناشناخته")
            }

            return result.toString()
        }

        @JavascriptInterface
        fun reloadApp() {
            activity.runOnUiThread {
                activity.webView.reload()
            }
        }
    }
}
