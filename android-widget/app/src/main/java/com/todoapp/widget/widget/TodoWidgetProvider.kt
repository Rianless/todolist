package com.todoapp.widget.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.todoapp.widget.MainActivity
import com.todoapp.widget.R
import com.todoapp.widget.data.TodoDatabase
import com.todoapp.widget.ui.AddEditActivity
import kotlinx.coroutines.*
import java.time.LocalDate
import java.time.format.DateTimeFormatter

class TodoWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_WIDGET_CLICK = "com.todoapp.widget.ACTION_WIDGET_CLICK"
        const val EXTRA_TODO_ID = "extra_todo_id"
        const val EXTRA_DONE = "extra_done"
        const val EXTRA_CLICK_ACTION = "extra_click_action"
        const val CLICK_OPEN = "open"
        const val CLICK_TOGGLE = "toggle"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { updateWidget(context, appWidgetManager, it) }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_WIDGET_CLICK) {
            val clickAction = intent.getStringExtra(EXTRA_CLICK_ACTION)
            val id = intent.getIntExtra(EXTRA_TODO_ID, -1)
            when (clickAction) {
                CLICK_OPEN -> {
                    val openIntent = Intent(context, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    context.startActivity(openIntent)
                }
                CLICK_TOGGLE -> {
                    if (id != -1) {
                        val done = intent.getBooleanExtra(EXTRA_DONE, false)
                        CoroutineScope(Dispatchers.IO).launch {
                            val dao = TodoDatabase.getDatabase(context).todoDao()
                            dao.setDone(id, done)
                            val manager = AppWidgetManager.getInstance(context)
                            val provider = ComponentName(context, TodoWidgetProvider::class.java)
                            val ids = manager.getAppWidgetIds(provider)
                            ids.forEach { updateWidget(context, manager, it) }
                        }
                    }
                }
            }
        }
    }

    internal fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_layout)

        // 헤더 클릭 → 앱 열기
        val openAppIntent = Intent(context, MainActivity::class.java)
        val openAppPending = PendingIntent.getActivity(
            context, 0, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_header, openAppPending)

        // + 버튼 → 새 일정 추가
        val addIntent = Intent(context, AddEditActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        val addPending = PendingIntent.getActivity(
            context, 2, addIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_add_btn, addPending)

        // 리스트 아이템 클릭 템플릿 (broadcast → onReceive에서 분기)
        val clickTemplate = Intent(context, TodoWidgetProvider::class.java).apply {
            action = ACTION_WIDGET_CLICK
        }
        val templatePending = PendingIntent.getBroadcast(
            context, 3, clickTemplate,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        views.setPendingIntentTemplate(R.id.widget_list, templatePending)

        // 리스트 서비스 연결
        val serviceIntent = Intent(context, TodoWidgetService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        }
        views.setRemoteAdapter(R.id.widget_list, serviceIntent)
        views.setEmptyView(R.id.widget_list, R.id.widget_empty)

        // 날짜 / 완료 카운트 비동기 업데이트
        CoroutineScope(Dispatchers.IO).launch {
            val dao = TodoDatabase.getDatabase(context).todoDao()
            val total = dao.getCount()
            val done = dao.getDoneCount()
            val today = LocalDate.now().format(DateTimeFormatter.ofPattern("M월 d일"))
            withContext(Dispatchers.Main) {
                views.setTextViewText(R.id.widget_title, today)
                views.setTextViewText(R.id.widget_progress, "$done/$total 완료")
                manager.updateAppWidget(widgetId, views)
                manager.notifyAppWidgetViewDataChanged(widgetId, R.id.widget_list)
            }
        }

        manager.updateAppWidget(widgetId, views)
    }
}
