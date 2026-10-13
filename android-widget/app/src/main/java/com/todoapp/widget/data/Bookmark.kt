package com.todoapp.widget.data

/** 웹앱 북마크 한 건 (`/api/state` 의 `bookmarks`). folderId 가 없으면 미분류. */
data class Bookmark(
    val id: Int,
    val url: String,
    val title: String,
    val folderId: Int?
)

/** 웹앱 북마크 폴더 (`/api/state` 의 `bookmarkFolders`). */
data class BookmarkFolder(
    val id: Int,
    val name: String
)

data class BookmarkData(
    val folders: List<BookmarkFolder>,
    val bookmarks: List<Bookmark>
)

/**
 * 위젯에서 고를 수 있는 보기: 전체 → 각 폴더 → 미분류.
 * 폴더가 하나도 없으면 "전체"만 있다.
 */
data class FolderSlot(
    val label: String,
    /** 이 폴더의 북마크만 보여 준다. 전체/미분류는 null */
    val folderId: Int?,
    val isAll: Boolean
)

/** 주소에서 도메인만 뽑는다. `https://www.example.com/a?b=1` → `example.com` */
fun bookmarkHost(url: String): String {
    val noScheme = url.trim().substringAfter("://", url.trim())
    val host = noScheme.substringBefore('/').substringBefore('?').substringBefore('#')
    return host.substringAfterLast('@').substringBefore(':').removePrefix("www.")
}

/** 목록에 보여 줄 이름: 제목 → 도메인 → 주소 순. (웹앱과 같은 규칙) */
fun bookmarkLabel(b: Bookmark): String =
    b.title.trim().ifEmpty { bookmarkHost(b.url) }.ifEmpty { b.url }

/** 열어도 되는 주소인가. `javascript:` 같은 건 열지 않는다. */
fun isOpenableBookmarkUrl(url: String): Boolean {
    val lower = url.trim().lowercase()
    return lower.startsWith("http://") || lower.startsWith("https://")
}

/** 북마크가 들어 있는 폴더 id. 폴더가 없어졌으면(다른 기기에서 삭제 등) 미분류(null)로 본다. */
fun bookmarkFolderIdOf(b: Bookmark, folders: List<BookmarkFolder>): Int? =
    b.folderId?.takeIf { id -> folders.any { it.id == id } }

fun folderSlots(folders: List<BookmarkFolder>): List<FolderSlot> {
    val slots = mutableListOf(FolderSlot("전체", null, true))
    folders.forEach { slots.add(FolderSlot(it.name, it.id, false)) }
    if (folders.isNotEmpty()) slots.add(FolderSlot("미분류", null, false))
    return slots
}

fun filterBookmarks(list: List<Bookmark>, folders: List<BookmarkFolder>, slot: FolderSlot): List<Bookmark> =
    if (slot.isAll) list else list.filter { bookmarkFolderIdOf(it, folders) == slot.folderId }

/** 위젯의 ‹ › 가 쌓아 둔 이동 횟수를 보기 칸 번호로 바꾼다. 음수·큰 값도 빙 돌아서 맞춘다. */
fun wrapSlotIndex(offset: Int, size: Int): Int =
    if (size <= 0) 0 else ((offset % size) + size) % size
