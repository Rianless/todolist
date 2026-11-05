package com.todoapp.widget.quick

import android.content.Context

/** 간편입력 설정 저장소 (이 앱 안에서만 읽을 수 있는 SharedPreferences) */
class QuickPrefs(context: Context) {
    private val sp = context.applicationContext.getSharedPreferences("quick_ledger", Context.MODE_PRIVATE)

    var enabled: Boolean
        get() = sp.getBoolean("enabled", true)
        set(v) = sp.edit().putBoolean("enabled", v).apply()

    /** true 면 결제 알림이 오면 묻지 않고 알림 글 그대로 바로 저장한다. 기본은 꺼짐(입력칸 알림). */
    var autoSave: Boolean
        get() = sp.getBoolean("autoSave", false)
        set(v) = sp.edit().putBoolean("autoSave", v).apply()

    var baseUrl: String
        get() = sp.getString("baseUrl", DEFAULT_URL) ?: DEFAULT_URL
        set(v) = sp.edit().putString("baseUrl", v.trim()).apply()

    var token: String
        get() = sp.getString("token", "") ?: ""
        set(v) = sp.edit().putString("token", v.filterNot { it.isWhitespace() }).apply()   // 비밀번호에는 공백이 없으니 붙여넣을 때 섞인 공백·줄바꿈은 모두 지운다

    /** 알림을 감시할 앱 패키지 이름들 (쉼표로 구분). 기본은 토스. */
    var packages: String
        get() {
            migratePackages()
            return sp.getString("packages", DEFAULT_PACKAGES) ?: DEFAULT_PACKAGES
        }
        set(v) = sp.edit().putString("packages", v.trim()).apply()

    /** 버전 2: 이미 감시 목록을 저장해 둔 경우에도 삼성 월렛을 한 번만 더해 준다. (이후에 직접 지우면 다시 넣지 않는다) */
    private fun migratePackages() {
        if (sp.getInt("packagesVersion", 1) >= 2) return
        val saved = sp.getString("packages", null)
        val edit = sp.edit().putInt("packagesVersion", 2)
        if (saved != null && SAMSUNG_WALLET !in QuickLedgerLogic.parsePackages(saved)) {
            edit.putString("packages", if (saved.isBlank()) SAMSUNG_WALLET else "${saved.trim().trimEnd(',')},$SAMSUNG_WALLET")
        }
        edit.apply()
    }

    companion object {
        const val DEFAULT_URL = "https://todolist-liart-mu.vercel.app"
        const val DEFAULT_PACKAGES = "viva.republica.toss,com.samsung.android.spay"
        const val SAMSUNG_WALLET = "com.samsung.android.spay"
    }
}
