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
            val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
            // Show today's + upcoming todos (max 10)
            todos = dao.getUpcomingTodos(today, 10)
        }
    }

    override fun onDestroy() {}

    override fun getCount(): Int = todos.size

    override fun getViewAt(position: Int): RemoteViews {
        val todo = todos[position]
        val views = RemoteViews(context.packageName, R.layout.widget_item)

        // Accent color bar
        val accentColor = try {
            Color.parseColor(todo.categoryColor)
        } catch (e: Exception) {
            Color.parseColor("#4a4f72")
        }
        views.setInt(R.id.widget_item_accent, "setBackgroundColor", accentColor)

        // Item number: 01, 02, ...
        views.setTextViewText(R.id.widget_item_num, "%02d".format(position + 1))

        // Status glyph: ▶ active / ✓ done
        if (todo.done) {
            views.setTextViewText(R.id.widget_item_status, "✓")
            views.setTextColor(R.id.widget_item_status, Color.parseColor("#4a4f72"))
        } else {
            views.setTextViewText(R.id.widget_item_status, "▶")
            views.setTextColor(R.id.widget_item_status, accentColor)
        }

        // Title (dimmed if done)
        views.setTextViewText(R.id.widget_item_title, todo.title)
        views.setFloat(R.id.widget_item_title, "setAlpha", if (todo.done) 0.4f else 1f)

        // Time
        val timeStr = when {
            todo.allDay -> "ALL DAY"
            todo.startTime.isNotEmpty() -> "${todo.startTime}${if (todo.endTime.isNotEmpty()) "-${todo.endTime}" else ""}"
            else -> todo.date
        }
        views.setTextViewText(R.id.widget_item_time, timeStr)

        // Category as [TAG]
        views.setTextViewText(R.id.widget_item_category, "[${todo.category}]")
        views.setTextColor(R.id.widget_item_category, accentColor)

        // Check box
        views.setTextViewText(R.id.widget_item_check, if (todo.done) "✓" else "")
        if (todo.done) {
            views.setInt(R.id.widget_item_check, "setBackgroundResource", R.drawable.bg_check_done)
        } else {
            views.setInt(R.id.widget_item_check, "setBackgroundResource", R.drawable.bg_widget_check)
        }

        val fillIntent = Intent()
        views.setOnClickFillInIntent(R.id.widget_item_root, fillIntent)

        return views
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 1
    override fun getItemId(position: Int): Long = todos[position].id.toLong()
    override fun hasStableIds(): Boolean = true
}
