package com.todoapp.widget

import com.todoapp.widget.data.applyItemOrder
import org.junit.Assert.assertEquals
import org.junit.Test

class ItemOrderTest {
    private fun order(items: List<Int>, saved: List<String>) = applyItemOrder(items, saved) { it.toString() }

    @Test fun noSavedOrderKeepsTimeOrder() {
        assertEquals(listOf(1, 2, 3), order(listOf(1, 2, 3), emptyList()))
    }

    @Test fun savedOrderIsApplied() {
        assertEquals(listOf(3, 1, 2), order(listOf(1, 2, 3), listOf("3", "1", "2")))
    }

    @Test fun newItemsComeLastInTheirOriginalOrder() {
        assertEquals(listOf(3, 1, 2, 5, 4), order(listOf(1, 2, 3, 5, 4), listOf("3", "1", "2")))
    }

    @Test fun deletedIdsInSavedOrderAreIgnored() {
        assertEquals(listOf(2, 1), order(listOf(1, 2), listOf("9", "2", "8", "1")))
    }

    @Test fun duplicateIdsInSavedOrderUseTheFirstPosition() {
        assertEquals(listOf(2, 1), order(listOf(1, 2), listOf("2", "1", "2")))
    }
}
