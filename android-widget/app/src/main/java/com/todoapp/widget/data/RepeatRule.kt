package com.todoapp.widget.data

import java.time.LocalDate
import java.time.temporal.ChronoUnit

/**
 * 반복 일정이 [day] 에 나타나는지. 웹앱의 generateRepeatInstances 와 같은 규칙이다.
 * repeat: daily | weekly | monthly | weekdays:1,3,5 (0=일 ~ 6=토). 원래 날짜([base])는 반복이 아니라 원본이라 false.
 */
fun repeatOccursOn(repeat: String, base: String, repeatEnd: String?, day: String): Boolean {
    if (repeat.isEmpty() || repeat == "none" || day == base) return false
    val first = runCatching { LocalDate.parse(base) }.getOrNull() ?: return false
    val target = runCatching { LocalDate.parse(day) }.getOrNull() ?: return false
    if (target.isBefore(first)) return false
    val last = repeatEnd?.takeIf { it.isNotBlank() }?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
    if (last != null && target.isAfter(last)) return false
    return when {
        repeat == "daily" -> true
        repeat == "weekly" -> ChronoUnit.DAYS.between(first, target) % 7 == 0L
        repeat == "monthly" -> target.dayOfMonth == first.dayOfMonth
        repeat.startsWith("weekdays:") -> {
            val days = repeat.removePrefix("weekdays:").split(",").mapNotNull { it.trim().toIntOrNull() }
            // 일요일=0 (java 는 일요일=7)
            target.dayOfWeek.value % 7 in days
        }
        else -> false
    }
}

/** 반복 일정에서 날짜별로 따로 기록된 상태 (웹앱 /api/state 의 items 에 들어 있다). */
data class RepeatInfo(
    val excluded: Set<String>,
    val doneDates: Set<String>,
    val titles: Map<String, String>
)
