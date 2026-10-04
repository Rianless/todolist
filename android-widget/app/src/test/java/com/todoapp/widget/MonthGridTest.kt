package com.todoapp.widget

import com.todoapp.widget.data.monthWeekCount
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalDate

class MonthGridTest {
    @Test fun fiveWeeks() = assertEquals(5, monthWeekCount(LocalDate.of(2026, 10, 1)))   // 목요일 시작, 31일
    @Test fun fourWeeksWhenFebStartsOnSunday() = assertEquals(4, monthWeekCount(LocalDate.of(2026, 2, 1)))
    @Test fun sixWeeks() = assertEquals(6, monthWeekCount(LocalDate.of(2026, 8, 1)))     // 토요일 시작, 31일
}
