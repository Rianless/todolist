package com.todoapp.widget.autoexpense

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class PaymentParserTest {
    private fun ok(title: String?, text: String?, amount: Long, merchant: String) {
        val parsed = PaymentParser.parse(title, text)
        assertNotNull("결제로 읽혀야 함: [$title] $text", parsed)
        assertEquals("금액: [$title] $text", amount, parsed!!.amount)
        assertEquals("가맹점: [$title] $text", merchant, parsed.merchant)
    }

    private fun notPayment(title: String?, text: String?) {
        assertNull("결제가 아니어야 함: [$title] $text", PaymentParser.parse(title, text))
    }

    @Test fun samsungPayStyle() {
        ok("삼성페이", "스타벅스 강남R점 5,500원 결제 완료", 5500, "스타벅스 강남R점")
        ok("Samsung Wallet", "결제 완료\n5,500원 · 스타벅스", 5500, "스타벅스")
    }

    @Test fun kakaoPayStyle() {
        ok("카카오페이", "[카카오페이] 스타벅스에서 5,500원이 결제되었습니다.", 5500, "스타벅스")
    }

    @Test fun tossStyle() {
        ok("토스", "스타벅스에서 5,500원 결제했어요", 5500, "스타벅스")
        ok("토스뱅크", "체크카드 5,500원 결제 · 스타벅스", 5500, "스타벅스")
    }

    @Test fun naverPayStyle() {
        ok("네이버페이", "[네이버페이] 결제가 완료되었습니다.\n올리브영 12,000원", 12000, "올리브영")
    }

    @Test fun labeledMerchant() {
        ok("결제 알림", "승인 8,900원\n가맹점: 파리바게뜨 역삼점\n일시불", 8900, "파리바게뜨 역삼점")
    }

    @Test fun amountFormats() {
        ok("삼성페이", "1,234,567원 결제 · 가전매장", 1234567, "가전매장")
        ok("삼성페이", "5500원 결제 · 편의점", 5500, "편의점")
    }

    @Test fun skipsBalanceAndDiscountAmounts() {
        ok("삼성페이", "결제 5,500원 / 잔액 100,000원 · 스타벅스", 5500, "스타벅스")
        ok("삼성페이", "잔액 100,000원 중 5,500원 결제 · 스타벅스", 5500, "스타벅스")
        ok("삼성페이", "할인 1,000원 적용 결제금액 4,500원 · 스타벅스", 4500, "스타벅스")
    }

    @Test fun storeNameContainingAppName() {
        ok("토스", "토스트하우스에서 3,500원 결제했어요", 3500, "토스트하우스")
    }

    @Test fun cardDigitsAndDatesAreNotMerchants() {
        ok("신한카드", "신한카드(1234) 승인 10/02 12:30 5,500원 일시불 스타벅스", 5500, "스타벅스")
    }

    @Test fun rejectsCancelRefundAndFailures() {
        notPayment("삼성페이", "스타벅스 5,500원 결제 취소")
        notPayment("카카오페이", "5,500원 환불되었습니다")
        notPayment("토스", "5,500원 결제에 실패했어요")
        notPayment("삼성페이", "한도 초과로 승인 거절 5,500원")
    }

    @Test fun rejectsNonSpending() {
        notPayment("토스", "인증번호 123456 결제 승인에 필요합니다")
        notPayment("카카오페이", "카카오페이머니 10,000원 충전 완료")
        notPayment("토스", "홍길동님에게 5,000원 송금했어요 출금 완료")
        notPayment("토스뱅크", "월급 2,500,000원 입금 · 결제 계좌 안내")
    }

    @Test fun rejectsAdsAndTexts() {
        notPayment("카카오페이", "(광고) 결제하면 5,000원 쿠폰을 드려요")
        notPayment("삼성페이", "이번 달 누적 사용금액 100,000원")
        notPayment("토스", "포인트 500원이 적립되었어요")
        notPayment("택배", "택배가 도착했습니다")
        notPayment(null, null)
        notPayment("", "")
    }

    @Test fun merchantMayBeEmpty() {
        val parsed = PaymentParser.parse("삼성페이", "5,500원 결제 완료")
        assertNotNull(parsed)
        assertEquals(5500L, parsed!!.amount)
        assertEquals("", parsed.merchant)
    }

    @Test fun absurdAmountsAreIgnored() {
        notPayment("삼성페이", "500,000,000,000원 결제 · 어딘가")
    }
}
