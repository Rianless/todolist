package com.todoapp.widget.ui

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.todoapp.widget.R
import com.todoapp.widget.data.Todo
import com.todoapp.widget.data.TodoDatabase
import com.todoapp.widget.widget.TodoWidgetProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.format.DateTimeFormatter

class TodoDetailPopupActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_TODO_ID = "extra_todo_id"
    }

    private var currentTodo: Todo? = null
    private var currentDialog: AlertDialog? = null

    private val editLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            refreshWidget()
            // Reload and re-show dialog with updated data
            val id = currentTodo?.id ?: return@registerForActivityResult
            loadAndShow(id)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val todoId = intent.getIntExtra(EXTRA_TODO_ID, -1)
        if (todoId == -1) { finish(); return }

        loadAndShow(todoId)
    }

    private fun loadAndShow(id: Int) {
        lifecycleScope.launch {
            val todo = withContext(Dispatchers.IO) {
                TodoDatabase.getDatabase(this@TodoDetailPopupActivity).todoDao().getTodoById(id)
            }
            if (todo == null) { finish(); return@launch }
            currentTodo = todo
            currentDialog?.dismiss()
            showDialog(todo)
        }
    }

    private fun showDialog(todo: Todo) {
        val view = layoutInflater.inflate(R.layout.dialog_todo_detail, null)

        // Accent color bar
        val accentBar = view.findViewById<View>(R.id.dialog_accent_bar)
        try {
            accentBar.setBackgroundColor(Color.parseColor(todo.categoryColor))
        } catch (e: Exception) {
            accentBar.setBackgroundColor(Color.parseColor("#636366"))
        }

        // Category
        view.findViewById<TextView>(R.id.dialog_category).text = todo.category

        // Title
        val titleView = view.findViewById<TextView>(R.id.dialog_title)
        titleView.text = todo.title
        titleView.alpha = if (todo.done) 0.45f else 1f

        // Date
        val dateView = view.findViewById<TextView>(R.id.dialog_date)
        try {
            val parsed = LocalDate.parse(todo.date, DateTimeFormatter.ISO_LOCAL_DATE)
            dateView.text = parsed.format(DateTimeFormatter.ofPattern("yyyy년 M월 d일 (E)"))
        } catch (e: Exception) {
            dateView.text = todo.date
        }

        // Time
        view.findViewById<TextView>(R.id.dialog_time).text = when {
            todo.allDay -> "하루종일"
            todo.startTime.isNotEmpty() ->
                "${todo.startTime}${if (todo.endTime.isNotEmpty()) " – ${todo.endTime}" else ""}"
            else -> "시간 미설정"
        }

        // Optional rows
        setRow(view, R.id.dialog_row_module, R.id.dialog_module, todo.module)
        setRow(view, R.id.dialog_row_instructor, R.id.dialog_instructor, todo.instructor)
        val location = listOf(todo.location, todo.room).filter { it.isNotEmpty() }.joinToString(" ")
        setRow(view, R.id.dialog_row_location, R.id.dialog_location, location)
        setRow(view, R.id.dialog_row_note, R.id.dialog_note, todo.note)
        setRow(view, R.id.dialog_row_content, R.id.dialog_content, todo.content)

        val doneLabel = if (todo.done) "미완료로 변경" else "완료로 변경"

        currentDialog = MaterialAlertDialogBuilder(this)
            .setView(view)
            .setPositiveButton("편집") { _, _ ->
                val intent = Intent(this, AddEditActivity::class.java).apply {
                    putExtra(AddEditActivity.EXTRA_TODO_ID, todo.id)
                }
                editLauncher.launch(intent)
            }
            .setNeutralButton(doneLabel) { _, _ ->
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) {
                        TodoDatabase.getDatabase(this@TodoDetailPopupActivity)
                            .todoDao().setDone(todo.id, !todo.done)
                    }
                    refreshWidget()
                    finish()
                }
            }
            .setNegativeButton("닫기") { _, _ -> finish() }
            .setOnCancelListener { finish() }
            .show()
    }

    private fun setRow(root: View, rowId: Int, textId: Int, value: String) {
        val row = root.findViewById<View>(rowId)
        if (value.isNotEmpty()) {
            row.visibility = View.VISIBLE
            root.findViewById<TextView>(textId).text = value
        } else {
            row.visibility = View.GONE
        }
    }

    private fun refreshWidget() {
        val manager = AppWidgetManager.getInstance(this)
        val ids = manager.getAppWidgetIds(ComponentName(this, TodoWidgetProvider::class.java))
        sendBroadcast(Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        })
    }
}
