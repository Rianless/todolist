package com.todoapp.widget.data

/**
 * 웹앱에서 사용자가 정한 하루 일정 순서를 적용한다. (index.html 의 applyDayOrder 와 같은 규칙)
 * 정한 순서에 없는 항목(새로 생긴 일정)은 원래 순서 그대로 뒤에 붙는다.
 */
fun <T> applyItemOrder(items: List<T>, order: List<String>, idOf: (T) -> String): List<T> {
    if (order.isEmpty()) return items
    val position = HashMap<String, Int>()
    order.forEachIndexed { index, id -> if (!position.containsKey(id)) position[id] = index }
    val known = items.filter { position.containsKey(idOf(it)) }.sortedBy { position[idOf(it)] }
    val unknown = items.filter { !position.containsKey(idOf(it)) }
    return known + unknown
}
