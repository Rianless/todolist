package com.todoapp.widget.autoexpense

import android.app.Notification
import android.content.ComponentName
import android.os.Handler
import android.os.Looper
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.security.MessageDigest
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * 간편결제 앱의 결제 알림을 읽어 금액·가맹점만 뽑아 서버 받은편지함으로 보낸다.
 * 알림 원문은 저장하거나 서버로 보내지 않는다.
 */
class PaymentNotificationListener : NotificationListenerService() {
    private val handler = Handler(Looper.getMainLooper())
    private val retry = Runnable { InboxClient.flush(applicationContext) { scheduleRetry(it) } }

    override fun onListenerConnected() {
        super.onListenerConnected()
        InboxClient.flush(applicationContext) { scheduleRetry(it) }
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        // 시스템이 연결을 끊었을 때 다시 연결을 요청한다.
        runCatching { requestRebind(ComponentName(this, PaymentNotificationListener::class.java)) }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        val context = applicationContext
        val prefs = AutoExpensePrefs(context)
        if (!prefs.enabled) return
        val packageName = sbn.packageName ?: return
        if (packageName == context.packageName) return
        val notification = sbn.notification ?: return
        if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return

        val extras = notification.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
        val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
            ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString()
        val parsed = PaymentParser.parse(title, text) ?: return

        // 허용하지 않은 앱: 어떤 앱인지(패키지 이름과 횟수)만 기록해 설정 화면에서 허용할 수 있게 한다.
        if (packageName !in prefs.allowedPackages) {
            if (packageName !in AutoExpensePrefs.NEVER_OBSERVE) prefs.recordObserved(packageName)
            return
        }

        val posted = Instant.ofEpochMilli(sbn.postTime).atZone(ZoneId.systemDefault())
        val source = prefs.sourceLabel(packageName)
        val payment = PendingPayment(
            uid = fingerprint(packageName, parsed, sbn.postTime / FIVE_MINUTES_MS),
            date = posted.toLocalDate().toString(),
            time = posted.toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm")),
            amount = parsed.amount,
            merchant = parsed.merchant.ifBlank { "$source 결제" },
            source = source
        )
        InboxClient.submit(context, payment) { remaining -> scheduleRetry(remaining) }
    }

    // 못 보낸 결제가 남아 있으면 1분 뒤에 다시 시도한다. (여러 번 예약되지 않게 하나만 둔다)
    private fun scheduleRetry(remaining: Int) {
        handler.removeCallbacks(retry)
        if (remaining > 0) handler.postDelayed(retry, 60_000)
    }

    // 같은 결제를 앱이 알림으로 여러 번 올려도 한 건으로 합쳐지게, 앱+금액+가맹점+5분 단위 시각으로 번호를 만든다.
    private fun fingerprint(packageName: String, parsed: ParsedPayment, bucket: Long): String {
        val raw = "$packageName|${parsed.amount}|${parsed.merchant}|$bucket"
        return MessageDigest.getInstance("SHA-1").digest(raw.toByteArray())
            .joinToString("") { "%02x".format(it) }.take(32)
    }

    companion object {
        private const val FIVE_MINUTES_MS = 5 * 60 * 1000L
    }
}
