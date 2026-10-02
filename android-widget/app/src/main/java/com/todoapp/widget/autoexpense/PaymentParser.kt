package com.todoapp.widget.autoexpense

/** 알림 문구에서 뽑아낸 결제 정보. merchant 가 비어 있으면 가맹점을 못 찾은 것이다. */
data class ParsedPayment(val amount: Long, val merchant: String)

/**
 * 간편결제 앱 알림 문구에서 금액과 가맹점을 뽑는다. (안드로이드 클래스를 쓰지 않아 JVM 단위 테스트가 가능하다)
 *
 * 앱마다 문구가 달라서 완벽할 수 없다. 틀리게 읽어도 웹의 "확인 대기함"에서 사용자가 고칠 수 있으므로,
 * 결제가 아닌 알림(취소·충전·인증번호·광고 등)을 걸러내는 쪽에 더 보수적이다.
 */
object PaymentParser {
    private val AMOUNT = Regex("""(\d{1,3}(?:,\d{3})+|\d+)\s*원""")

    // 이 중 하나는 있어야 결제 알림으로 본다.
    private val ACCEPT = listOf("결제", "승인", "사용", "출금", "이용")

    // 하나라도 있으면 지출이 아니거나 결제가 끝나지 않은 알림이다.
    private val REJECT = listOf("취소", "환불", "실패", "거절", "인증", "충전", "송금", "입금", "광고", "이벤트", "당첨")

    // 금액 앞에 이런 말이 붙어 있으면 결제 금액이 아니다. (잔액, 한도, 할인액 등)
    private val SKIP_BEFORE = listOf("잔액", "한도", "할인", "적립", "포인트", "누적", "남은", "잔여", "혜택")

    private val APP_NAMES = listOf(
        "삼성페이", "삼성월렛", "삼성 월렛", "samsung wallet", "samsung pay", "카카오페이", "네이버페이", "네이버 페이",
        "토스페이", "토스뱅크", "토스", "toss", "구글 월렛", "google wallet", "google pay"
    )
    // 앞뒤에 글자가 붙어 있으면 가게 이름의 일부(예: "토스트")이므로 지우지 않는다.
    private val APP_NAMES_REGEX = Regex(
        "(?<![가-힣A-Za-z0-9])(?:" + APP_NAMES.sortedByDescending { it.length }.joinToString("|") { Regex.escape(it) } + ")(?![가-힣A-Za-z0-9])",
        RegexOption.IGNORE_CASE
    )

    private val LABELED = Regex("""(?:가맹점|사용처|결제처|이용처|상호|상점)\s*[:：]?\s*([^\n·|,]{1,40})""")
    private val BEFORE_ESEO = Regex("""([^\n\[\]·|]{1,30}?)에서\s*\d[\d,]*\s*원""")

    // 줄바꿈, ·, |, 앞뒤가 띄어진 / 로 문구 조각을 나눈다. (날짜의 10/02 는 나누지 않는다)
    private val SEGMENT_SEPARATOR = Regex("""[\n·|]|\s/\s""")
    private val BRACKET_TAG = Regex("""\[[^\]]*\]""")
    private val DATE = Regex("""\d{1,4}[/.\-]\d{1,2}(?:[/.\-]\d{1,2})?""")
    private val TIME = Regex("""\d{1,2}:\d{2}(?::\d{2})?""")
    private val CARD_DIGITS = Regex("""\([\d*\s]*\)""")
    // 카드사 이름 + 카드 (예: 신한카드, KB국민 체크카드)
    private val CARD_ISSUER = Regex(
        "(?:신한|삼성|KB국민|국민|KB|현대|롯데|하나|우리|NH농협|농협|NH|BC|비씨|씨티|카카오뱅크|케이뱅크|IBK|기업)\\s*(?:체크|신용)?카드",
        RegexOption.IGNORE_CASE
    )
    private val NOISE = Regex(
        "[가-힣]{2,4}님|결제(?:되었습니다|되었어요|됐어요|했어요|했습니다|완료|금액|내역|가|를)?|승인(?:완료|내역)?|완료|" +
            "되었습니다|되었어요|됐어요|했어요|했습니다|일시불|할부|\\d+개월|체크카드|신용카드|카드|출금|" +
            "사용(?:금액|내역)?|이용(?:금액|내역)?|해외|국내|안내|알림|내역|" +
            "잔액|한도|할인|적용|포인트|적립|누적|남은|잔여|혜택|(?<![가-힣])중(?![가-힣])"
    )

    fun parse(title: String?, text: String?): ParsedPayment? {
        val body = text?.trim().orEmpty()
        val whole = listOf(title, body).filter { !it.isNullOrBlank() }.joinToString("\n")
        if (whole.isBlank()) return null
        if (REJECT.any { whole.contains(it) }) return null
        if (ACCEPT.none { whole.contains(it) }) return null
        val amount = pickAmount(whole) ?: return null
        if (amount <= 0 || amount > 100_000_000L) return null
        return ParsedPayment(amount, extractMerchant(whole) ?: "")
    }

    private fun pickAmount(text: String): Long? {
        for (match in AMOUNT.findAll(text)) {
            val before = text.substring(maxOf(0, match.range.first - 8), match.range.first)
            if (SKIP_BEFORE.any { before.contains(it) }) continue
            val value = match.groupValues[1].replace(",", "").toLongOrNull() ?: continue
            return value
        }
        return null
    }

    private fun extractMerchant(whole: String): String? {
        LABELED.find(whole)?.groupValues?.get(1)?.let { clean(it) }?.takeIf { it.isNotBlank() }?.let { return it }
        BEFORE_ESEO.find(whole)?.groupValues?.get(1)?.let { clean(it) }?.takeIf { it.isNotBlank() }?.let { return it }
        for (segment in whole.split(SEGMENT_SEPARATOR)) {
            val cleaned = clean(segment)
            if (cleaned.length >= 2 && cleaned.any { it.isLetter() }) return cleaned
        }
        return null
    }

    private fun clean(raw: String): String {
        var s = raw
        s = BRACKET_TAG.replace(s, " ")
        s = AMOUNT.replace(s, " ")
        s = DATE.replace(s, " ")
        s = TIME.replace(s, " ")
        s = CARD_DIGITS.replace(s, " ")
        s = CARD_ISSUER.replace(s, " ")
        s = APP_NAMES_REGEX.replace(s, " ")
        s = NOISE.replace(s, " ")
        s = s.replace(Regex("""\s+"""), " ").trim { !it.isLetterOrDigit() }
        return if (s.length > 40) s.substring(0, 40).trim() else s
    }
}
