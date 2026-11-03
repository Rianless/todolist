package com.todoapp.widget.quick

import android.content.Context

/** 간편입력 설정 저장소 (이 앱 안에서만 읽을 수 있는 SharedPreferences) */
class QuickPrefs(context: Context) {
    private val sp = context.applicationContext.getSharedPreferences("quick_ledger", Context.MODE_PRIVATE)

    var enabled: Boolean
        get() = sp.getBoolean("enabled", true)
        set(v) = sp.edit().putBoolean("enabled", v).apply()

    var baseUrl: String
        get() = sp.getString("baseUrl", DEFAULT_URL) ?: DEFAULT_URL
        set(v) = sp.edit().putString("baseUrl", v.trim()).apply()

    var token: String
        get() = sp.getString("token", "") ?: ""
        set(v) = sp.edit().putString("token", v.filterNot { it.isWhitespace() }).apply()   // 비밀번호에는 공백이 없으니 붙여넣을 때 섞인 공백·줄바꿈은 모두 지운다

    /** 알림을 감시할 앱 패키지 이름들 (쉼표로 구분). 기본은 토스. */
    var packages: String
        get() = sp.getString("packages", DEFAULT_PACKAGES) ?: DEFAULT_PACKAGES
        set(v) = sp.edit().putString("packages", v.trim()).apply()

    companion object {
        const val DEFAULT_URL = "https://todolist-liart-mu.vercel.app"
        const val DEFAULT_PACKAGES = "viva.republica.toss"
    }
}
