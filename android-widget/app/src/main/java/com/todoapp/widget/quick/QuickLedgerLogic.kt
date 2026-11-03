package com.todoapp.widget.quick

/** 결제 알림 문구를 읽고, 사용자가 알림 칸에 적은 글을 서버로 보낼 문장으로 다듬는다. (안드로이드 클래스를 쓰지 않아 단위 테스트 가능) */
object QuickLedgerLogic {
    private val AMOUNT_RE = Regex("""(\d{1,3}(?:,\d{3})+|\d+)\s*원""")
    private val PAYMENT_RE = Regex("결제|승인|출금|사용|이체|송금|보냈")
    private val CANCEL_RE = Regex("취소|환불|환급")
    private val HAS_AMOUNT_IN_REPLY_RE = Regex("""\d|[일이삼사오육칠팔구][십백천만억]|[십백천만억]\s*원""")

    /** 알림 글에서 첫 금액(원)을 뽑는다. 없으면 null. */
    fun extractAmount(text: String): Long? {
        val m = AMOUNT_RE.find(text) ?: return null
        return m.groupValues[1].replace(",", "").toLongOrNull()?.takeIf { it > 0 }
    }

    /** 가계부에 적을 만한 결제 알림인지: 금액이 있고, 결제·출금 같은 말이 있고, 취소·환불이 아니다. */
    fun isPaymentText(text: String): Boolean {
        if (text.isBlank()) return false
        if (CANCEL_RE.containsMatchIn(text)) return false
        if (extractAmount(text) == null) return false
        return PAYMENT_RE.containsMatchIn(text)
    }

    /**
     * 사용자가 적은 글로 서버에 보낼 문장을 만든다.
     * - "올리브영 만원" 처럼 금액이 들어 있으면 그대로
     * - "올리브영" 처럼 이름만 적었으면 알림에 있던 금액을 붙여 "올리브영 4500원"
     */
    fun buildQuickText(reply: String, original: String): String {
        val r = reply.trim()
        if (r.isEmpty()) return r
        if (HAS_AMOUNT_IN_REPLY_RE.containsMatchIn(r)) return r
        val amount = extractAmount(original) ?: return r
        return "$r ${amount}원"
    }

    /** 패키지 이름 목록(쉼표·줄바꿈 구분)을 정리한다. */
    fun parsePackages(raw: String): Set<String> =
        raw.split(',', '\n', ' ').map { it.trim() }.filter { it.isNotEmpty() }.toSet()

    /** 서버 주소 끝의 슬래시를 정리하고 /api/ledger 를 붙인다. 주소가 https 가 아니면 null. */
    fun ledgerEndpoint(baseUrl: String): String? {
        val b = baseUrl.trim().trimEnd('/')
        if (!b.startsWith("https://") || b.length <= "https://".length) return null
        return "$b/api/ledger"
    }
}
