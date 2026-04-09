package com.todoapp.widget.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import com.todoapp.widget.R
import kotlinx.coroutines.*
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private const val PWA_URL = "https://todolist-three-bice-59.vercel.app/"
private const val API_URL = "https://todolist-three-bice-59.vercel.app/api/todos"

data class ApiTodo(
    val id: Int,
    val date: String,
    val title: String,
    val startTime: String,
    val endTime: String,
    val allDay: Boolean,
    val category: String,
    val categoryColor: String,
    val done: Boolean
)

class TodoWidgetProvider : AppWidgetProvider() {

    companion object {
        val DOW_IDS = intArrayOf(
            R.id.widget_dow_0, R.id.widget_dow_1, R.id.widget_dow_2,
            R.id.widget_dow_3, R.id.widget_dow_4, R.id.widget_dow_5, R.id.widget_dow_6
        )
        val NUM_IDS = intArrayOf(
            R.id.widget_num_0, R.id.widget_num_1, R.id.widget_num_2,
            R.id.widget_num_3, R.id.widget_num_4, R.id.widget_num_5, R.id.widget_num_6
        )
        val DOT_IDS = intArrayOf(
            R.id.widget_dot_0, R.id.widget_dot_1, R.id.widget_dot_2,
            R.id.widget_dot_3, R.id.widget_dot_4, R.id.widget_dot_5, R.id.widget_dot_6
        )
        val ITEM_IDS = intArrayOf(
            R.id.widget_item_0, R.id.widget_item_1, R.id.widget_item_2, R.id.widget_item_3
        )
        val ITEM_BAR_IDS = intArrayOf(
            R.id.widget_item_0_bar, R.id.widget_item_1_bar,
            R.id.widget_item_2_bar, R.id.widget_item_3_bar
        )
        val ITEM_TITLE_IDS = intArrayOf(
            R.id.widget_item_0_title, R.id.widget_item_1_title,
            R.id.widget_item_2_title, R.id.widget_item_3_title
        )
        val ITEM_TIME_IDS = intArrayOf(
            R.id.widget_item_0_time, R.id.widget_item_1_time,
            R.id.widget_item_2_time, R.id.widget_item_3_time
        )
        val CYAN = Color.parseColor("#00FFE7")
        val RED = Color.parseColor("#FF2D55")
        val DIM = Color.parseColor("#4A4F72")
        val TEXT2 = Color.parseColor("#8891B4")
        val BG_DARK = Color.parseColor("#06070F")
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        appWidgetIds.forEach { updateWidget(context, appWidgetManager, it) }
    }

    private fun fetchTodos(): List<ApiTodo> {
        val conn = URL(API_URL).openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.connectTimeout = 8000
        conn.readTimeout = 8000
        return try {
            val json = conn.inputStream.bufferedReader().readText()
            val arr = JSONArray(json)
            (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                ApiTodo(
                    id = o.optInt("id", 0),
                    date = o.optString("date", ""),
                    title = o.optString("title", ""),
                    startTime = o.optString("start_time", ""),
                    endTime = o.optString("end_time", ""),
                    allDay = o.optBoolean("all_day", false),
                    category = o.optString("category", "기타"),
                    categoryColor = o.optString("category_color", "#636366"),
                    done = o.optBoolean("done", false)
                )
            }
        } catch (e: Exception) {
            emptyList()
        } finally {
            conn.disconnect()
        }
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_layout)

        // 탭 → PWA 열기
        val pwaIntent = Intent(Intent.ACTION_VIEW, Uri.parse(PWA_URL))
        val pwaPending = PendingIntent.getActivity(
            context, 0, pwaIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_header, pwaPending)

        manager.updateAppWidget(widgetId, views)

