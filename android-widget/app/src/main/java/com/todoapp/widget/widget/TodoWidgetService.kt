package com.todoapp.widget.widget

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.todoapp.widget.R
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.time.format.DateTimeFormatter

data class TodoItem(
    val id: Int,
    val title: String,
    val date: String,
    val startTime: String,
    val endTime: String,
    val allDay: Boolean,
    val category: String,
    val categoryColor: String,
    val done: Boolean
)

class TodoWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return TodoWidgetFactory(applicationContext, intent)
    }
}

class TodoWidgetFactory(
    private val context: Context,
    private val intent: Intent
) : RemoteViewsService.RemoteViewsFactory {

    private var todos: List<TodoItem> = emptyList()
    private val selectedDate: String =
        intent.getStringExtra(TodoWidgetProvider.EXTRA_DATE)
            ?: LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)

    private val apiUrl = "https://todolist-liart-mu.vercel.app/api/todos"

    override fun onCreate() {}

    override fun onDataSetChanged() {
        runBlocking {
            runCatching {
                // 선택된 날짜만 가져오기
                val url = URL("$apiUrl?date=$selectedDate")
                val conn = url.openConnection() as HttpURLConnection
                conn.setRequestProperty("Content-Type", "application/json")

                val response = conn.inputStream.bufferedReader().readText()
                conn.disconnect()

                val arr = JSONArray(response)
                val list = mutableListOf<TodoItem>()
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    list.add(
                        TodoItem(
                            id = obj.optInt("id"),
                            title = obj.optString("title"),
                            date = obj.optString("date"),
                            startTime = obj.optString("start_time"),
                            endTime = obj.optString("end_time"),
                            allDay = obj.optBoolean("all_day"),
                            category = obj.optString("category"),
                            categoryColor = obj.optString("category_color", "#636366"),
                            done = obj.optBoolean("done")
                        )
                    )
                }
                todos = list
            }.onFailure {
                todos = emptyList()
            }
        }
    }

    override fun onDestroy() {}
    override fun getCount(): Int = todos.size

    override fun getViewAt(position: Int): RemoteViews {
        if (position !in todos.indices) {
            return RemoteViews(context.packageName, R.layout.widget_item)
        }

        val todo = todos[position]
        val views = RemoteViews(context.packageName, R.layout.widget_item)

        // 컬러 바
        try {
            views.setInt(R.id.widget_item_accent, "setBackgroundColor", Color.parseColor(todo.categoryColor))
        } catch (e: Exception) {
            views.setInt(R.id.widget_item_accent, "setBackgroundColor", Color.parseColor("#636366"))
        }

        // 카테고리
        views.setTextViewText(R.id.widget_item_category, todo.category)

        // 선택된 날짜만 보여주므로, 날짜 라벨은 생략(깔끔하게) — 대신 필요 시 "오늘"만
        val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
        val dateLabel = if (todo.date == today) "오늘" else ""
        views.setTextViewText(R.id.widget_item_date, dateLabel)

        // 시간
        val timeStr = when {
            todo.allDay -> "하루종일"
            todo.startTime.isNotEmpty() -> if (todo.endTime.isNotEmpty()) "${todo.startTime}–${todo.endTime}" else todo.startTime
            else -> ""
        }
        views.setTextViewText(R.id.widget_item_time, timeStr)

        // 제목 — 완료시 취소선 + 연하게
        if (todo.done) {
            views.setFloat(R.id.widget_item_title, "setAlpha", 0.35f)
            val spannable = android.text.SpannableString(todo.title)
            spannable.setSpan(
                android.text.style.StrikethroughSpan(),
                0, todo.title.length,
                android.text.Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
            )
            views.setTextViewText(R.id.widget_item_title, spannable)
        } else {
            views.setFloat(R.id.widget_item_title, "setAlpha", 1f)
            views.setTextViewText(R.id.widget_item_title, todo.title)
        }

        // 완료 동그라미
        if (todo.done) {
            views.setInt(R.id.widget_item_check, "setBackgroundResource", R.drawable.bg_widget_check_done)
        } else {
            views.setInt(R.id.widget_item_check, "setBackgroundResource", R.drawable.bg_widget_check)
        }

        // 클릭 인텐트 (상세 팝업)
        val fillIntent = Intent().apply {
            putExtra(TodoWidgetProvider.EXTRA_TODO_ID, todo.id)
        }
        views.setOnClickFillInIntent(R.id.widget_item_root, fillIntent)

        return views
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 1
    override fun getItemId(position: Int): Long = todos.getOrNull(position)?.id?.toLong() ?: position.toLong()
    override fun hasStableIds(): Boolean = true
}
