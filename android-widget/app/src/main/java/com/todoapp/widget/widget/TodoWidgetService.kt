package com.todoapp.widget.widget

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.todoapp.widget.R
import com.todoapp.widget.data.Todo
import com.todoapp.widget.data.TodoDatabase
import com.todoapp.widget.widget.TodoWidgetProvider.Companion.CLICK_OPEN
import com.todoapp.widget.widget.TodoWidgetProvider.Companion.CLICK_TOGGLE
import com.todoapp.widget.widget.TodoWidgetProvider.Companion.EXTRA_CLICK_ACTION
import com.todoapp.widget.widget.TodoWidgetProvider.Companion.EXTRA_DONE
import com.todoapp.widget.widget.TodoWidgetProvider.Companion.EXTRA_TODO_ID
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
            todos = dao.getUpcomingTodos(today, 10)
        }
    }

    override fun onDestroy() {}
    override fun getCount(): Int = todos.size

    override fun getViewAt(position: Int): RemoteViews {
        val todo = todos[position]
        val views = RemoteViews(context.packageName, R.layout.widget_item)

        // 카테고리 색상 바
        try {
            views.setInt(R.id.widget_item_accent, "setBackgroundColor", Color.parseColor(todo.categoryColor))
        } catch (e: Exception) {
            views.setInt(R.id.widget_item_accent, "setBackgroundColor", Color.parseColor("#636366"))
        }

        // 제목 (완료 시 반투명)
        views.setTextViewText(R.id.widget_item_title, todo.title)
        views.setFloat(R.id.widget_item_title, "setAlpha", if (todo.done) 0.45f else 1f)

        // 카테고리
        views.setTextViewText(R.id.widget_item_category, todo.category)

        // 시간
        val timeStr = when {
            todo.allDay -> "하루종일"
            todo.startTime.isNotEmpty() -> "${todo.startTime}${if (todo.endTime.isNotEmpty()) "\u2013${todo.endTime}" else ""}"
            else -> todo.date
        }
        views.setTextViewText(R.id.widget_item_time, timeStr)

        // 체크 표시 및 배경
        views.setTextViewText(R.id.widget_item_check, if (todo.done) "✓" else "")
        views.setInt(
            R.id.widget_item_check, "setBackgroundResource",
            if (todo.done) R.drawable.bg_check_done else R.drawable.bg_check_empty
        )

        // 콘텐츠 영역 클릭 → 앱 열기
        val openFillIn = Intent().apply {
            putExtra(EXTRA_CLICK_ACTION, CLICK_OPEN)
            putExtra(EXTRA_TODO_ID, todo.id)
        }
        views.setOnClickFillInIntent(R.id.widget_item_content, openFillIn)

        // 체크 버튼 클릭 → 완료 토글
        val toggleFillIn = Intent().apply {
            putExtra(EXTRA_CLICK_ACTION, CLICK_TOGGLE)
            putExtra(EXTRA_TODO_ID, todo.id)
            putExtra(EXTRA_DONE, !todo.done)
        }
        views.setOnClickFillInIntent(R.id.widget_item_check, toggleFillIn)

        return views
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 1
    override fun getItemId(position: Int): Long = todos[position].id.toLong()
    override fun hasStableIds(): Boolean = true
}
