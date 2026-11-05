package com.todoapp.widget

import com.todoapp.widget.quick.QuickLedgerLogic
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class QuickLedgerLogicTest {
    @Test fun extractsAmount() {
        assertEquals(4500L, QuickLedgerLogic.extractAmount("이디야에서 4,500원 결제했어요"))
        assertEquals(12000L, QuickLedgerLogic.extractAmount("12000 원 승인"))
        assertNull(QuickLedgerLogic.extractAmount("이벤트가 도착했어요"))
    }

    @Test fun ignoresCashbackAndBalanceAmounts() {
        assertEquals(4500L, QuickLedgerLogic.extractAmount("이디야에서 4,500원 결제했어요 · 캐시백 10원 적립"))
        assertEquals(4500L, QuickLedgerLogic.extractAmount("캐시백 10원 적립! 이디야에서 4,500원 결제했어요"))
        assertEquals(4500L, QuickLedgerLogic.extractAmount("이디야에서 4,500원 결제 10원 캐시백"))
        assertEquals(4500L, QuickLedgerLogic.extractAmount("결제 4,500원 적립 10원"))
        assertEquals(4500L, QuickLedgerLogic.extractAmount("잔액 1,234,567원 · 이디야 4,500원 출금"))
        assertEquals(4500L, QuickLedgerLogic.extractAmount("4,500원 출금 · 잔액 1,234,567원"))
        assertNull(QuickLedgerLogic.extractAmount("10원 캐시백이 적립됐어요"))
        // 실제 토스뱅크 알림: 제목에 캐시백, 본문에 결제 금액과 잔액
        assertEquals(3000L, QuickLedgerLogic.extractAmount("9원 캐시백 \uD83C\uDF89 3,000원 결제 | 인터넷쇼핑몰(1)_TOSS\n잔액 114원(토스뱅크 체크카드)"))
        assertEquals(3000L, QuickLedgerLogic.extractAmount("캐시백 9원 · 잔액 114원 · 3,000원 승인"))
        assertFalse(QuickLedgerLogic.isPaymentText("10원 캐시백 결제 적립"))
    }

    @Test fun addsPaymentAmountNotCashbackWhenReplyIsOnlyAName() {
        assertEquals("올리브영 4500원", QuickLedgerLogic.buildQuickText("올리브영", "캐시백 10원 적립 · 4,500원 결제"))
        assertEquals("플레이툰 3000원", QuickLedgerLogic.buildQuickText("플레이툰", "9원 캐시백 \uD83C\uDF89 3,000원 결제 | 인터넷쇼핑몰(1)_TOSS\n잔액 114원(토스뱅크 체크카드)"))
    }

    @Test fun readsSamsungWalletNotifications() {
        assertTrue(QuickLedgerLogic.isPaymentText("3,500원 결제 완료 DUNKIN'DONUTS"))
        assertEquals(3500L, QuickLedgerLogic.extractAmount("3,500원 결제 완료 DUNKIN'DONUTS"))
        assertEquals(13000L, QuickLedgerLogic.extractAmount("13,000원 결제 완료 호천당(순천점)"))
        assertFalse(QuickLedgerLogic.isPaymentText("포인트 50원 적립됨 머니 즉석당첨 이벤트"))
        assertFalse(QuickLedgerLogic.isPaymentText("포인트 52원 적립됨 [우리은행계좌] 1.5% 추가적립"))
    }

    @Test fun detectsPaymentNotifications() {
        assertTrue(QuickLedgerLogic.isPaymentText("토스뱅크 체크카드 12,500원 결제 · GS25"))
        assertTrue(QuickLedgerLogic.isPaymentText("5,000원 출금되었어요"))
        assertFalse(QuickLedgerLogic.isPaymentText("이디야 4,500원 결제 취소"))
        assertFalse(QuickLedgerLogic.isPaymentText("혜택 3,000원 받아가세요"))
        assertFalse(QuickLedgerLogic.isPaymentText(""))
    }

    @Test fun keepsReplyThatAlreadyHasAmount() {
        assertEquals("올리브영 만원", QuickLedgerLogic.buildQuickText("올리브영 만원", "이디야 4,500원 결제"))
        assertEquals("이디야 4500", QuickLedgerLogic.buildQuickText(" 이디야 4500 ", "x 3,000원 결제"))
    }

    @Test fun keepsReplyWithKoreanNumerals() {
        assertEquals("마트 오천원", QuickLedgerLogic.buildQuickText("마트 오천원", "토스 4,500원 결제"))
        assertEquals("마트 오천", QuickLedgerLogic.buildQuickText("마트 오천", "토스 4,500원 결제"))
        assertEquals("올리브영 만원", QuickLedgerLogic.buildQuickText("올리브영 만원", "토스 4,500원 결제"))
    }

    @Test fun addsOriginalAmountWhenReplyIsOnlyAName() {
        assertEquals("올리브영 4500원", QuickLedgerLogic.buildQuickText("올리브영", "토스 4,500원 결제"))
        assertEquals("이마트 4500원", QuickLedgerLogic.buildQuickText("이마트", "토스 4,500원 결제"))
        assertEquals("오리고기 4500원", QuickLedgerLogic.buildQuickText("오리고기", "토스 4,500원 결제"))
    }

    @Test fun leavesReplyAloneWhenNoAmountAnywhere() {
        assertEquals("올리브영", QuickLedgerLogic.buildQuickText("올리브영", "광고"))
        assertEquals("", QuickLedgerLogic.buildQuickText("  ", "4,500원 결제"))
    }

    @Test fun savedMessageShowsWhatWasSaved() {
        assertEquals("✓ 지출 올리브영 10,000원을 적었어요", QuickLedgerLogic.savedMessage("expense", "올리브영", 10000))
        assertEquals("✓ 수입 용돈 50,000원을 적었어요", QuickLedgerLogic.savedMessage("income", "용돈", 50000))
    }

    @Test fun parsesPackagesAndEndpoint() {
        assertEquals(setOf("a.b", "c.d"), QuickLedgerLogic.parsePackages("a.b, c.d\n"))
        assertEquals("https://x.app/api/ledger", QuickLedgerLogic.ledgerEndpoint(" https://x.app/ "))
        assertNull(QuickLedgerLogic.ledgerEndpoint("http://x.app"))
        assertNull(QuickLedgerLogic.ledgerEndpoint("https://"))
    }
}
