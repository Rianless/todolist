package com.todoapp.widget.widget

import android.content.Context
import com.todoapp.widget.data.BookmarkData
import com.todoapp.widget.data.CloudStateClient
import com.todoapp.widget.data.bookmarkDataToJson
import com.todoapp.widget.data.parseBookmarkData
import org.json.JSONObject

/**
 * 북마크를 마지막으로 성공해서 받은 것. 위젯(헤더)과 목록 서비스가 같은 값을 보게 하고,
 * 네트워크가 끊겨도 마지막 목록을 계속 보여 주기 위해 들고 있는다.
 *
 * 메모리에만 두면 안 된다: 위젯만 있을 때 안드로이드는 앱 프로세스를 자주 끝내고, ‹ › 단추를 누르면 빈 메모리로
 * 새로 시작한다. 그래서 받을 때마다 기기에도 저장해 두고([restore]) 새 프로세스는 거기서 바로 읽는다.
 */
object BookmarkStore {
    private const val PREFS = "bookmark_cache_prefs"
    private const val KEY_STATE = "state_json"

    @Volatile
    var data: BookmarkData? = null
        private set

    /** 마지막 시도가 실패했는가 (그래서 [data] 가 오래된 것일 수 있다) */
    @Volatile
    var stale: Boolean = false
        private set

    /** 메모리가 비어 있으면(프로세스가 새로 떴으면) 마지막으로 저장해 둔 목록을 읽어 온다. 네트워크는 쓰지 않는다. */
    @Synchronized
    fun restore(context: Context) {
        if (data != null) return
        val raw = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_STATE, null) ?: return
        data = runCatching { parseBookmarkData(JSONObject(raw)) }.getOrNull()
    }

    /** 서버에서 새로 받는다. 성공하면 true(기기에도 저장). 실패해도 이전 데이터는 남는다. */
    @Synchronized
    fun refresh(context: Context): Boolean {
        val fresh = CloudStateClient.fetchBookmarks()
        if (fresh != null) {
            data = fresh
            stale = false
            runCatching {
                context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                    .putString(KEY_STATE, bookmarkDataToJson(fresh).toString()).apply()
            }
        } else {
            stale = true
        }
        return fresh != null
    }

    /** 저장해 둔 것도 없을 때만 한 번 받아 온다. (프로세스가 새로 떠서 목록만 먼저 요청된 경우) */
    fun ensureLoaded(context: Context) {
        restore(context)
        if (data == null) refresh(context)
    }
}
