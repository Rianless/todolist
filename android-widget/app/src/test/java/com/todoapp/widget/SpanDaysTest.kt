package com.todoapp.widget

import com.todoapp.widget.data.spanDayKeys
import org.junit.Assert.assertEquals
import org.junit.Test

class SpanDaysTest {
    @Test fun singleDayWithoutEnd() {
        assertEquals(listOf("2026-10-06"), spanDayKeys("2026-10-06", null))
        assertEquals(listOf("2026-10-06"), spanDayKeys("2026-10-06", ""))
    }

    @Test fun twoNightsThreeDays() {
        assertEquals(listOf("2026-10-06", "2026-10-07", "2026-10-08"), spanDayKeys("2026-10-06", "2026-10-08"))
    }

    @Test fun crossesMonthEnd() {
        assertEquals(listOf("2026-10-31", "2026-11-01"), spanDayKeys("2026-10-31", "2026-11-01"))
    }

    @Test fun endBeforeOrEqualStartIsSingleDay() {
        assertEquals(listOf("2026-10-06"), spanDayKeys("2026-10-06", "2026-10-06"))
        assertEquals(listOf("2026-10-06"), spanDayKeys("2026-10-06", "2026-10-01"))
    }

    @Test fun garbageEndIsIgnoredAndLongSpansAreCapped() {
        assertEquals(listOf("2026-10-06"), spanDayKeys("2026-10-06", "not-a-date"))
        assertEquals(62, spanDayKeys("2026-01-01", "2030-01-01").size)
    }
}
