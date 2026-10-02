package com.todoapp.widget.data

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.time.temporal.ChronoUnit

data class ChecklistItem(
    val id: String,
    var text: String,
    var done: Boolean
)

/** 선택한 날짜의 가계부 내역 / 구독 결제 한 건 (웹앱의 "오늘의 일정"과 같은 항목) */
data class DayExtra(
    val kind: String,        // "income" | "expense" | "subscription"
    val title: String,
    val category: String,
    val amount: Long
) {
    val kindLabel: String
        get() = when (kind) {
            "income" -> "수입"
            "expense" -> "지출"
            else -> "구독"
        }

    val amountText: String
        get() = "${if (kind == "income") "+" else "-"}${"%,d".format(amount)}원"

    val summary: String
        get() = "${if (kind == "subscription") "\uD83D\uDD16 " else ""}$title · $amountText"
}

object CloudStateClient {
    private const val STATE_API_URL = "https://todolist-liart-mu.vercel.app/api/state"

    /** 웹앱에서 사용자가 정한 그날 일정 순서(일정 id 목록). 정한 적이 없으면 빈 목록. */
    fun fetchItemOrder(date: LocalDate): List<String> {
        val state = fetchState() ?: return emptyList()
        val array = state.optJSONObject("itemOrder")?.optJSONArray(date.toString()) ?: return emptyList()
        return (0 until array.length()).map { array.opt(it).toString() }
    }

    /**
     * 웹앱 상태(/api/state)에서 해당 날짜의 가계부 내역과 구독 결제를 가져온다.
     * 네트워크 오류 시 빈 목록을 돌려준다.
     */
    fun fetchDayExtras(date: LocalDate): List<DayExtra> {
        val state = fetchState() ?: return emptyList()
        val dateValue = date.toString()
        val result = mutableListOf<DayExtra>()

        val ledger = state.optJSONArray("ledger")
        if (ledger != null) {
            for (index in 0 until ledger.length()) {
                val entry = ledger.optJSONObject(index) ?: continue
                if (entry.optString("date") != dateValue) continue
                val type = if (entry.optString("type") == "income") "income" else "expense"
                result.add(
                    DayExtra(
                        kind = type,
                        title = entry.optString("title").ifBlank { if (type == "income") "수입" else "지출" },
                        category = entry.optString("category"),
                        amount = parseAmount(entry.optString("amount"))
                    )
                )
            }
        }

        val subscriptions = state.optJSONArray("subscriptions")
        if (subscriptions != null) {
            for (index in 0 until subscriptions.length()) {
                val sub = subscriptions.optJSONObject(index) ?: continue
                if (!subscriptionOccursOn(sub, date)) continue
                result.add(
                    DayExtra(
                        kind = "subscription",
                        title = sub.optString("name"),
                        category = sub.optString("category"),
                        amount = parseAmount(sub.optString("amount"))
                    )
                )
            }
        }
        return result
    }

    private fun parseAmount(raw: String): Long =
        raw.replace(",", "").trim().toDoubleOrNull()?.toLong() ?: 0L

    /** 웹앱 index.html의 getSubDatesForMonth 와 같은 결제일 계산 */
    private fun subscriptionOccursOn(sub: JSONObject, date: LocalDate): Boolean {
        val start = runCatching { LocalDate.parse(sub.optString("date")) }.getOrNull() ?: return false
        val monthDiff = (date.year - start.year) * 12 + (date.monthValue - start.monthValue)
        val sameDayOfMonth = date.dayOfMonth == minOf(start.dayOfMonth, date.lengthOfMonth())
        return when (sub.optString("cycle")) {
            "monthly" -> monthDiff >= 0 && sameDayOfMonth
            "bimonthly" -> monthDiff >= 0 && monthDiff % 2 == 0 && sameDayOfMonth
            "yearly" -> date.year >= start.year && date.monthValue == start.monthValue && sameDayOfMonth
            "weekly" -> !date.isBefore(start) && date.dayOfWeek == start.dayOfWeek
            "biweekly" -> !date.isBefore(start) && ChronoUnit.DAYS.between(start, date) % 14 == 0L
            else -> date == start
        }
    }

    fun fetchChecklist(todoId: Int): MutableList<ChecklistItem> {
        val state = fetchState() ?: return mutableListOf()
        val item = findTodo(state.optJSONArray("items"), todoId) ?: return mutableListOf()
        return parseChecklist(item.optJSONArray("checklist"))
    }

