package com.todoapp.widget.data

import java.time.LocalDate

/**
 * 여러 날 일정(1박 2일 등)이 차지하는 날짜들(시작일 포함). 종료 날짜가 없거나 시작일 이전이면 시작일 하나.
 * 반복이 없는 일정의 repeat_end 열이 종료 날짜를 맡는다. 비정상적으로 긴 값은 [maxDays] 일로 자른다.
 */
fun spanDayKeys(start: String, end: String?, maxDays: Int = 62): List<String> {
    val first = runCatching { LocalDate.parse(start) }.getOrNull() ?: return listOf(start)
    val last = end?.takeIf { it.isNotBlank() }?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
    if (last == null || !last.isAfter(first)) return listOf(start)
    val days = minOf(java.time.temporal.ChronoUnit.DAYS.between(first, last).toInt() + 1, maxDays)
    return (0 until days).map { first.plusDays(it.toLong()).toString() }
}
