package com.todoapp.widget.data

import androidx.lifecycle.LiveData
import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonObject

class TodoRepository(private val dao: TodoDao) {

    val allTodos: LiveData<List<Todo>> = dao.getAllTodos()

    fun getTodosByDate(date: String): LiveData<List<Todo>> = dao.getTodosByDate(date)

    suspend fun insert(todo: Todo): Long = dao.insertTodo(todo)

    suspend fun update(todo: Todo) = dao.updateTodo(todo)

    suspend fun delete(todo: Todo) = dao.deleteTodo(todo)

    suspend fun setDone(id: Int, done: Boolean) = dao.setDone(id, done)

    suspend fun getPendingTodos(limit: Int = 5): List<Todo> = dao.getPendingTodos(limit)

    suspend fun getUpcomingTodos(fromDate: String, limit: Int = 5): List<Todo> =
        dao.getUpcomingTodos(fromDate, limit)

    suspend fun getCount(): Int = dao.getCount()

    suspend fun getDoneCount(): Int = dao.getDoneCount()

    /**
     * Import todos from the web app's JSON format.
     * Compatible with the index.html IndexedDB format.
     */
    suspend fun importFromJson(jsonString: String): Int {
        return try {
            val gson = Gson()
            val array = gson.fromJson(jsonString, JsonArray::class.java)
            val todos = array.map { element ->
                val obj = element.asJsonObject
                Todo(
                    date = obj.getString("date"),
                    title = obj.getString("title"),
                    startTime = obj.getString("startTime"),
                    endTime = obj.getString("endTime"),
                    allDay = obj.getBoolean("allDay"),
                    category = obj.getString("category", "기타"),
                    categoryColor = categoryToColor(obj.getString("category", "기타")),
                    module = obj.getString("module"),
                    instructor = obj.getString("instructor"),
                    location = obj.getString("location"),
                    room = obj.getString("room"),
                    note = obj.getString("note"),
                    content = obj.getString("content"),
                    done = obj.getBoolean("done")
                )
            }
            dao.deleteAll()
            dao.insertAll(todos)
            todos.size
        } catch (e: Exception) {
            -1
        }
    }

    /**
     * Export todos to JSON format compatible with the web app.
     */
    suspend fun exportToJson(): String {
        val todos = dao.getAllTodosSync()
        val gson = Gson()
        val array = JsonArray()
        todos.forEachIndexed { index, todo ->
            val obj = JsonObject()
            obj.addProperty("id", todo.id)
            obj.addProperty("date", todo.date)
            obj.addProperty("title", todo.title)
            obj.addProperty("startTime", todo.startTime)
            obj.addProperty("endTime", todo.endTime)
            obj.addProperty("allDay", todo.allDay)
            obj.addProperty("category", todo.category)
            obj.addProperty("module", todo.module)
            obj.addProperty("instructor", todo.instructor)
            obj.addProperty("location", todo.location)
            obj.addProperty("room", todo.room)
            obj.addProperty("note", todo.note)
            obj.addProperty("content", todo.content)
            obj.addProperty("done", todo.done)
            array.add(obj)
        }
        return gson.toJson(array)
    }

    private fun JsonObject.getString(key: String, default: String = ""): String {
        return try { get(key)?.asString ?: default } catch (e: Exception) { default }
    }

    private fun JsonObject.getBoolean(key: String, default: Boolean = false): Boolean {
        return try { get(key)?.asBoolean ?: default } catch (e: Exception) { default }
    }

    private fun categoryToColor(category: String): String {
        return when (category) {
            "밀착상담" -> "#FF6B6B"
            "자신감회복" -> "#FFD93D"
            "취업역량강화" -> "#34C759"
            "진로탐색" -> "#5856D6"
            "지역맞춤형" -> "#FF2D55"
            "사례관리" -> "#AF52DE"
            "자율활동" -> "#8E8E93"
            "개인" -> "#FF9500"
            else -> "#636366"
        }
    }
}
