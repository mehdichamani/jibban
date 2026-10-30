package com.jibban.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.*
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

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
        fun getAppVersion(): String {
            return "0.1.0"
        }

        @JavascriptInterface
        fun reloadApp() {
            activity.runOnUiThread {
                activity.webView.reload()
            }
        }
    }
}
