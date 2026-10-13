package com.todoapp.widget

import com.todoapp.widget.data.Bookmark
import com.todoapp.widget.data.BookmarkFolder
import com.todoapp.widget.data.bookmarkFolderIdOf
import com.todoapp.widget.data.bookmarkHost
import com.todoapp.widget.data.bookmarkLabel
import com.todoapp.widget.data.filterBookmarks
import com.todoapp.widget.data.folderSlots
import com.todoapp.widget.data.isOpenableBookmarkUrl
import com.todoapp.widget.data.wrapSlotIndex
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class BookmarkTest {
    private val folders = listOf(BookmarkFolder(1, "업무"), BookmarkFolder(2, "쇼핑"))
    private val list = listOf(
        Bookmark(1, "https://a.com/", "", 1),
        Bookmark(2, "https://b.com/", "", 2),
        Bookmark(3, "https://c.com/", "", null),
        Bookmark(4, "https://d.com/", "", 99) // 지워진 폴더
    )

    @Test fun hostStripsSchemeWwwPathAndPort() {
        assertEquals("example.com", bookmarkHost("https://www.example.com/a?b=1"))
        assertEquals("example.com", bookmarkHost("http://example.com:8080/x#y"))
        assertEquals("example.com", bookmarkHost("https://user:pw@example.com/"))
        assertEquals("localhost", bookmarkHost("http://localhost:3000"))
    }

    @Test fun labelPrefersTitleThenHostThenUrl() {
        assertEquals("내 사이트", bookmarkLabel(Bookmark(1, "https://example.com", " 내 사이트 ", null)))
        assertEquals("example.com", bookmarkLabel(Bookmark(1, "https://www.example.com/x", "", null)))
        assertEquals("???", bookmarkLabel(Bookmark(1, "???", "", null)))
    }

    @Test fun onlyHttpAndHttpsAreOpenable() {
        assertTrue(isOpenableBookmarkUrl("https://example.com"))
        assertTrue(isOpenableBookmarkUrl("HTTP://example.com"))
        assertFalse(isOpenableBookmarkUrl("javascript:alert(1)"))
        assertFalse(isOpenableBookmarkUrl("data:text/html,hi"))
        assertFalse(isOpenableBookmarkUrl("example.com"))
    }

    @Test fun slotsAreAllFoldersThenUnfiled() {
        assertEquals(listOf("전체"), folderSlots(emptyList()).map { it.label })
        assertEquals(listOf("전체", "업무", "쇼핑", "미분류"), folderSlots(folders).map { it.label })
    }

    @Test fun filterByFolder() {
        val slots = folderSlots(folders)
        fun ids(i: Int) = filterBookmarks(list, folders, slots[i]).map { it.id }
        assertEquals(listOf(1, 2, 3, 4), ids(0))
        assertEquals(listOf(1), ids(1))
        assertEquals(listOf(2), ids(2))
        assertEquals(listOf(3, 4), ids(3)) // 폴더가 없어진 북마크(4)는 미분류
    }

    @Test fun deletedFolderCountsAsUnfiled() {
        assertNull(bookmarkFolderIdOf(list[3], folders))
        assertEquals(1, bookmarkFolderIdOf(list[0], folders))
    }

    @Test fun slotIndexWrapsAround() {
        assertEquals(0, wrapSlotIndex(0, 4))
        assertEquals(1, wrapSlotIndex(5, 4))
        assertEquals(3, wrapSlotIndex(-1, 4))
        assertEquals(2, wrapSlotIndex(-6, 4))
        assertEquals(0, wrapSlotIndex(7, 1))
        assertEquals(0, wrapSlotIndex(3, 0))
    }
}
