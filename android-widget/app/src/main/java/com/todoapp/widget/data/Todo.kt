package com.todoapp.widget.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "todos")
data class Todo(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val date: String,          // "YYYY-MM-DD"
    val title: String,
    val startTime: String = "",
    val endTime: String = "",
    val allDay: Boolean = false,
    val category: String = "기타",
    val categoryColor: String = "#636366",  // hex color
    val module: String = "",
    val instructor: String = "",
    val location: String = "",
    val room: String = "",
    val note: String = "",
    val content: String = "",
    val done: Boolean = false
)
