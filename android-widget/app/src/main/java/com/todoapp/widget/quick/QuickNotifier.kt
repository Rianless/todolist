package com.todoapp.widget.quick

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.RemoteInput
import androidx.core.content.ContextCompat

/** "어디에 썼어요?" 입력칸 알림과 결과 알림을 띄운다. */
object QuickNotifier {
    const val CHANNEL_ID = "quick_ledger_prompt"
    const val KEY_REPLY = "quick_reply"
    const val ACTION_REPLY = "com.todoapp.widget.ACTION_QUICK_REPLY"
    const val ACTION_SAVE = "com.todoapp.widget.ACTION_QUICK_SAVE"
    const val EXTRA_ORIGINAL = "original"
    const val EXTRA_NOTIF_ID = "notifId"

    private fun ensureChannel(ctx: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = ctx.getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return
        // IMPORTANCE_HIGH 여야 화면 위에서 내려오는(헤드업) 알림으로 뜬다.
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "가계부 간편입력", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "결제 알림이 오면 어디에 썼는지 바로 적는 입력칸"
            }
        )
    }

    private fun canNotify(ctx: Context): Boolean {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return false
        return NotificationManagerCompat.from(ctx).areNotificationsEnabled()
    }

    /** 입력칸이 달린 알림. error 가 있으면 한 줄 안내를 같이 보여 준다. */
    fun showPrompt(ctx: Context, notifId: Int, original: String, error: String? = null) {
        if (!canNotify(ctx)) return
        ensureChannel(ctx)
        val remoteInput = RemoteInput.Builder(KEY_REPLY).setLabel("올리브영 만원").build()
        val intent = Intent(ctx, QuickReplyReceiver::class.java).apply {
            action = ACTION_REPLY
            putExtra(EXTRA_ORIGINAL, original)
            putExtra(EXTRA_NOTIF_ID, notifId)
        }
        // RemoteInput 은 시스템이 답장 글을 채워 넣어야 해서 MUTABLE 이어야 한다.
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or
            (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
        val pi = PendingIntent.getBroadcast(ctx, notifId, intent, flags)
        val action = NotificationCompat.Action.Builder(android.R.drawable.ic_menu_edit, "어디에 썼어요?", pi)
            .addRemoteInput(remoteInput)
            .setAllowGeneratedReplies(false)
            .build()
        // 알림 글 그대로 저장하는 버튼 (입력칸이 없어서 변경 불가 PendingIntent 로 만든다)
        val saveIntent = Intent(ctx, QuickReplyReceiver::class.java).apply {
            this.action = ACTION_SAVE
            putExtra(EXTRA_ORIGINAL, original)
            putExtra(EXTRA_NOTIF_ID, notifId)
        }
        val savePi = PendingIntent.getBroadcast(
            ctx, notifId + 1, saveIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val text = error ?: "${original.take(60)}\n어디에 썼는지 적어 주세요. (예: 올리브영 만원)"
        val n = NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_chat)
            .setContentTitle("💰 어디에 썼어요?")
            .setContentText(text.lineSequence().first())
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true)
            .setOnlyAlertOnce(false)
            .setTimeoutAfter(30 * 60 * 1000L)
            .addAction(action)
            .addAction(android.R.drawable.ic_menu_save, "그대로 저장", savePi)
            .build()
        NotificationManagerCompat.from(ctx).notify(notifId, n)
    }

    /** 결과 한 줄을 보여 주고 잠시 뒤 스스로 사라진다. (답장 알림의 로딩 표시를 끄는 역할도 한다) */
    fun showResult(ctx: Context, notifId: Int, message: String, timeoutMs: Long = 4000L) {
        if (!canNotify(ctx)) return
        ensureChannel(ctx)
        val n = NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_chat)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOnlyAlertOnce(true)
            .setTimeoutAfter(timeoutMs)
            .setAutoCancel(true)
            .build()
        NotificationManagerCompat.from(ctx).notify(notifId, n)
    }
}
