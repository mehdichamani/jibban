# اپلیکیشن اختصاصی اندروید جیب‌بان (JibBan Android App)

اپلیکیشن سبک و بومی کاتلین (Kotlin) که به عنوان شنونده بلادرنگ پیامک‌های بانکی کشور و بارگذاری‌کننده رابط کاربری PWA عمل می‌کند.

## قابلیت‌های کلیدی

1. **شنود لحظه‌ای پیامک‌های بانکی (SMS BroadcastReceiver):**
   - به محض دریافت پیامک از بانک، سرویس امن `SmsListenerReceiver` فعال می‌شود.
   - فیلتر سبک و هوشمند پیامک‌های بانکی (ملی، ملت، سپه، سامان، بلو، کشاورزی، تجارت و...).
   - پیامک‌های غیرمالی و کدهای تایید جهت حفظ حریم خصوصی فیلتر و رد می‌شوند.

2. **ارسال امن پس‌زمینه (Background Network Ingestion):**
   - ارسال مستقیم متن پیامک با رمزنگاری TLS به وب‌سرویس ابری Cloudflare Worker اختصاصی شما (`POST /api/sms/ingest`).
   - احراز هویت با هدر امنیتی `X-Sync-Token`.
   - بدون نیاز به سرور واسط یا دسترسی شخص ثالث.

3. **میزبانی کامل وب‌اپلیکیشن (Full WebView PWA):**
   - بارگذاری فوق‌سریع وب‌اپلیکیشن با پشتیبانی کامل از کش محلی و حالت آفلاین.
   - پل ارتباطی جاوااسکریپت (`AndroidBridge`) جهت تبادل روان تنظیمات و توکن همگام‌سازی بین وب و کاتلین.

## ساختار فایل‌ها

```
apps/android/
├── app/
│   ├── build.gradle.kts
│   ├── proguard-rules.pro
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/jibban/app/
│       │   ├── MainActivity.kt        // میزبان Full WebView و مدیریت دسترسی‌ها
│       │   ├── SmsListenerReceiver.kt // برودکست رسیور شنود پیامک‌های بانکی
│       │   ├── NetworkClient.kt       // ارسال پس‌زمینه به کلادفلر
│       │   └── PrefsManager.kt        // مدیریت تنظیمات و کلید Sync Token
│       └── res/
│           ├── layout/activity_main.xml
│           └── values/
│               ├── colors.xml
│               ├── strings.xml
│               └── themes.xml
├── gradle/libs.versions.toml
├── build.gradle.kts
└── settings.gradle.kts
```

## نحوه بیلد و ایجاد فایل APK

```bash
cd apps/android
# بیلد نسخه دیباگ جهت تست روی گوشی
./gradlew assembleDebug

# بیلد نسخه نهایی ریلیز
./gradlew assembleRelease
```
فایل APK تولیدشده در مسیر زیر قرار می‌گیرد:
`apps/android/app/build/outputs/apk/debug/app-debug.apk`

## تست روی گوشی یا شبیه‌ساز

1. فایل APK را روی گوشی یا ایمولاتور نصب کنید.
2. در اولین اجرای برنامه، مجوز دریافت پیامک را تأیید نمایید.
3. یک پیامک بانکی آزمایشی ارسال کنید (یا در شبیه‌ساز با ابزار SMS ایمولاتور پیامک بفرستید).
4. تراکنش در عرض چند میلی‌ثانیه پردازش شده و نوتیفیکیشن موفقیت روی گوشی نمایش داده می‌شود.
