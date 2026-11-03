package com.todoapp.widget.quick

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/** 지정한 앱(기본: 토스)의 결제 알림이 오면 "어디에 썼어요?" 입력칸 알림을 띄운다. */
class QuickNotificationListener : NotificationListenerService() {
    private var lastKey = ""
    private var lastAt = 0L

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName == packageName) return   // 우리가 띄운 알림에는 반응하지 않는다
        val prefs = QuickPrefs(this)
        if (!prefs.enabled || prefs.token.isBlank()) return
        if (sbn.packageName !in QuickLedgerLogic.parsePackages(prefs.packages)) return
        if (sbn.isOngoing) return

        val extras = sbn.notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val body = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
            ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString().orEmpty()
        val text = "$title $body".trim()
        if (!QuickLedgerLogic.isPaymentText(text)) return

        // 같은 알림이 짧은 시간에 다시 오면(갱신·중복) 입력칸을 또 띄우지 않는다
        val now = System.currentTimeMillis()
        if (text == lastKey && now - lastAt < 60_000L) return
        lastKey = text
        lastAt = now

        QuickNotifier.showPrompt(applicationContext, (now % 1_000_000_000L).toInt(), text)
    }
}
