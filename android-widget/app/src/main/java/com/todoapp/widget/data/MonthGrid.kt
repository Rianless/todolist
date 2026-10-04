package com.todoapp.widget.data

import java.time.LocalDate

/** 달력 모드에서 [first](그 달 1일)가 든 달을 덮는 주(일~토) 수. 4~6. */
fun monthWeekCount(first: LocalDate): Int =
    ((first.dayOfWeek.value % 7) + first.lengthOfMonth() + 6) / 7
