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

/** 위젯이 지금 보여 줄 내용: 선택된 보기 칸, 목록(최신순), ‹ › 를 쓸 수 있는지. */
data class BookmarkView(
    val slot: FolderSlot,
    val items: List<Bookmark>,
    val canSwitch: Boolean
)

/** [data] 가 null 이면 아직 한 번도 못 받은 것. [offset] 은 ‹ › 를 누른 횟수. */
fun bookmarkView(data: BookmarkData?, offset: Int): BookmarkView {
    val current = data ?: BookmarkData(emptyList(), emptyList())
    val slots = folderSlots(current.folders)
    val slot = slots[wrapSlotIndex(offset, slots.size)]
    // 웹앱처럼 새로 저장한 것이 위로
    return BookmarkView(slot, filterBookmarks(current.bookmarks, current.folders, slot).reversed(), slots.size > 1)
}

/** 폴더 줄에 쓸 글: `📁 업무 (3)`. 한 번도 못 받았으면 `연결 실패`, 이전 목록을 쓰는 중이면 끝에 ⚠. */
fun bookmarkHeaderLabel(view: BookmarkView, neverLoaded: Boolean, stale: Boolean): String {
    if (neverLoaded) return "연결 실패"
    val icon = if (view.slot.isAll) "" else "📁 "
    return "$icon${view.slot.label} (${view.items.size})${if (stale) " ⚠" else ""}"
}

/** 목록이 비었을 때 보여 줄 글. */
fun bookmarkEmptyText(view: BookmarkView, neverLoaded: Boolean): String = when {
    neverLoaded -> "서버에 연결하지 못했어요\n⟳ 를 눌러 다시 시도하세요"
    view.slot.isAll -> "저장한 북마크가 없어요\n웹앱에서 링크를 저장해 보세요"
    else -> "이 폴더가 비어 있어요"
}
