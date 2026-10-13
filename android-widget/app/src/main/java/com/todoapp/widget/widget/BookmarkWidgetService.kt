package com.todoapp.widget.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.todoapp.widget.R
import com.todoapp.widget.data.Bookmark
import com.todoapp.widget.data.bookmarkHost
import com.todoapp.widget.data.bookmarkLabel
import com.todoapp.widget.data.bookmarkView
import com.todoapp.widget.data.isOpenableBookmarkUrl

class BookmarkWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return BookmarkWidgetFactory(applicationContext, intent)
    }
}

class BookmarkWidgetFactory(
    private val context: Context,
    intent: Intent
) : RemoteViewsService.RemoteViewsFactory {

    private val widgetId: Int =
        intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)

    private var shown: List<Bookmark> = emptyList()

    override fun onCreate() {}

    /** 위젯 본체(provider)가 받아 둔 데이터로 목록을 만든다. 아직 없으면 여기서 한 번 받는다. */
    override fun onDataSetChanged() {
        BookmarkStore.ensureLoaded(context)
        val offset = context.getSharedPreferences(BookmarkWidgetProvider.PREFS, Context.MODE_PRIVATE)
            .getInt(BookmarkWidgetProvider.offsetKey(widgetId), 0)
        shown = bookmarkView(BookmarkStore.data, offset).items
    }

    override fun onDestroy() {}
    override fun getCount(): Int = shown.size

    override fun getViewAt(position: Int): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.bookmark_widget_item)
        val bookmark = shown.getOrNull(position) ?: return views

        val label = bookmarkLabel(bookmark)
        views.setTextViewText(R.id.bookmark_item_letter, label.take(1).uppercase())
        views.setTextViewText(R.id.bookmark_item_title, label)
        views.setTextViewText(R.id.bookmark_item_host, bookmarkHost(bookmark.url).ifEmpty { bookmark.url })

        // 주소가 http(s) 일 때만 연다. 아니면 눌러도 아무 일도 없다.
        val fill = Intent()
        if (isOpenableBookmarkUrl(bookmark.url)) fill.data = Uri.parse(bookmark.url.trim())
        views.setOnClickFillInIntent(R.id.bookmark_item_root, fill)
        return views
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 1
    override fun getItemId(position: Int): Long = shown.getOrNull(position)?.id?.toLong() ?: position.toLong()
    override fun hasStableIds(): Boolean = true
}
