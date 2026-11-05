package com.todoapp.widget.quick

/** 결제 알림 문구를 읽고, 사용자가 알림 칸에 적은 글을 서버로 보낼 문장으로 다듬는다. (안드로이드 클래스를 쓰지 않아 단위 테스트 가능) */
object QuickLedgerLogic {
    private val AMOUNT_RE = Regex("""(\d{1,3}(?:,\d{3})+|\d+)\s*원""")
    private val PAYMENT_RE = Regex("결제|승인|출금|사용|이체|송금|보냈")
    private val CANCEL_RE = Regex("취소|환불|환급")
    private val HAS_AMOUNT_IN_REPLY_RE = Regex("""\d|[일이삼사오육칠팔구][십백천만억]|[십백천만억]\s*원""")

    private const val AMT = """(?:\d{1,3}(?:,\d{3})+|\d+)"""
    // 캐시백·적립·할인·잔액 같은 금액은 결제 금액이 아니니 미리 걷어 낸다. (서버의 stripIgnoredAmounts 와 같은 규칙)
    // 말과 금액 사이에는 공백·콜론만 허용한다. 이모지·글자가 끼면 다음 금액은 결제 금액일 수 있다. (예: "9원 캐시백 🎉 3,000원 결제")
    private val IGNORED_BEFORE_RE = Regex("(?:(?:캐시백|적립|리워드|혜택|쿠폰|할인|잔액|잔고|한도)[\\s:：-]{0,3})+$AMT\\s*(?:원|P|p)?")
    private val IGNORED_AFTER_RE = Regex("$AMT\\s*(?:원|P|p)?\\s{0,2}(?:캐시백|적립|리워드|쿠폰|할인)")
    private val PAY_AFTER_RE = Regex("^\\s*(?:결제|승인|출금|사용|이체|송금|보냈)")
    private val PAY_BEFORE_RE = Regex("(?:결제|승인|출금|사용|이체|송금)\\s*[:：]?\\s*$")

    /** 알림 글에서 캐시백·적립·잔액 금액을 빼 낸다. 말이 금액 앞에 오는 경우를 먼저 지워야 결제 금액이 안 지워진다. */
    fun stripIgnoredAmounts(text: String): String =
        text.replace(IGNORED_BEFORE_RE, " ").replace(IGNORED_AFTER_RE, " ").replace(Regex("\\s+"), " ").trim()

    /** 알림 글에서 결제 금액(원)을 뽑는다. 캐시백·적립·잔액은 제외. 없으면 null. */
    fun extractAmount(text: String): Long? {
        val t = stripIgnoredAmounts(text)
        // 금액이 여러 개면 "3,000원 결제" 처럼 결제·승인·출금 말이 바로 붙은 금액을 먼저 고른다. 없으면 맨 앞 금액.
        var bestScore = 0
        var best: Long? = null
        for (m in AMOUNT_RE.findAll(t)) {
            val value = m.groupValues[1].replace(",", "").toLongOrNull()?.takeIf { it > 0 } ?: continue
            val end = m.range.last + 1
            val after = t.substring(end, minOf(t.length, end + 8))
            val before = t.substring(maxOf(0, m.range.first - 6), m.range.first)
            val score = if (PAY_AFTER_RE.containsMatchIn(after) || PAY_BEFORE_RE.containsMatchIn(before)) 2 else 1
            if (score > bestScore) { bestScore = score; best = value }
        }
        return best
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

    /** 저장이 끝난 뒤 알림에 보여 줄 한 줄. 예) "✓ 지출 올리브영 10,000원을 적었어요" */
    fun savedMessage(type: String, title: String, amount: Long): String =
        "✓ ${if (type == "income") "수입" else "지출"} $title ${"%,d".format(amount)}원을 적었어요"

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
