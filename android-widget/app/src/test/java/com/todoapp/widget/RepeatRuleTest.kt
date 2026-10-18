package com.todoapp.widget

import com.todoapp.widget.data.repeatOccursOn
import org.junit.Assert.assertEquals
import org.junit.Test

class RepeatRuleTest {
    @Test
    fun weekdaysPicksOnlyChosenDays() {
        // 2026-10-14 는 수요일. 수·목·금·토·일 반복
        val rule = "weekdays:3,4,5,6,0"
        assertEquals(true, repeatOccursOn(rule, "2026-10-14", null, "2026-10-15"))
        assertEquals(true, repeatOccursOn(rule, "2026-10-14", null, "2026-10-18")) // 일요일
        assertEquals(false, repeatOccursOn(rule, "2026-10-14", null, "2026-10-19")) // 월요일
        assertEquals(false, repeatOccursOn(rule, "2026-10-14", null, "2026-10-14")) // 원래 날짜
    }

    @Test
    fun basicRulesAndEnd() {
        assertEquals(true, repeatOccursOn("daily", "2026-10-14", null, "2026-10-20"))
        assertEquals(true, repeatOccursOn("weekly", "2026-10-14", null, "2026-10-21"))
        assertEquals(false, repeatOccursOn("weekly", "2026-10-14", null, "2026-10-20"))
        assertEquals(true, repeatOccursOn("monthly", "2026-10-14", null, "2026-11-14"))
        assertEquals(false, repeatOccursOn("daily", "2026-10-14", "2026-10-16", "2026-10-17"))
        assertEquals(false, repeatOccursOn("daily", "2026-10-14", null, "2026-10-10"))
        assertEquals(false, repeatOccursOn("none", "2026-10-14", null, "2026-10-15"))
    }
}
