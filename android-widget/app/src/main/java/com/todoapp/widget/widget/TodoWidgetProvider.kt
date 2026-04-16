package com.todoapp.widget.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.todoapp.widget.MainActivity
import com.todoapp.widget.R
import kotlinx.coroutines.*
import com.todoapp.widget.data.TodoDatabase
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter

class TodoWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_TOGGLE_DONE = "com.todoapp.widget.ACTION_TOGGLE_DONE"
        const val EXTRA_TODO_ID = "extra_todo_id"
        const val EXTRA_DONE = "extra_done"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { widgetId ->
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_TOGGLE_DONE) {
            val id = intent.getIntExtra(EXTRA_TODO_ID, -1)
            val done = intent.getBooleanExtra(EXTRA_DONE, false)
            if (id != -1) {
                CoroutineScope(Dispatchers.IO).launch {
                    val dao = TodoDatabase.getDatabase(context).todoDao()
                    dao.setDone(id, done)
                    val manager = AppWidgetManager.getInstance(context)
                    val provider = android.content.ComponentName(context, TodoWidgetProvider::class.java)
                    val ids = manager.getAppWidgetIds(provider)
                    ids.forEach { updateWidget(context, manager, it) }
                }
            }
        }
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_layout)

        // Open app on header click
        val openAppIntent = Intent(context, MainActivity::class.java)
        val openAppPending = PendingIntent.getActivity(
            context, 0, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_header, openAppPending)

        // Set up list service
        val serviceIntent = Intent(context, TodoWidgetService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        }
        views.setRemoteAdapter(R.id.widget_list, serviceIntent)
        views.setEmptyView(R.id.widget_list, R.id.widget_empty)

        // Item click → open app
        val itemIntent = Intent(context, MainActivity::class.java)
        val itemPending = PendingIntent.getActivity(
            context, 1, itemIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setPendingIntentTemplate(R.id.widget_list, itemPending)

        // Update stats async
        CoroutineScope(Dispatchers.IO).launch {
            val dao = TodoDatabase.getDatabase(context).todoDao()
            val today = LocalDate.now()
            val monday = today.with(DayOfWeek.MONDAY)
            val sunday = today.with(DayOfWeek.SUNDAY)
            val startDate = monday.format(DateTimeFormatter.ISO_LOCAL_DATE)
            val endDate = sunday.format(DateTimeFormatter.ISO_LOCAL_DATE)
            val total = dao.getWeeklyCount(startDate, endDate)
            val done = dao.getWeeklyDoneCount(startDate, endDate)
            val weekRange = "${monday.format(DateTimeFormatter.ofPattern("M/d"))}–${sunday.format(DateTimeFormatter.ofPattern("M/d"))}"

            withContext(Dispatchers.Main) {
                views.setTextViewText(R.id.widget_title, "이번 주  $weekRange")
                views.setTextViewText(R.id.widget_progress, "$done/$total 완료")
                manager.updateAppWidget(widgetId, views)
                manager.notifyAppWidgetViewDataChanged(widgetId, R.id.widget_list)
            }
        }

        manager.updateAppWidget(widgetId, views)
    }
}
