package com.todoapp.widget.ui

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.todoapp.widget.R
import com.todoapp.widget.data.TodoDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class TodoPopupActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_todo_popup)

        val todoId = intent.getIntExtra("todo_id", -1)
        if (todoId == -1) {
            finish()
            return
        }

        // Clicking the dim background dismisses the popup
        findViewById<View>(R.id.popup_root).setOnClickListener { finish() }

        // Clicking the card itself does nothing (prevents propagation to root)
        findViewById<View>(R.id.popup_card).setOnClickListener { }

        // Close button
        findViewById<TextView>(R.id.popup_close_btn).setOnClickListener { finish() }

        CoroutineScope(Dispatchers.IO).launch {
            val dao = TodoDatabase.getDatabase(this@TodoPopupActivity).todoDao()
            val todo = dao.getById(todoId)
            withContext(Dispatchers.Main) {
                if (todo == null) {
                    finish()
                    return@withContext
                }

                // Category color bar
                try {
                    findViewById<View>(R.id.popup_category_color)
                        .setBackgroundColor(Color.parseColor(todo.categoryColor))
                } catch (e: Exception) {
                    findViewById<View>(R.id.popup_category_color)
                        .setBackgroundColor(Color.parseColor("#636366"))
                }

                // Category label
                findViewById<TextView>(R.id.popup_category).text = todo.category

                // Title
                findViewById<TextView>(R.id.popup_title).text = todo.title

                // Date + time
                val timeStr = when {
                    todo.allDay -> "하루종일"
                    todo.startTime.isNotEmpty() ->
                        "${todo.startTime}${if (todo.endTime.isNotEmpty()) " – ${todo.endTime}" else ""}"
                    else -> ""
                }
                val dateTimeStr = buildString {
                    append(todo.date)
                    if (timeStr.isNotEmpty()) append("  $timeStr")
                }
                findViewById<TextView>(R.id.popup_datetime).text = dateTimeStr

                // Location / Room
                val locationParts = listOfNotNull(
                    todo.location.takeIf { it.isNotEmpty() },
                    todo.room.takeIf { it.isNotEmpty() }
                )
                val locationView = findViewById<TextView>(R.id.popup_location)
                if (locationParts.isNotEmpty()) {
                    locationView.text = locationParts.joinToString(" ")
                    locationView.visibility = View.VISIBLE
                } else {
                    locationView.visibility = View.GONE
                }

                // Module / Instructor
                val moduleStr = listOfNotNull(
                    todo.module.takeIf { it.isNotEmpty() },
                    todo.instructor.takeIf { it.isNotEmpty() }
                ).joinToString(" · ")
                val moduleView = findViewById<TextView>(R.id.popup_module)
                if (moduleStr.isNotEmpty()) {
                    moduleView.text = moduleStr
                    moduleView.visibility = View.VISIBLE
                } else {
                    moduleView.visibility = View.GONE
                }

                // Note / Content
                val detail = listOfNotNull(
                    todo.note.takeIf { it.isNotEmpty() },
                    todo.content.takeIf { it.isNotEmpty() }
                ).joinToString("\n")
                val noteView = findViewById<TextView>(R.id.popup_note)
                if (detail.isNotEmpty()) {
                    noteView.text = detail
                    noteView.visibility = View.VISIBLE
                } else {
                    noteView.visibility = View.GONE
                }
            }
        }
    }
}
