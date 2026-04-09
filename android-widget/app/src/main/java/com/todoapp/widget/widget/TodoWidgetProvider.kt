package com.todoapp.widget.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.todoapp.widget.MainActivity
import com.todoapp.widget.R
import kotlinx.coroutines.*
import com.todoapp.widget.data.ApiSyncManager
import com.todoapp.widget.data.TodoDatabase
import java.time.LocalDate
import java.time.format.DateTimeFormatter

class TodoWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_TOGGLE_DONE = "com.todoapp.widget.ACTION_TOGGLE_DONE"
        const val ACTION_SYNC = "com.todoapp.widget.ACTION_SYNC"
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
        when (intent.action) {
            ACTION_TOGGLE_DONE -> {
                val id = intent.getIntExtra(EXTRA_TODO_ID, -1)
                val done = intent.getBooleanExtra(EXTRA_DONE, false)
                if (id != -1) {
                    CoroutineScope(Dispatchers.IO).launch {
                        val dao = TodoDatabase.getDatabase(context).todoDao()
                        dao.setDone(id, done)
                        refreshAll(context)
                    }
                }
            }
            ACTION_SYNC -> {
                CoroutineScope(Dispatchers.IO).launch {
                    refreshAll(context)
                }
            }
        }
    }

    private suspend fun refreshAll(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val provider = android.content.ComponentName(context, TodoWidgetProvider::class.java)
        val ids = manager.getAppWidgetIds(provider)
        ids.forEach { updateWidget(context, manager, it) }
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_layout)

        // Open TDL web app on click (whole widget + header)
        val openIntent = Intent(Intent.ACTION_VIEW, Uri.parse(com.todoapp.widget.BuildConfig.WEB_URL))
        val openPending = PendingIntent.getActivity(
            context, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, openPending)
        views.setOnClickPendingIntent(R.id.widget_header, openPending)

        // Refresh button → sync immediately
        val syncIntent = Intent(context, TodoWidgetProvider::class.java).apply {
            action = ACTION_SYNC
        }
        val syncPending = PendingIntent.getBroadcast(
            context, widgetId, syncIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_btn_refresh, syncPending)

        // Set up list service
        val serviceIntent = Intent(context, TodoWidgetService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        }
        views.setRemoteAdapter(R.id.widget_list, serviceIntent)
        views.setEmptyView(R.id.widget_list, R.id.widget_empty)

        // Item click → open TDL web app
        val itemPending = PendingIntent.getActivity(
            context, 1, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setPendingIntentTemplate(R.id.widget_list, itemPending)

        // Sync from API then update stats
        CoroutineScope(Dispatchers.IO).launch {
            // Fetch from web API if URL is configured
            ApiSyncManager.syncFromApi(context)

            val dao = TodoDatabase.getDatabase(context).todoDao()
            val total = dao.getCount()
            val done = dao.getDoneCount()
            val today = LocalDate.now().format(DateTimeFormatter.ofPattern("M월 d일"))

            val pct = if (total > 0) (done * 100 / total) else 0

            withContext(Dispatchers.Main) {
                views.setTextViewText(R.id.widget_title, today)
                views.setTextViewText(R.id.widget_progress, "$done/$total DONE")
                views.setProgressBar(R.id.widget_progress_bar, 100, pct, false)
                manager.updateAppWidget(widgetId, views)
                manager.notifyAppWidgetViewDataChanged(widgetId, R.id.widget_list)
            }
        }

        manager.updateAppWidget(widgetId, views)
    }
}
