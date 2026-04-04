package com.todoapp.widget.ui

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import android.view.MenuItem
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.todoapp.widget.databinding.ActivityAddEditBinding
import com.todoapp.widget.data.Todo
import com.todoapp.widget.widget.TodoWidgetProvider
import java.time.LocalDate
import java.time.format.DateTimeFormatter

class AddEditActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAddEditBinding
    private lateinit var viewModel: TodoViewModel
    private var todoId: Int = -1

    companion object {
        const val EXTRA_TODO_ID = "extra_todo_id"
    }

    private val categories = listOf(
        "밀착상담", "자신감회복", "취업역량강화", "진로탐색",
        "지역맞춤형", "사례관리", "자율활동", "개인", "기타"
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAddEditBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        viewModel = ViewModelProvider(this)[TodoViewModel::class.java]
        todoId = intent.getIntExtra(EXTRA_TODO_ID, -1)

        // Category spinner
        val spinnerAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, categories)
        spinnerAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.spinnerCategory.adapter = spinnerAdapter

        // Default date
        binding.etDate.setText(LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE))

        if (todoId != -1) {
            supportActionBar?.title = "일정 수정"
            loadTodo()
        } else {
            supportActionBar?.title = "새 일정"
        }

        binding.btnSave.setOnClickListener { saveTodo() }
    }

    private fun loadTodo() {
        viewModel.allTodos.observe(this) { todos ->
            val todo = todos.find { it.id == todoId } ?: return@observe
            binding.etDate.setText(todo.date)
            binding.etTitle.setText(todo.title)
            binding.etStartTime.setText(todo.startTime)
            binding.etEndTime.setText(todo.endTime)
            binding.checkAllDay.isChecked = todo.allDay
            binding.etModule.setText(todo.module)
            binding.etInstructor.setText(todo.instructor)
            binding.etLocation.setText(todo.location)
            binding.etRoom.setText(todo.room)
            binding.etNote.setText(todo.note)
            binding.etContent.setText(todo.content)
            val catIdx = categories.indexOf(todo.category)
            if (catIdx >= 0) binding.spinnerCategory.setSelection(catIdx)
        }
    }

    private fun saveTodo() {
        val title = binding.etTitle.text.toString().trim()
        if (title.isEmpty()) {
            Toast.makeText(this, "제목을 입력해주세요", Toast.LENGTH_SHORT).show()
            return
        }
        val category = categories[binding.spinnerCategory.selectedItemPosition]
        val todo = Todo(
            id = if (todoId != -1) todoId else 0,
            date = binding.etDate.text.toString(),
            title = title,
            startTime = binding.etStartTime.text.toString(),
            endTime = binding.etEndTime.text.toString(),
            allDay = binding.checkAllDay.isChecked,
            category = category,
            categoryColor = categoryToColor(category),
            module = binding.etModule.text.toString(),
            instructor = binding.etInstructor.text.toString(),
            location = binding.etLocation.text.toString(),
            room = binding.etRoom.text.toString(),
            note = binding.etNote.text.toString(),
            content = binding.etContent.text.toString(),
        )
        if (todoId != -1) viewModel.update(todo) else viewModel.insert(todo)
        refreshWidget()
        setResult(RESULT_OK)
        finish()
    }

    private fun categoryToColor(category: String): String = when (category) {
        "밀착상담" -> "#FF6B6B"
        "자신감회복" -> "#FFD93D"
        "취업역량강화" -> "#34C759"
        "진로탐색" -> "#5856D6"
        "지역맞춤형" -> "#FF2D55"
        "사례관리" -> "#AF52DE"
        "자율활동" -> "#8E8E93"
        "개인" -> "#FF9500"
        else -> "#636366"
    }

    private fun refreshWidget() {
        val manager = AppWidgetManager.getInstance(this)
        val ids = manager.getAppWidgetIds(ComponentName(this, TodoWidgetProvider::class.java))
        sendBroadcast(Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        })
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (item.itemId == android.R.id.home) finish()
        return super.onOptionsItemSelected(item)
    }
}
