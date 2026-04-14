package com.todoapp.widget.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.RemoteViews
import com.todoapp.widget.MainActivity
import com.todoapp.widget.R
import com.todoapp.widget.ui.TodoPopupActivity
import kotlinx.coroutines.*
import com.todoapp.widget.data.TodoDatabase
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

        // [Task 1] Widget icon (+ button) and header click → open app
        val openAppIntent = Intent(context, MainActivity::class.java)
        val openAppPending = PendingIntent.getActivity(
            context, 0, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_header, openAppPending)
        views.setOnClickPendingIntent(R.id.widget_icon_btn, openAppPending)

        // Set up list service
        val serviceIntent = Intent(context, TodoWidgetService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        }
        views.setRemoteAdapter(R.id.widget_list, serviceIntent)
        views.setEmptyView(R.id.widget_list, R.id.widget_empty)

        // [Task 2] Item click → show popup (not open app)
        // FLAG_MUTABLE required on API 31+ so fill intents (todo_id) can be merged at click time
        val mutableFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
            PendingIntent.FLAG_MUTABLE else 0
        val popupIntent = Intent(context, TodoPopupActivity::class.java)
        val popupPending = PendingIntent.getActivity(
            context, 1, popupIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or mutableFlag
        )
        views.setPendingIntentTemplate(R.id.widget_list, popupPending)

        // Update stats async
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
