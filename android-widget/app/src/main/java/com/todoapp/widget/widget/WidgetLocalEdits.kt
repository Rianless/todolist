package com.todoapp.widget.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.todoapp.widget.R
import java.util.concurrent.ConcurrentHashMap

/**
 * 팝업에서 완료 · 삭제를 눌렀을 때 서버 저장을 기다리지 않고 위젯 목록에 바로 보여 주기 위한 임시 반영.
 * 서버 저장이 끝나면 [finish] 로 지우고 위젯을 서버 내용으로 다시 그린다.
 */
object WidgetLocalEdits {
    private val done = ConcurrentHashMap<Int, Boolean>()
    private val deleted = ConcurrentHashMap.newKeySet<Int>()

    /** 마지막으로 그린 날짜별 목록 (서버 없이 바로 다시 그릴 때 쓴다) */
    private val snapshots = ConcurrentHashMap<String, List<TodoItem>>()

    /** 이 시각 전에는 서버를 다시 부르지 않고 스냅샷으로 목록을 그린다 */
    @Volatile private var localUntil = 0L

    fun remember(date: String, items: List<TodoItem>) { snapshots[date] = items }

    fun snapshot(date: String): List<TodoItem>? =
        if (System.currentTimeMillis() < localUntil) snapshots[date] else null

    fun setDone(context: Context, id: Int, value: Boolean) {
        done[id] = value
        redrawNow(context)
    }

    fun delete(context: Context, id: Int) {
        deleted.add(id)
        redrawNow(context)
    }

    /** 서버 저장이 끝났다 (성공/실패 모두): 임시 반영을 지우고 서버 내용으로 다시 그린다. */
    fun finish(context: Context, id: Int) {
        done.remove(id)
        deleted.remove(id)
        localUntil = 0L
        TodoWidgetProvider.refreshAllWidgets(context)
    }

    fun apply(items: List<TodoItem>): List<TodoItem> {
        if (done.isEmpty() && deleted.isEmpty()) return items
        return items.filter { it.id !in deleted }.map { item ->
            done[item.id]?.let { item.copy(done = it) } ?: item
        }
    }

    private fun redrawNow(context: Context) {
        localUntil = System.currentTimeMillis() + 2000L
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, TodoWidgetProvider::class.java))
        manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_list)
    }
}
