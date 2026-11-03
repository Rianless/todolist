package com.todoapp.widget.quick

/** 서버로 보낸 결과를 알림으로 알려 준다. (입력칸 답장·그대로 저장·자동 저장이 함께 쓴다) 반드시 백그라운드 스레드에서 부른다. */
object QuickSaver {
    /** 사용자가 알림 입력칸에 적은 글을 저장한다. 이름만 적었으면 알림에 있던 금액을 붙인다. */
    fun saveReply(app: android.content.Context, notifId: Int, original: String, reply: String) {
        val prefs = QuickPrefs(app)
        val text = QuickLedgerLogic.buildQuickText(reply, original)
        report(app, notifId, original, QuickLedgerClient.send(prefs.baseUrl, prefs.token, text), fromNotificationText = false)
    }

    /** 알림 글 그대로(가게 이름·금액을 서버가 읽어서) 저장한다. */
    fun saveAsIs(app: android.content.Context, notifId: Int, original: String) {
        val prefs = QuickPrefs(app)
        report(app, notifId, original, QuickLedgerClient.sendNotificationText(prefs.baseUrl, prefs.token, original), fromNotificationText = true)
    }

    private fun report(app: android.content.Context, notifId: Int, original: String, r: QuickResult, fromNotificationText: Boolean) {
        val prefs = QuickPrefs(app)
        when (r) {
            is QuickResult.Added -> QuickNotifier.showResult(app, notifId, QuickLedgerLogic.savedMessage(r.type, r.title, r.amount))
            QuickResult.Duplicate -> QuickNotifier.showResult(app, notifId, "이미 적힌 내역이에요")
            QuickResult.NoAmount -> QuickNotifier.showPrompt(
                app, notifId, original,
                if (fromNotificationText) "알림에서 가게와 금액을 읽지 못했어요. 직접 적어 주세요 (예: 올리브영 만원)"
                else "금액을 못 찾았어요. 예) 올리브영 만원"
            )
            QuickResult.NoToken -> QuickNotifier.showResult(app, notifId, "앱에 비밀번호가 저장돼 있지 않아요. 설정에서 입력 후 '저장'을 눌러 주세요", 8000L)
            QuickResult.BadToken -> QuickNotifier.showResult(app, notifId, "서버가 비밀번호를 거절했어요 (앱에 저장된 ${prefs.token.length}자). Vercel 값과 같은지 확인해 주세요", 8000L)
            is QuickResult.Failed -> QuickNotifier.showPrompt(app, notifId, original, "전송 실패: ${r.message}. 다시 시도해 주세요")
        }
    }
}
