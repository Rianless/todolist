package com.todoapp.widget.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.widget.RemoteViews
import com.todoapp.widget.R

/**
 * 북마크 바로가기 위젯. 웹앱에 저장한 북마크를 폴더별로 보여 주고, 누르면 바로 그 사이트를 연다.
 * 폴더는 ‹ › 단추로 넘긴다. (전체 → 폴더들 → 미분류 → 다시 전체)
 */
class BookmarkWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_FOLDER_PREV = "com.todoapp.widget.ACTION_BOOKMARK_FOLDER_PREV"
        const val ACTION_FOLDER_NEXT = "com.todoapp.widget.ACTION_BOOKMARK_FOLDER_NEXT"
        const val ACTION_REFRESH = "com.todoapp.widget.ACTION_BOOKMARK_REFRESH"

        const val PREFS = "bookmark_widget_prefs"
        private const val WEB_APP_URL = "https://todolist-liart-mu.vercel.app/"

        /** ‹ › 를 누른 횟수(앞으로 +1, 뒤로 -1). 보기 칸 번호는 서비스가 칸 수에 맞춰 돌려 계산한다. */
        fun offsetKey(widgetId: Int) = "folder_offset_$widgetId"

        /** 위젯이 놓인 모든 북마크 위젯의 목록을 다시 불러온다. */
        fun refreshAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, BookmarkWidgetProvider::class.java))
            ids.forEach { manager.notifyAppWidgetViewDataChanged(it, R.id.bookmark_list) }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        appWidgetIds.forEach { updateWidget(context, appWidgetManager, it) }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        super.onDeleted(context, appWidgetIds)
        val editor = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        appWidgetIds.forEach { editor.remove(offsetKey(it)) }
        editor.apply()
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return
        val manager = AppWidgetManager.getInstance(context)
        when (intent.action) {
            ACTION_FOLDER_PREV, ACTION_FOLDER_NEXT -> {
                val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                val delta = if (intent.action == ACTION_FOLDER_NEXT) 1 else -1
                prefs.edit().putInt(offsetKey(widgetId), prefs.getInt(offsetKey(widgetId), 0) + delta).apply()
                manager.notifyAppWidgetViewDataChanged(widgetId, R.id.bookmark_list)
            }
            ACTION_REFRESH -> manager.notifyAppWidgetViewDataChanged(widgetId, R.id.bookmark_list)
        }
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.bookmark_widget_layout)

        val serviceIntent = Intent(context, BookmarkWidgetService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            // 위젯마다 다른 주소를 줘서 어댑터가 위젯별로 따로 만들어지게 한다
            data = Uri.parse("todoapp://bookmarks/$widgetId")
        }
        views.setRemoteAdapter(R.id.bookmark_list, serviceIntent)
        views.setEmptyView(R.id.bookmark_list, R.id.bookmark_empty)

        // 항목을 누르면 서비스가 채워 준 주소(fill-in)를 브라우저로 연다
        val viewTemplate = Intent(Intent.ACTION_VIEW).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
        val templateFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        views.setPendingIntentTemplate(
            R.id.bookmark_list,
            PendingIntent.getActivity(context, widgetId, viewTemplate, templateFlags)
        )

        views.setOnClickPendingIntent(R.id.bookmark_folder_prev, broadcast(context, ACTION_FOLDER_PREV, widgetId, 0))
        views.setOnClickPendingIntent(R.id.bookmark_folder_next, broadcast(context, ACTION_FOLDER_NEXT, widgetId, 1))
        views.setOnClickPendingIntent(R.id.bookmark_refresh, broadcast(context, ACTION_REFRESH, widgetId, 2))
        views.setOnClickPendingIntent(
            R.id.bookmark_add,
            PendingIntent.getActivity(
                context, widgetId,
                Intent(Intent.ACTION_VIEW, Uri.parse(WEB_APP_URL)).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        )

        manager.updateAppWidget(widgetId, views)
        manager.notifyAppWidgetViewDataChanged(widgetId, R.id.bookmark_list)
    }

    /** 요청 번호가 위젯·동작마다 겹치지 않게 한다 (겹치면 다른 위젯의 단추를 덮어쓴다). */
    private fun broadcast(context: Context, action: String, widgetId: Int, slot: Int): PendingIntent {
        val intent = Intent(context, BookmarkWidgetProvider::class.java).apply {
            this.action = action
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            data = Uri.parse("todoapp://bookmark-action/$action/$widgetId")
        }
        return PendingIntent.getBroadcast(
            context, widgetId * 4 + slot, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