        CoroutineScope(Dispatchers.IO).launch {
            val allTodos = fetchTodos()
            val today = LocalDate.now()
            val todayStr = today.format(DateTimeFormatter.ISO_LOCAL_DATE)

            // 주간 스트립
            val sundayOffset = (today.dayOfWeek.value % 7).toLong()
            val weekStart = today.minusDays(sundayOffset)
            val weekDates = (0..6).map { weekStart.plusDays(it.toLong()) }

            val todosPerDay = weekDates.map { date ->
                val ds = date.format(DateTimeFormatter.ISO_LOCAL_DATE)
                allTodos.filter { it.date == ds }
            }
            val todayTodos = allTodos.filter { it.date == todayStr }.sortedBy { it.done }

            withContext(Dispatchers.Main) {
                // 헤더
                views.setTextViewText(R.id.widget_month, "${today.monthValue}월")
                views.setTextViewText(R.id.widget_year, "${today.year}")
                val weekEnd = weekStart.plusDays(6)
                views.setTextViewText(R.id.widget_week_range,
                    "${weekStart.monthValue}/${weekStart.dayOfMonth}–${weekEnd.dayOfMonth}")

                // 주간 스트립
                weekDates.forEachIndexed { i, date ->
                    val isToday = date == today
                    val isSun = i == 0
                    val isSat = i == 6

                    views.setTextColor(DOW_IDS[i], when {
                        isToday -> CYAN
                        isSun -> RED
                        isSat -> CYAN
                        else -> DIM
                    })

                    views.setTextViewText(NUM_IDS[i], date.dayOfMonth.toString())
                    if (isToday) {
                        views.setInt(NUM_IDS[i], "setBackgroundResource", R.drawable.widget_day_today)
                        views.setTextColor(NUM_IDS[i], BG_DARK)
                    } else {
                        views.setInt(NUM_IDS[i], "setBackgroundColor", Color.TRANSPARENT)
                        views.setTextColor(NUM_IDS[i], when {
                            isSun -> RED
                            isSat -> CYAN
                            else -> TEXT2
                        })
                    }

                    val dayTodos = todosPerDay[i]
                    views.setViewVisibility(DOT_IDS[i], if (dayTodos.isNotEmpty()) View.VISIBLE else View.INVISIBLE)
                    if (dayTodos.isNotEmpty()) {
                        val dotColor = if (isToday) "#FFFFFF99" else dayTodos.first().categoryColor
                        try {
                            views.setTextColor(DOT_IDS[i], Color.parseColor(dotColor))
                        } catch (e: Exception) {
                            views.setTextColor(DOT_IDS[i], CYAN)
                        }
                    }
                }

                // 오늘 레이블
                val dayNames = arrayOf("일", "월", "화", "수", "목", "금", "토")
                val dow = dayNames[today.dayOfWeek.value % 7]
                views.setTextViewText(R.id.widget_today_label, "${today.monthValue}월 ${today.dayOfMonth}일 ($dow)")

                // 오늘 할 일
                populateTodos(views, todayTodos)

                manager.updateAppWidget(widgetId, views)
            }
        }
    }

    private fun populateTodos(views: RemoteViews, todos: List<ApiTodo>) {
        val shown = todos.take(ITEM_IDS.size)
        shown.forEachIndexed { i, todo ->
            views.setViewVisibility(ITEM_IDS[i], View.VISIBLE)
            views.setTextViewText(ITEM_TITLE_IDS[i], todo.title)
            val timeStr = when {
                todo.allDay -> "하루종일"
                todo.startTime.isNotEmpty() -> "${todo.startTime}${if (todo.endTime.isNotEmpty()) "–${todo.endTime}" else ""}"
                else -> ""
            }
            views.setTextViewText(ITEM_TIME_IDS[i], timeStr)
            val barColor = try { Color.parseColor(todo.categoryColor) } catch (e: Exception) { CYAN }
            views.setInt(ITEM_BAR_IDS[i], "setBackgroundColor", barColor)
            val titleColor = if (todo.done) Color.parseColor("#606080") else Color.parseColor("#E0FFFFFF")
            views.setTextColor(ITEM_TITLE_IDS[i], titleColor)
        }
        for (i in shown.size until ITEM_IDS.size) {
            views.setViewVisibility(ITEM_IDS[i], View.GONE)
        }
        if (todos.size > ITEM_IDS.size) {
            views.setViewVisibility(R.id.widget_more, View.VISIBLE)
            views.setTextViewText(R.id.widget_more, "+${todos.size - ITEM_IDS.size}개 더")
        } else {
            views.setViewVisibility(R.id.widget_more, View.GONE)
        }
        views.setViewVisibility(R.id.widget_empty, if (todos.isEmpty()) View.VISIBLE else View.GONE)
    }
}
