package com.todoapp.widget.data

/**
 * [ids] (화면에 보이는 순서) 에서 [id] 를 [delta] 칸(위 -1, 아래 +1) 옮긴 새 순서.
 * 맨 위/맨 아래라서 더 못 옮기거나 목록에 없으면 null.
 */
fun moveInOrder(ids: List<String>, id: String, delta: Int): List<String>? {
    val from = ids.indexOf(id)
    val to = from + delta
    if (from < 0 || to < 0 || to >= ids.size) return null
    val result = ids.toMutableList()
    result.removeAt(from)
    result.add(to, id)
    return result
}

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
