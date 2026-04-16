package com.todoapp.widget.widget

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.todoapp.widget.R
import com.todoapp.widget.data.Todo
import com.todoapp.widget.data.TodoDatabase
import kotlinx.coroutines.runBlocking
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter

class TodoWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return TodoWidgetFactory(applicationContext, intent)
    }
}

class TodoWidgetFactory(
    private val context: Context,
    private val intent: Intent
) : RemoteViewsService.RemoteViewsFactory {

    private var todos: List<Todo> = emptyList()

    override fun onCreate() {}

    override fun onDataSetChanged() {
        runBlocking {
            val dao = TodoDatabase.getDatabase(context).todoDao()
            val today = LocalDate.now()
            val monday = today.with(DayOfWeek.MONDAY)
            val sunday = today.with(DayOfWeek.SUNDAY)
            val startDate = monday.format(DateTimeFormatter.ISO_LOCAL_DATE)
            val endDate = sunday.format(DateTimeFormatter.ISO_LOCAL_DATE)
            todos = dao.getWeeklyTodos(startDate, endDate)
        }
    }

    override fun onDestroy() {}

    override fun getCount(): Int = todos.size

    override fun getViewAt(position: Int): RemoteViews {
        val todo = todos[position]
        val views = RemoteViews(context.packageName, R.layout.widget_item)

        // Accent color bar
        try {
            views.setInt(R.id.widget_item_accent, "setBackgroundColor", Color.parseColor(todo.categoryColor))
        } catch (e: Exception) {
            views.setInt(R.id.widget_item_accent, "setBackgroundColor", Color.parseColor("#636366"))
        }

        // Title
        views.setTextViewText(R.id.widget_item_title, todo.title)
        views.setFloat(R.id.widget_item_title, "setAlpha", if (todo.done) 0.45f else 1f)

        // Day of week label
        val dayLabel = try {
            val date = LocalDate.parse(todo.date, DateTimeFormatter.ISO_LOCAL_DATE)
            when (date.dayOfWeek) {
                DayOfWeek.MONDAY -> "월"
                DayOfWeek.TUESDAY -> "화"
                DayOfWeek.WEDNESDAY -> "수"
                DayOfWeek.THURSDAY -> "목"
                DayOfWeek.FRIDAY -> "금"
                DayOfWeek.SATURDAY -> "토"
                DayOfWeek.SUNDAY -> "일"
            }
        } catch (e: Exception) { "" }

        // Time
        val timeStr = when {
            todo.allDay -> "$dayLabel · 하루종일"
            todo.startTime.isNotEmpty() -> "$dayLabel · ${todo.startTime}${if (todo.endTime.isNotEmpty()) "–${todo.endTime}" else ""}"
            else -> dayLabel
        }
        views.setTextViewText(R.id.widget_item_time, timeStr)

        // Category
        views.setTextViewText(R.id.widget_item_category, todo.category)

        // Done indicator
        views.setTextViewText(R.id.widget_item_check, if (todo.done) "✓" else "")

        // Fill-in intent for item click (just open app for now)
        val fillIntent = Intent()
        views.setOnClickFillInIntent(R.id.widget_item_root, fillIntent)

        return views
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 1
    override fun getItemId(position: Int): Long = todos[position].id.toLong()
    override fun hasStableIds(): Boolean = true
}
