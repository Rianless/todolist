package com.todoapp.widget.data

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class ChecklistItem(
    val id: String,
    var text: String,
    var done: Boolean
)

object CloudStateClient {
    private const val STATE_API_URL = "https://todolist-liart-mu.vercel.app/api/state"

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
