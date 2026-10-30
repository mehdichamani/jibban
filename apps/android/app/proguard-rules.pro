# قوانین Proguard برای برنامه جیب‌بان
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-dontwarn okhttp3.**
-dontwarn okio.**