    fun saveTodo(
        todoId: Int,
        apiBody: JSONObject,
        checklist: List<ChecklistItem>
    ): Boolean {
        val state = fetchState() ?: return false
        val items = state.optJSONArray("items") ?: JSONArray().also { state.put("items", it) }
        val target = findTodo(items, todoId) ?: JSONObject()
            .put("id", todoId)
            .put("done", false)
            .also { items.put(it) }

        target.put("date", apiBody.optString("date"))
        target.put("title", apiBody.optString("title"))
        target.put("startTime", apiBody.optString("start_time"))
        target.put("endTime", apiBody.optString("end_time"))
        target.put(
            "time",
            when {
                apiBody.optBoolean("all_day") -> "allday"
                apiBody.optString("start_time").isNotEmpty() && apiBody.optString("end_time").isNotEmpty() ->
                    "${apiBody.optString("start_time")}~${apiBody.optString("end_time")}"
                else -> apiBody.optString("start_time")
            }
        )
        target.put("allDay", apiBody.optBoolean("all_day"))
        target.put("category", apiBody.optString("category"))
        target.put("categoryColor", apiBody.optString("category_color", "#636366"))
        target.put("location", apiBody.optString("location"))
        target.put("note", apiBody.optString("note"))
        target.put("memo", apiBody.optString("memo", apiBody.optString("note")))
        target.put("content", apiBody.optString("content"))
        target.put("checklist", checklistToJson(checklist))
        if (!target.has("priority")) target.put("priority", "none")
        if (!target.has("secret")) target.put("secret", false)
        if (!target.has("hideTitle")) target.put("hideTitle", false)
        if (!target.has("personal")) target.put("personal", true)

        return postState(state)
    }

    fun saveChecklist(todoId: Int, checklist: List<ChecklistItem>): Boolean {
        val state = fetchState() ?: return false
        val target = findTodo(state.optJSONArray("items"), todoId) ?: return false
        target.put("checklist", checklistToJson(checklist))
        return postState(state)
    }

    fun updateDone(todoId: Int, done: Boolean): Boolean {
        val state = fetchState() ?: return false
        val target = findTodo(state.optJSONArray("items"), todoId) ?: return false
        target.put("done", done)
        return postState(state)
    }

    fun deleteTodo(todoId: Int): Boolean {
        val state = fetchState() ?: return false
        val items = state.optJSONArray("items") ?: return false
        val updated = JSONArray()
        for (index in 0 until items.length()) {
            val item = items.optJSONObject(index) ?: continue
            if (item.optInt("id") != todoId) updated.put(item)
        }
        state.put("items", updated)
        return postState(state)
    }

    private fun fetchState(): JSONObject? {
        return runCatching {
            val connection = URL(STATE_API_URL).openConnection() as HttpURLConnection
            connection.connectTimeout = 8000
            connection.readTimeout = 8000
            val response = connection.inputStream.bufferedReader().readText()
            connection.disconnect()
            JSONObject(response).optJSONObject("data")
        }.getOrNull()
    }

    private fun postState(state: JSONObject): Boolean {
        return runCatching {
            val connection = URL(STATE_API_URL).openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.connectTimeout = 8000
            connection.readTimeout = 8000
            connection.doOutput = true
            connection.outputStream.use { it.write(state.toString().toByteArray()) }
            val success = connection.responseCode in 200..299
            if (success) connection.inputStream.close() else connection.errorStream?.close()
            connection.disconnect()
            success
        }.getOrDefault(false)
    }

    private fun findTodo(items: JSONArray?, todoId: Int): JSONObject? {
        if (items == null) return null
        for (index in 0 until items.length()) {
            val item = items.optJSONObject(index) ?: continue
            if (item.optInt("id") == todoId) return item
        }
        return null
    }

    private fun parseChecklist(array: JSONArray?): MutableList<ChecklistItem> {
        val result = mutableListOf<ChecklistItem>()
        if (array == null) return result
        for (index in 0 until array.length()) {
            val item = array.optJSONObject(index) ?: continue
            val text = item.optString("text").trim()
            if (text.isEmpty()) continue
            result.add(
                ChecklistItem(
                    id = item.optString("id", "check-$index"),
                    text = text,
                    done = item.optBoolean("done")
                )
            )
        }
        return result
    }

    private fun checklistToJson(checklist: List<ChecklistItem>): JSONArray {
        return JSONArray().apply {
            checklist.filter { it.text.isNotBlank() }.forEach { item ->
                put(
                    JSONObject()
                        .put("id", item.id)
                        .put("text", item.text.trim())
                        .put("done", item.done)
                )
            }
        }
    }
}
