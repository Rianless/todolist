package com.todoapp.widget.data

import org.json.JSONArray
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

/** [parseBookmarkData] 가 읽는 것과 같은 모양으로 되돌린다. (마지막으로 받은 목록을 기기에 저장해 둘 때 쓴다) */
fun bookmarkDataToJson(data: BookmarkData): JSONObject {
    val folders = JSONArray()
    data.folders.forEach { folders.put(JSONObject().put("id", it.id).put("name", it.name)) }
    val bookmarks = JSONArray()
    data.bookmarks.forEach { b ->
        val o = JSONObject().put("id", b.id).put("url", b.url).put("title", b.title)
        if (b.folderId != null) o.put("folderId", b.folderId)
        bookmarks.put(o)
    }
    return JSONObject().put("bookmarkFolders", folders).put("bookmarks", bookmarks)
}
