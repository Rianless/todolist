package com.todoapp.widget.data

import org.json.JSONObject

/** `/api/state` 의 data 에서 북마크와 폴더를 읽는다. 없는 필드는 빈 목록. */
fun parseBookmarkData(state: JSONObject): BookmarkData {
    val folders = mutableListOf<BookmarkFolder>()
    state.optJSONArray("bookmarkFolders")?.let { arr ->
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            if (!o.has("id")) continue
            folders.add(BookmarkFolder(o.optInt("id"), o.optString("name")))
        }
    }
    val bookmarks = mutableListOf<Bookmark>()
    state.optJSONArray("bookmarks")?.let { arr ->
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val url = o.optString("url")
            if (url.isEmpty() || !o.has("id")) continue
            val folderId = if (o.has("folderId") && !o.isNull("folderId")) o.optInt("folderId") else null
            bookmarks.add(Bookmark(o.optInt("id"), url, o.optString("title"), folderId))
        }
    }
    return BookmarkData(folders, bookmarks)
}
