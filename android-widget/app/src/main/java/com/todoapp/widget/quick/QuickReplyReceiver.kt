package com.todoapp.widget.quick

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.RemoteInput
import kotlin.concurrent.thread

/** 알림 입력칸에 적은 글을 받아 서버(/api/ledger)로 보낸다. */
class QuickReplyReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != QuickNotifier.ACTION_REPLY) return
        val reply = RemoteInput.getResultsFromIntent(intent)
            ?.getCharSequence(QuickNotifier.KEY_REPLY)?.toString().orEmpty().trim()
        val original = intent.getStringExtra(QuickNotifier.EXTRA_ORIGINAL).orEmpty()
        val notifId = intent.getIntExtra(QuickNotifier.EXTRA_NOTIF_ID, 0)
        val app = context.applicationContext
        if (reply.isEmpty()) {
            QuickNotifier.showPrompt(app, notifId, original, "글을 적어 주세요. 예) 올리브영 만원")
            return
        }
        val pending = goAsync()
        thread(name = "quick-ledger-send") {
            try {
                val prefs = QuickPrefs(app)
                val text = QuickLedgerLogic.buildQuickText(reply, original)
                when (val r = QuickLedgerClient.send(prefs.baseUrl, prefs.token, text)) {
                    is QuickResult.Added -> QuickNotifier.showResult(
                        app, notifId,
                        "✓ ${if (r.type == "income") "수입" else "지출"} ${r.title} ${"%,d".format(r.amount)}원을 적었어요"
                    )
                    QuickResult.Duplicate -> QuickNotifier.showResult(app, notifId, "이미 적힌 내역이에요")
                    QuickResult.NoAmount -> QuickNotifier.showPrompt(app, notifId, original, "금액을 못 찾았어요. 예) 올리브영 만원")
                    QuickResult.BadToken -> QuickNotifier.showResult(app, notifId, "비밀번호(토큰)가 달라요. 앱 설정을 확인해 주세요", 8000L)
                    is QuickResult.Failed -> QuickNotifier.showPrompt(app, notifId, original, "전송 실패: ${r.message}. 다시 적어 주세요")
                }
            } finally {
                pending.finish()
            }
        }
    }
}
