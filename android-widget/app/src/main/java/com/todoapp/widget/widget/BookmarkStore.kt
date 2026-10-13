package com.todoapp.widget.widget

import com.todoapp.widget.data.BookmarkData
import com.todoapp.widget.data.CloudStateClient

/**
 * 북마크를 마지막으로 성공해서 받은 것. 위젯(헤더)과 목록 서비스가 같은 값을 보게 하고,
 * 네트워크가 끊겨도 마지막 목록을 계속 보여 주기 위해 프로세스 안에 들고 있는다.
 */
object BookmarkStore {
    @Volatile
    var data: BookmarkData? = null
        private set

    /** 마지막 시도가 실패했는가 (그래서 [data] 가 오래된 것일 수 있다) */
    @Volatile
    var stale: Boolean = false
        private set

    /** 서버에서 새로 받는다. 성공하면 true. 실패해도 이전 데이터는 남는다. */
    @Synchronized
    fun refresh(): Boolean {
        val fresh = CloudStateClient.fetchBookmarks()
        if (fresh != null) {
            data = fresh
            stale = false
        } else {
            stale = true
        }
        return fresh != null
    }

    /** 데이터가 아직 없을 때만 한 번 받아 온다. (프로세스가 새로 떠서 목록만 먼저 요청된 경우) */
    fun ensureLoaded() {
        if (data == null) refresh()
    }
}
