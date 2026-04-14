package com.todoapp.widget.ui

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.todoapp.widget.R
import com.todoapp.widget.data.Todo
import com.todoapp.widget.data.TodoDatabase
import com.todoapp.widget.databinding.ActivityPopupTodoDetailBinding
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

    private lateinit var binding: ActivityPopupTodoDetailBinding
    private var currentTodo: Todo? = null

    private val editLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            // Reload todo after editing
            val id = intent.getIntExtra(EXTRA_TODO_ID, -1)
            if (id != -1) loadTodo(id)
            refreshWidget()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPopupTodoDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Tap outside the card to dismiss
        binding.popupScrim.setOnClickListener { finish() }
        binding.popupCard.setOnClickListener { /* consume to prevent dismiss */ }

        binding.popupBtnClose.setOnClickListener { finish() }

        binding.popupBtnEdit.setOnClickListener {
            currentTodo?.let { todo ->
                val intent = Intent(this, AddEditActivity::class.java).apply {
                    putExtra(AddEditActivity.EXTRA_TODO_ID, todo.id)
                }
                editLauncher.launch(intent)
            }
        }

        binding.popupBtnDone.setOnClickListener {
            currentTodo?.let { todo ->
                lifecycleScope.launch {
                    val dao = TodoDatabase.getDatabase(this@TodoDetailPopupActivity).todoDao()
                    withContext(Dispatchers.IO) { dao.setDone(todo.id, !todo.done) }
                    val updated = withContext(Dispatchers.IO) { dao.getTodoById(todo.id) }
                    if (updated != null) {
                        currentTodo = updated
                        updateDoneButton(updated.done)
                    }
                    refreshWidget()
                }
            }
        }

        val todoId = intent.getIntExtra(EXTRA_TODO_ID, -1)
        if (todoId == -1) {
            finish()
            return
        }
        loadTodo(todoId)
    }

    private fun loadTodo(id: Int) {
        lifecycleScope.launch {
            val dao = TodoDatabase.getDatabase(this@TodoDetailPopupActivity).todoDao()
            val todo = withContext(Dispatchers.IO) { dao.getTodoById(id) }
            if (todo == null) {
                finish()
                return@launch
            }
            currentTodo = todo
            displayTodo(todo)
        }
    }

    private fun displayTodo(todo: Todo) {
        // Accent bar color
        try {
            binding.popupAccentBar.setBackgroundColor(Color.parseColor(todo.categoryColor))
        } catch (e: Exception) {
            binding.popupAccentBar.setBackgroundColor(Color.parseColor("#636366"))
        }

        // Category pill
        binding.popupCategory.text = todo.category

        // Done badge
        updateDoneButton(todo.done)

        // Title (strikethrough if done)
        binding.popupTitle.text = todo.title
        binding.popupTitle.alpha = if (todo.done) 0.45f else 1f

        // Date
        try {
            val parsed = LocalDate.parse(todo.date, DateTimeFormatter.ISO_LOCAL_DATE)
            val formatted = parsed.format(DateTimeFormatter.ofPattern("yyyy년 M월 d일 (E)"))
            binding.popupDate.text = formatted
        } catch (e: Exception) {
            binding.popupDate.text = todo.date
        }

        // Time
        val timeStr = when {
            todo.allDay -> "하루종일"
            todo.startTime.isNotEmpty() ->
                "${todo.startTime}${if (todo.endTime.isNotEmpty()) " – ${todo.endTime}" else ""}"
            else -> "시간 미설정"
        }
        binding.popupTime.text = timeStr

        // Optional fields
        setOptionalRow(binding.popupRowModule, binding.popupModule, todo.module)
        setOptionalRow(binding.popupRowInstructor, binding.popupInstructor, todo.instructor)

        val locationStr = listOf(todo.location, todo.room)
            .filter { it.isNotEmpty() }
            .joinToString(" ")
        setOptionalRow(binding.popupRowLocation, binding.popupLocation, locationStr)

        setOptionalRow(binding.popupRowNote, binding.popupNote, todo.note)
        setOptionalRow(binding.popupRowContent, binding.popupContent, todo.content)
    }

    private fun setOptionalRow(row: View, textView: android.widget.TextView, value: String) {
        if (value.isNotEmpty()) {
            row.visibility = View.VISIBLE
            textView.text = value
        } else {
            row.visibility = View.GONE
        }
    }

    private fun updateDoneButton(done: Boolean) {
        if (done) {
            binding.popupBtnDone.text = "미완료"
        } else {
            binding.popupBtnDone.text = "완료"
        }
    }

    private fun refreshWidget() {
        val manager = AppWidgetManager.getInstance(this)
        val ids = manager.getAppWidgetIds(ComponentName(this, TodoWidgetProvider::class.java))
        val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        }
        sendBroadcast(intent)
    }
}
