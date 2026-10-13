package com.todoapp.widget.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.todoapp.widget.R
import com.todoapp.widget.data.Bookmark
import com.todoapp.widget.data.BookmarkData
import com.todoapp.widget.data.CloudStateClient
import com.todoapp.widget.data.FolderSlot
import com.todoapp.widget.data.bookmarkHost
import com.todoapp.widget.data.bookmarkLabel
import com.todoapp.widget.data.filterBookmarks
import com.todoapp.widget.data.folderSlots
import com.todoapp.widget.data.isOpenableBookmarkUrl
import com.todoapp.widget.data.wrapSlotIndex

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

    /** 마지막으로 성공해서 받은 데이터. 네트워크가 끊겨도 이걸로 계속 보여 준다. */
    private var data: BookmarkData? = null
    private var shown: List<Bookmark> = emptyList()

    override fun onCreate() {}

    override fun onDataSetChanged() {
        val fresh = CloudStateClient.fetchBookmarks()
        if (fresh != null) data = fresh
        val current = data ?: BookmarkData(emptyList(), emptyList())

        val slots = folderSlots(current.folders)
        val offset = context.getSharedPreferences(BookmarkWidgetProvider.PREFS, Context.MODE_PRIVATE)
            .getInt(BookmarkWidgetProvider.offsetKey(widgetId), 0)
        val slot = slots[wrapSlotIndex(offset, slots.size)]

        // 웹앱처럼 새로 저장한 것이 위로
        shown = filterBookmarks(current.bookmarks, current.folders, slot).reversed()
        pushHeader(slot, slots.size > 1, offline = fresh == null && data == null, hasStale = fresh == null && data != null)
    }

    /** 목록 위쪽의 폴더 이름·개수와 ‹ › 단추 표시를 갱신한다. (위젯 전체를 다시 그리지 않고 일부만) */
    private fun pushHeader(slot: FolderSlot, canSwitch: Boolean, offline: Boolean, hasStale: Boolean) {
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return
        val label = when {
            offline -> "연결 실패"
            else -> "${if (slot.isAll) "" else "📁 "}${slot.label} (${shown.size})${if (hasStale) " ⚠" else ""}"
        }
        val views = RemoteViews(context.packageName, R.layout.bookmark_widget_layout).apply {
            setTextViewText(R.id.bookmark_folder_label, label)
            val arrows = if (canSwitch) View.VISIBLE else View.INVISIBLE
            setViewVisibility(R.id.bookmark_folder_prev, arrows)
            setViewVisibility(R.id.bookmark_folder_next, arrows)
            setTextViewText(
                R.id.bookmark_empty,
                when {
                    offline -> "서버에 연결하지 못했어요\n⟳ 를 눌러 다시 시도하세요"
                    slot.isAll -> "저장한 북마크가 없어요\n웹앱에서 링크를 저장해 보세요"
                    else -> "이 폴더가 비어 있어요"
                }
            )
        }
        runCatching { AppWidgetManager.getInstance(context).partiallyUpdateAppWidget(widgetId, views) }
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
