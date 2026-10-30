package com.jibban.app

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * کلاینت شبکه برای ارسال مستقیم و امن پیامک‌های بانکی به ورکر کلادفلر
 */
object NetworkClient {

    private const val TAG = "JibBan_Network"
    private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    /**
     * ارسال پیامک خام به اندپوینت /api/sms/ingest در پس‌زمینه
     */
    suspend fun ingestSms(
        context: Context,
        rawSms: String,
        senderNumber: String? = null
    ): Result<JSONObject> = withContext(Dispatchers.IO) {
        val prefs = PrefsManager(context)
        val serverUrl = prefs.serverUrl.removeSuffix("/")
        val syncToken = prefs.syncToken
        val endpoint = "$serverUrl/api/sms/ingest"

        try {
            val jsonPayload = JSONObject().apply {
                put("rawSms", rawSms)
                put("syncToken", syncToken)
                if (!senderNumber.isNullOrEmpty()) {
                    put("sender", senderNumber)
                }
            }

            val requestBody = jsonPayload.toString().toRequestBody(JSON_MEDIA_TYPE)

            val request = Request.Builder()
                .url(endpoint)
                .post(requestBody)
                .addHeader("Content-Type", "application/json")
                .addHeader("X-Sync-Token", syncToken)
                .build()

            Log.d(TAG, "در حال ارسال پیامک به: $endpoint")

            client.newCall(request).execute().use { response ->
                val responseBody = response.body?.string() ?: ""
                Log.d(TAG, "کد پاسخ سرور: ${response.code}, نتیجه: $responseBody")

                if (response.isSuccessful) {
                    val resultJson = JSONObject(responseBody)
                    Result.success(resultJson)
                } else {
                    Result.failure(Exception("خطای سرور: ${response.code} - $responseBody"))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "خطای ارسال پیامک به سرور کلادفلر", e)
            Result.failure(e)
        }
    }
}
