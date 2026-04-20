package com.todoapp.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.time.format.DateTimeFormatter

class TodoWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val PWA_URL = "https://todolist-three-bice-59.vercel.app/"
        private const val API_URL = "https://todolist-three-bice-59.vercel.app/api/todos"

        private val DOW_IDS = intArrayOf(
            R.id.dow_0, R.id.dow_1, R.id.dow_2, R.id.dow_3, R.id.dow_4, R.id.dow_5, R.id.dow_6
        )
        private val DATE_IDS = intArrayOf(
            R.id.date_0, R.id.date_1, R.id.date_2, R.id.date_3, R.id.date_4, R.id.date_5, R.id.date_6
        )
        private val DOT_IDS = intArrayOf(
            R.id.dot_0, R.id.dot_1, R.id.dot_2, R.id.dot_3, R.id.dot_4, R.id.dot_5, R.id.dot_6
        )
        private val TODO_ROW_IDS = intArrayOf(
            R.id.todo_row_0, R.id.todo_row_1, R.id.todo_row_2, R.id.todo_row_3
        )
        private val TODO_TIME_IDS = intArrayOf(
            R.id.todo_time_0, R.id.todo_time_1, R.id.todo_time_2, R.id.todo_time_3
        )
        private val TODO_TITLE_IDS = intArrayOf(
            R.id.todo_title_0, R.id.todo_title_1, R.id.todo_title_2, R.id.todo_title_3
        )
    }

    data class TodoItem(
        val date: String,
        val title: String,
        val startTime: String,
        val allDay: Boolean,
        val done: Boolean
    )

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_layout)

        // Tap whole widget → open PWA
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(PWA_URL))
        val pendingIntent = PendingIntent.getActivity(
            context, appWidgetId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

        // Show week strip immediately (no todos yet)
        bindWeekStrip(views, emptyList())
        bindTodos(views, emptyList())
        appWidgetManager.updateAppWidget(appWidgetId, views)

        // Fetch todos in background then update
        Thread {
            val todos = try {
                fetchTodos()
            } catch (e: Exception) {
                emptyList()
            }
            Handler(Looper.getMainLooper()).post {
                val v2 = RemoteViews(context.packageName, R.layout.widget_layout)
                v2.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
                bindWeekStrip(v2, todos)
                bindTodos(v2, todos)
                appWidgetManager.updateAppWidget(appWidgetId, v2)
            }
        }.start()
    }

    private fun fetchTodos(): List<TodoItem> {
        val conn = URL(API_URL).openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.connectTimeout = 7000
        conn.readTimeout = 7000
        val body = conn.inputStream.bufferedReader().use { it.readText() }
        conn.disconnect()

        val arr = JSONArray(body)
        val result = mutableListOf<TodoItem>()
        for (i in 0 until arr.length()) {
            val obj = arr.getJSONObject(i)
            result.add(
                TodoItem(
                    date = obj.optString("date", ""),
                    title = obj.optString("title", ""),
                    startTime = obj.optString("start_time", ""),
                    allDay = obj.optBoolean("all_day", false),
                    done = obj.optBoolean("done", false)
                )
            )
        }
        return result
    }

    private fun bindWeekStrip(views: RemoteViews, todos: List<TodoItem>) {
        val today = LocalDate.now()
        val todayDow = today.dayOfWeek.value % 7   // 0=Sun … 6=Sat
        val weekStart = today.minusDays(todayDow.toLong())
        val fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd")
        val dowNames = arrayOf("일", "월", "화", "수", "목", "금", "토")

        for (i in 0..6) {
            val day = weekStart.plusDays(i.toLong())
            val dayStr = day.format(fmt)
            val isToday = day == today
            val hasTodo = todos.any { it.date == dayStr && !it.done }

            views.setTextViewText(DOW_IDS[i], dowNames[i])
            views.setTextViewText(DATE_IDS[i], day.dayOfMonth.toString())

            val dowColor = when (i) {
                0 -> 0xFFFF2D55.toInt()   // Sun = red
                6 -> 0xFF00FFE7.toInt()   // Sat = cyan
                else -> 0xFF8891B4.toInt()
            }
            views.setTextColor(DOW_IDS[i], dowColor)

            if (isToday) {
                views.setInt(DATE_IDS[i], "setBackgroundResource", R.drawable.widget_day_today_bg)
                views.setTextColor(DATE_IDS[i], 0xFF06070F.toInt())
            } else {
                views.setInt(DATE_IDS[i], "setBackgroundColor", Color.TRANSPARENT)
                views.setTextColor(DATE_IDS[i], 0xFFCDD6F4.toInt())
            }

            views.setViewVisibility(DOT_IDS[i], if (hasTodo) View.VISIBLE else View.INVISIBLE)
        }
    }

    private fun bindTodos(views: RemoteViews, todos: List<TodoItem>) {
        val today = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
        val todayTodos = todos.filter { it.date == today && !it.done }.take(4)

        for (i in 0..3) {
            if (i < todayTodos.size) {
                val todo = todayTodos[i]
                views.setViewVisibility(TODO_ROW_IDS[i], View.VISIBLE)
                views.setTextViewText(TODO_TITLE_IDS[i], todo.title)
                views.setTextViewText(
                    TODO_TIME_IDS[i],
                    if (todo.allDay) "종일" else todo.startTime.take(5)
                )
            } else {
                views.setViewVisibility(TODO_ROW_IDS[i], View.GONE)
            }
        }
    }
}
