package com.todoapp.widget.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import com.todoapp.widget.MainActivity
import com.todoapp.widget.R
import com.todoapp.widget.data.Todo
import com.todoapp.widget.data.TodoDatabase
import kotlinx.coroutines.*
import java.time.LocalDate
import java.time.format.DateTimeFormatter

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
        val DOW_LABELS = arrayOf("일", "월", "화", "수", "목", "금", "토")
        val CYAN = Color.parseColor("#00FFE7")
        val RED = Color.parseColor("#FF2D55")
        val DIM = Color.parseColor("#4A4F72")
        val TEXT2 = Color.parseColor("#8891B4")
        val BG_DARK = Color.parseColor("#06070F")
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        appWidgetIds.forEach { updateWidget(context, appWidgetManager, it) }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_layout)

        val openIntent = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_header, openIntent)

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val dao = TodoDatabase.getDatabase(context).todoDao()
                val today = LocalDate.now()

                // Week: Sun–Sat
                val sundayOffset = (today.dayOfWeek.value % 7).toLong()
                val weekStart = today.minusDays(sundayOffset)
                val weekDates = (0..6).map { weekStart.plusDays(it.toLong()) }

                // Todos per day
                val todosPerDay = weekDates.map { date ->
                    dao.getTodosByDateSync(date.format(DateTimeFormatter.ISO_LOCAL_DATE))
                }

                // Today's todos (sorted: undone first)
                val todayStr = today.format(DateTimeFormatter.ISO_LOCAL_DATE)
                val todayTodos = dao.getTodosByDateSync(todayStr)
                    .sortedBy { it.done }

                withContext(Dispatchers.Main) {
                    // Month / Year header
                    views.setTextViewText(R.id.widget_month, "${today.monthValue}월")
                    views.setTextViewText(R.id.widget_year, "${today.year}")

                    val weekEnd = weekStart.plusDays(6)
                    val rangeText = "${weekStart.monthValue}/${weekStart.dayOfMonth}–${weekEnd.dayOfMonth}"
                    views.setTextViewText(R.id.widget_week_range, rangeText)

                    // Week strip
                    weekDates.forEachIndexed { i, date ->
                        val isToday = date == today
                        val isSun = i == 0
                        val isSat = i == 6

                        // DOW label color
                        views.setTextColor(DOW_IDS[i], when {
                            isToday -> CYAN
                            isSun -> RED
                            isSat -> CYAN
                            else -> DIM
                        })

                        // Day number
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

                        // Event dot
                        val dayTodos = todosPerDay[i]
                        val hasTodos = dayTodos.isNotEmpty()
                        views.setViewVisibility(DOT_IDS[i], if (hasTodos) View.VISIBLE else View.INVISIBLE)
                        if (hasTodos) {
                            val dotColor = if (isToday) "#FFFFFF99"
                            else dayTodos.firstOrNull()?.categoryColor ?: "#00FFE7"
                            try {
                                views.setTextColor(DOT_IDS[i], Color.parseColor(dotColor))
                            } catch (e: Exception) {
                                views.setTextColor(DOT_IDS[i], CYAN)
                            }
                        }
                    }

                    // Today label
                    val dayNames = arrayOf("일", "월", "화", "수", "목", "금", "토")
                    val todayDow = dayNames[today.dayOfWeek.value % 7]
                    views.setTextViewText(R.id.widget_today_label, "${today.monthValue}월 ${today.dayOfMonth}일 ($todayDow)")

                    // Today's todo items
                    populateTodos(views, todayTodos)

                    manager.updateAppWidget(widgetId, views)
                }
            } catch (e: Exception) {
                // On error, still show the week strip with placeholder text
                withContext(Dispatchers.Main) {
                    val today = LocalDate.now()
                    views.setTextViewText(R.id.widget_month, "${today.monthValue}월")
                    views.setTextViewText(R.id.widget_year, "${today.year}")
                    views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
                    manager.updateAppWidget(widgetId, views)
                }
            }
        }

        manager.updateAppWidget(widgetId, views)
    }

    private fun populateTodos(views: RemoteViews, todos: List<Todo>) {
        val maxItems = ITEM_IDS.size
        val shown = todos.take(maxItems)

        // Show/hide items
        shown.forEachIndexed { i, todo ->
            views.setViewVisibility(ITEM_IDS[i], View.VISIBLE)
            views.setTextViewText(ITEM_TITLE_IDS[i], todo.title)

            val timeStr = when {
                todo.allDay -> "하루종일"
                todo.startTime.isNotEmpty() -> "${todo.startTime}${if (todo.endTime.isNotEmpty()) "–${todo.endTime}" else ""}"
                else -> ""
            }
            views.setTextViewText(ITEM_TIME_IDS[i], timeStr)

            val barColor = try {
                Color.parseColor(todo.categoryColor)
            } catch (e: Exception) {
                CYAN
            }
            views.setInt(ITEM_BAR_IDS[i], "setBackgroundColor", barColor)

            // Done items: dimmed title
            val titleColor = if (todo.done) Color.parseColor("#606080") else Color.parseColor("#E0FFFFFF")
            views.setTextColor(ITEM_TITLE_IDS[i], titleColor)
        }

        // Hide unused slots
        for (i in shown.size until maxItems) {
            views.setViewVisibility(ITEM_IDS[i], View.GONE)
        }

        // More indicator
        if (todos.size > maxItems) {
            views.setViewVisibility(R.id.widget_more, View.VISIBLE)
            views.setTextViewText(R.id.widget_more, "+${todos.size - maxItems}개 더")
        } else {
            views.setViewVisibility(R.id.widget_more, View.GONE)
        }

        // Empty state
        views.setViewVisibility(R.id.widget_empty, if (todos.isEmpty()) View.VISIBLE else View.GONE)
    }
}
