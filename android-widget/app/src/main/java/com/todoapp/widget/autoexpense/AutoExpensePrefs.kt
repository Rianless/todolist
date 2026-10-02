package com.todoapp.widget.autoexpense

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** 서버 받은편지함으로 보낼 결제 한 건 */
data class PendingPayment(
    val uid: String,
    val date: String,
    val time: String,
    val amount: Long,
    val merchant: String,
    val source: String
) {
    fun toJson(): JSONObject = JSONObject()
        .put("uid", uid)
        .put("date", date)
        .put("time", time)
        .put("amount", amount)
        .put("merchant", merchant)
        .put("source", source)

    companion object {
        fun fromJson(o: JSONObject) = PendingPayment(
            uid = o.optString("uid"),
            date = o.optString("date"),
            time = o.optString("time"),
            amount = o.optLong("amount"),
            merchant = o.optString("merchant"),
            source = o.optString("source")
        )
    }
}

/** 자동 가계부 설정과 보내지 못한 결제 대기열 (SharedPreferences) */
class AutoExpensePrefs(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("auto_expense", Context.MODE_PRIVATE)

    companion object {
        /** 기본으로 감지하는 간편결제 앱 (패키지 이름 → 화면에 보이는 이름) */
        val DEFAULT_APPS: Map<String, String> = linkedMapOf(
            "com.samsung.android.spay" to "삼성페이",
            "com.kakaopay.app" to "카카오페이",
            "viva.republica.toss" to "토스",
            "com.naverfin.payapp" to "네이버페이",
            "com.google.android.apps.walletnfcrel" to "구글 월렛"
        )

        /** 메신저/문자 앱은 결제처럼 보이는 문구가 와도 "다른 앱 후보"로 올리지 않는다. */
        val NEVER_OBSERVE: Set<String> = setOf(
            "com.kakao.talk", "com.samsung.android.messaging", "com.google.android.apps.messaging",
            "com.android.mms", "org.telegram.messenger", "com.whatsapp", "jp.naver.line.android"
        )
    }

    var enabled: Boolean
        get() = prefs.getBoolean("enabled", false)
        set(value) { prefs.edit().putBoolean("enabled", value).apply() }

    var inboxKey: String
        get() = prefs.getString("inbox_key", "") ?: ""
        set(value) { prefs.edit().putString("inbox_key", value.trim()).apply() }

    var allowedPackages: Set<String>
        get() = prefs.getStringSet("allowed", null)?.toSet() ?: DEFAULT_APPS.keys
        set(value) { prefs.edit().putStringSet("allowed", value.toSet()).apply() }

    /** 서버로 보낼 때 쓰는 앱 이름 (20자 이내) */
    fun sourceLabel(packageName: String): String {
        DEFAULT_APPS[packageName]?.let { return it }
        return runCatching {
            val pm = appContext.packageManager
            pm.getApplicationInfo(packageName, 0).loadLabel(pm).toString()
        }.getOrDefault(packageName.substringAfterLast('.')).take(20)
    }

    // ── 허용 목록에 없지만 결제처럼 보이는 알림을 보낸 앱 (패키지 이름과 횟수만 저장, 알림 내용은 저장하지 않는다)
    fun observed(): Map<String, Int> {
        val json = runCatching { JSONObject(prefs.getString("observed", "{}") ?: "{}") }.getOrDefault(JSONObject())
        return json.keys().asSequence().associateWith { json.optInt(it) }
    }

    fun recordObserved(packageName: String) {
        val json = runCatching { JSONObject(prefs.getString("observed", "{}") ?: "{}") }.getOrDefault(JSONObject())
        json.put(packageName, json.optInt(packageName) + 1)
        // 최대 20개까지만 보관
        if (json.length() > 20) json.remove(json.keys().next())
        prefs.edit().putString("observed", json.toString()).apply()
    }

    fun forgetObserved(packageName: String) {
        val json = runCatching { JSONObject(prefs.getString("observed", "{}") ?: "{}") }.getOrDefault(JSONObject())
        json.remove(packageName)
        prefs.edit().putString("observed", json.toString()).apply()
    }

    // ── 아직 서버로 보내지 못한 결제
    fun pending(): List<PendingPayment> {
        val array = runCatching { JSONArray(prefs.getString("pending", "[]") ?: "[]") }.getOrDefault(JSONArray())
        return (0 until array.length()).mapNotNull { array.optJSONObject(it)?.let(PendingPayment::fromJson) }
    }

    fun setPending(list: List<PendingPayment>) {
        val array = JSONArray()
        list.takeLast(200).forEach { array.put(it.toJson()) }
        prefs.edit().putString("pending", array.toString()).apply()
    }

    var lastStatus: String
        get() = prefs.getString("status", "") ?: ""
        private set(value) { prefs.edit().putString("status", value).apply() }

    fun setStatus(message: String) {
        lastStatus = "${SimpleDateFormat("M/d HH:mm", Locale.KOREA).format(Date())} · $message"
    }
}
