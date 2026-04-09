package com.todoapp.widget.widget

import android.content.Intent
import android.widget.RemoteViews
import android.widget.RemoteViewsService

// Not used - widget now fetches directly from PWA API
class TodoWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return object : RemoteViewsFactory {
            override fun onCreate() {}
            override fun onDataSetChanged() {}
            override fun onDestroy() {}
            override fun getCount() = 0
            override fun getViewAt(position: Int) = RemoteViews(packageName, android.R.layout.simple_list_item_1)
            override fun getLoadingView(): RemoteViews? = null
            override fun getViewTypeCount() = 1
            override fun getItemId(position: Int) = position.toLong()
            override fun hasStableIds() = true
        }
    }
}
