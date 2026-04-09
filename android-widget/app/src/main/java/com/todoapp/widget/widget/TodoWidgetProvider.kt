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
import com.todoapp.widget.data.ApiSyncManager
import com.todoapp.widget.data.Todo
import com.todoapp.widget.data.TodoDatabase
import java.time.LocalDate
import java.time.format.DateTimeFormatter

class TodoWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_SYNC = "com.todoapp.widget.ACTION_SYNC"

        // 행 ID 배열
        val ROW_IDS    = intArrayOf(R.id.row0, R.id.row1, R.id.row2, R.id.row3, R.id.row4, R.id.row5, R.id.row6)
        val ACCENT_IDS = intArrayOf(R.id.accent0, R.id.accent1, R.id.accent2, R.id.accent3, R.id.accent4, R.id.accent5, R.id.accent6)
        val CAT_IDS    = intArrayOf(R.id.cat0, R.id.cat1, R.id.cat2, R.id.cat3, R.id.cat4, R.id.cat5, R.id.cat6)
        val TIME_IDS   = intArrayOf(R.id.time0, R.id.time1, R.id.time2, R.id.time3, R.id.time4, R.id.time5, R.id.time6)
        val TITLE_IDS  = intArrayOf(R.id.title0, R.id.title1, R.id.title2, R.id.title3, R.id.title4, R.id.title5, R.id.title6)
        val DONE_IDS   = intArrayOf(R.id.done0, R.id.done1, R.id.done2, R.id.done3, R.id.done4, R.id.done5, R.id.done6)
        const val MAX_ROWS = 7
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        appWidgetIds.forEach { updateWidget(context, appWidgetManager, it) }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_SYNC) {
            val handler = CoroutineExceptionHandler { _, _ -> }
            CoroutineScope(Dispatchers.IO + handler).launch { refreshAll(context) }
        }
    }

    private suspend fun refreshAll(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val provider = android.content.ComponentName(context, TodoWidgetProvider::class.java)
        manager.getAppWidgetIds(provider).forEach { updateWidget(context, manager, it) }
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_layout)

        // 위젯 전체 / 헤더 클릭 → 웹앱 열기
        val openPending = PendingIntent.getActivity(
            context, 0,
            Intent(Intent.ACTION_VIEW, Uri.parse(com.todoapp.widget.BuildConfig.WEB_URL)),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, openPending)
        views.setOnClickPendingIntent(R.id.widget_header, openPending)

        // 새로고침 버튼
        val syncPending = PendingIntent.getBroadcast(
            context, widgetId,
            Intent(context, TodoWidgetProvider::class.java).apply { action = ACTION_SYNC },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_btn_refresh, syncPending)

        // 모든 행 숨기기
        ROW_IDS.forEach { views.setViewVisibility(it, View.GONE) }
        views.setViewVisibility(R.id.widget_empty, View.GONE)

        // 비동기: API 동기화 → DB 조회 → 행 채우기
        val handler = CoroutineExceptionHandler { _, _ -> /* 크래시 방지 */ }
        CoroutineScope(Dispatchers.IO + handler).launch {
            try {
                ApiSyncManager.syncFromApi(context)

                val dao = TodoDatabase.getDatabase(context).todoDao()
                val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
                val todos = dao.getUpcomingTodos(today, MAX_ROWS)
                val total = dao.getCount()
                val doneCount = dao.getDoneCount()
                val dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("M월 d일"))

                withContext(Dispatchers.Main) {
                    views.setTextViewText(R.id.widget_title, dateStr)
                    views.setTextViewText(R.id.widget_progress, "$doneCount/$total DONE")

                    if (todos.isEmpty()) {
                        views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
                    } else {
                        todos.forEachIndexed { i, todo ->
                            if (i >= MAX_ROWS) return@forEachIndexed
                            bindRow(views, i, todo)
                            views.setViewVisibility(ROW_IDS[i], View.VISIBLE)
                        }
                    }

                    manager.updateAppWidget(widgetId, views)
                }
            } catch (e: Exception) {
                // 어떤 예외도 프로세스 크래시 방지
                withContext(Dispatchers.Main) {
                    views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
                    manager.updateAppWidget(widgetId, views)
                }
            }
        }

        manager.updateAppWidget(widgetId, views)
    }

    private fun bindRow(views: RemoteViews, i: Int, todo: Todo) {
        val color = try { Color.parseColor(todo.categoryColor) } catch (e: Exception) { Color.parseColor("#4a4f72") }

        // 카테고리 색 바
        views.setInt(ACCENT_IDS[i], "setBackgroundColor", color)

        // 카테고리 [TAG]
        views.setTextViewText(CAT_IDS[i], "[${todo.category}]")
        views.setTextColor(CAT_IDS[i], color)

        // 시간
        val timeStr = when {
            todo.allDay -> "ALL DAY"
            todo.startTime.isNotEmpty() -> "${todo.startTime}${if (todo.endTime.isNotEmpty()) "-${todo.endTime}" else ""}"
            else -> todo.date
        }
        views.setTextViewText(TIME_IDS[i], timeStr)

        // 제목 (완료 시 투명도)
        views.setTextViewText(TITLE_IDS[i], todo.title)
        views.setFloat(TITLE_IDS[i], "setAlpha", if (todo.done) 0.4f else 1f)

        // 완료 체크
        views.setTextViewText(DONE_IDS[i], if (todo.done) "✓" else "")
        views.setInt(DONE_IDS[i], "setBackgroundResource",
            if (todo.done) R.drawable.bg_check_done else R.drawable.bg_widget_check)
    }
}
