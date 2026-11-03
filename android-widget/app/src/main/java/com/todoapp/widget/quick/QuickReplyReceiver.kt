package com.todoapp.widget.quick

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.RemoteInput
import kotlin.concurrent.thread

/** 알림의 두 버튼을 받는다: 입력칸에 적은 글 보내기(ACTION_REPLY) / 알림 글 그대로 저장(ACTION_SAVE) */
class QuickReplyReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val original = intent.getStringExtra(QuickNotifier.EXTRA_ORIGINAL).orEmpty()
        val notifId = intent.getIntExtra(QuickNotifier.EXTRA_NOTIF_ID, 0)
        val app = context.applicationContext

        when (intent.action) {
            QuickNotifier.ACTION_REPLY -> {
                val reply = RemoteInput.getResultsFromIntent(intent)
                    ?.getCharSequence(QuickNotifier.KEY_REPLY)?.toString().orEmpty().trim()
                if (reply.isEmpty()) {
                    QuickNotifier.showPrompt(app, notifId, original, "글을 적어 주세요. 예) 올리브영 만원")
                    return
                }
                runInBackground { QuickSaver.saveReply(app, notifId, original, reply) }
            }
            QuickNotifier.ACTION_SAVE -> {
                // 저장 중임을 바로 보여 준다 (서버 응답이 올 때까지 입력칸 알림이 남아 있지 않게)
                QuickNotifier.showResult(app, notifId, "저장하는 중…", 15000L)
                runInBackground { QuickSaver.saveAsIs(app, notifId, original) }
            }
        }
    }

    private fun runInBackground(work: () -> Unit) {
        val pending = goAsync()
        thread(name = "quick-ledger-send") {
            try { work() } finally { pending.finish() }
        }
    }
}
