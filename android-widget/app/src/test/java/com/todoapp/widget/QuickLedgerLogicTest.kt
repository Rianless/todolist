package com.todoapp.widget

import com.todoapp.widget.quick.QuickLedgerLogic
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class QuickLedgerLogicTest {
    @Test fun extractsAmount() {
        assertEquals(4500L, QuickLedgerLogic.extractAmount("스타벅스에서 4,500원 결제했어요"))
        assertEquals(12000L, QuickLedgerLogic.extractAmount("12000 원 승인"))
        assertNull(QuickLedgerLogic.extractAmount("이벤트가 도착했어요"))
    }

    @Test fun detectsPaymentNotifications() {
        assertTrue(QuickLedgerLogic.isPaymentText("토스뱅크 체크카드 12,500원 결제 · GS25"))
        assertTrue(QuickLedgerLogic.isPaymentText("5,000원 출금되었어요"))
        assertFalse(QuickLedgerLogic.isPaymentText("스타벅스 4,500원 결제 취소"))
        assertFalse(QuickLedgerLogic.isPaymentText("혜택 3,000원 받아가세요"))
        assertFalse(QuickLedgerLogic.isPaymentText(""))
    }

    @Test fun keepsReplyThatAlreadyHasAmount() {
        assertEquals("올리브영 만원", QuickLedgerLogic.buildQuickText("올리브영 만원", "스타벅스 4,500원 결제"))
        assertEquals("스벅 4500", QuickLedgerLogic.buildQuickText(" 스벅 4500 ", "x 3,000원 결제"))
    }

    @Test fun addsOriginalAmountWhenReplyIsOnlyAName() {
        assertEquals("올리브영 4500원", QuickLedgerLogic.buildQuickText("올리브영", "토스 4,500원 결제"))
    }

    @Test fun leavesReplyAloneWhenNoAmountAnywhere() {
        assertEquals("올리브영", QuickLedgerLogic.buildQuickText("올리브영", "광고"))
        assertEquals("", QuickLedgerLogic.buildQuickText("  ", "4,500원 결제"))
    }

    @Test fun parsesPackagesAndEndpoint() {
        assertEquals(setOf("a.b", "c.d"), QuickLedgerLogic.parsePackages("a.b, c.d\n"))
        assertEquals("https://x.app/api/ledger", QuickLedgerLogic.ledgerEndpoint(" https://x.app/ "))
        assertNull(QuickLedgerLogic.ledgerEndpoint("http://x.app"))
        assertNull(QuickLedgerLogic.ledgerEndpoint("https://"))
    }
}
