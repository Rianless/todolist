package com.todoapp.widget.ui

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.MenuItem
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.widget.addTextChangedListener
import androidx.lifecycle.lifecycleScope
import com.todoapp.widget.databinding.ActivityAddEditBinding
import com.todoapp.widget.data.ChecklistItem
import com.todoapp.widget.data.CloudStateClient
import com.todoapp.widget.widget.TodoWidgetProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.UUID

class AddEditActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAddEditBinding
    private var todoId: Int = -1
    private val checklistItems = mutableListOf<ChecklistItem>()

    companion object {
        const val EXTRA_TODO_ID = "extra_todo_id"
        const val EXTRA_DATE = "extra_date"
        private const val API_URL = "https://todolist-liart-mu.vercel.app/api/todos"
    }

    private val categories = mutableListOf(
        "학업", "취업", "운동", "일정", "약속", "스터디", "개인", "기타"
    )
    private val categoryColors = mutableMapOf<String, String>()
    private lateinit var categoryAdapter: ArrayAdapter<String>

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAddEditBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        todoId = intent.getIntExtra(EXTRA_TODO_ID, -1)

        categoryAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, categories)
        categoryAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.spinnerCategory.adapter = categoryAdapter

        binding.etDate.setText(
            intent.getStringExtra(EXTRA_DATE)
                ?: LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
        )

        if (todoId != -1) {
            supportActionBar?.title = "일정 수정"
        } else {
            supportActionBar?.title = "일정 추가"
        }

        loadCategories()
        binding.btnAddChecklist.setOnClickListener { addChecklistItem() }
        binding.btnSave.setOnClickListener { saveTodo() }
    }

    private fun loadCategories() {
        lifecycleScope.launch {
            val cloudCategories = withContext(Dispatchers.IO) {
                runCatching {
                    val conn = URL("https://todolist-liart-mu.vercel.app/api/state")
                        .openConnection() as HttpURLConnection
                    val response = conn.inputStream.bufferedReader().readText()
                    conn.disconnect()
                    val array = JSONObject(response)
                        .optJSONObject("data")
                        ?.optJSONArray("categories")
                        ?: return@runCatching emptyList()
                    buildList {
                        for (index in 0 until array.length()) {
                            val item = array.getJSONObject(index)
                            val name = item.optString("name").trim()
                            if (name.isNotEmpty()) {
                                add(name to item.optString("color", "#636366"))
                            }
                        }
                    }
                }.getOrDefault(emptyList())
            }

            if (cloudCategories.isNotEmpty()) {
                categories.clear()
                categoryColors.clear()
                cloudCategories.forEach { (name, color) ->
                    if (name !in categories) categories.add(name)
                    categoryColors[name] = color
                }
                categoryAdapter.notifyDataSetChanged()
            }

            if (todoId != -1) loadTodo()
        }
    }

    private fun loadTodo() {
        lifecycleScope.launch {
            val loaded = withContext(Dispatchers.IO) {
                runCatching {
                    val url = URL("$API_URL?id=$todoId")
                    val conn = url.openConnection() as HttpURLConnection
                    val response = conn.inputStream.bufferedReader().readText()
                    conn.disconnect()
                    val arr = JSONArray(response)
                    if (arr.length() == 0) null
                    else arr.getJSONObject(0) to CloudStateClient.fetchChecklist(todoId)
                }.getOrNull()
            } ?: return@launch
            val obj = loaded.first

            binding.etDate.setText(obj.optString("date"))
            binding.etTitle.setText(obj.optString("title"))
            binding.etStartTime.setText(obj.optString("start_time"))
            binding.etEndTime.setText(obj.optString("end_time"))
            binding.checkAllDay.isChecked =
                obj.optBoolean("all_day") || obj.optString("start_time") == "allday"
            binding.etLocation.setText(obj.optString("location"))
            binding.etNote.setText(obj.optString("memo", obj.optString("note")))
            binding.etContent.setText(obj.optString("content"))
            checklistItems.clear()
            checklistItems.addAll(loaded.second)
            renderChecklistEditor()
            val savedCategory = obj.optString("category")
            if (savedCategory.isNotEmpty() && savedCategory !in categories) {
                categories.add(savedCategory)
                categoryColors[savedCategory] = obj.optString("category_color", "#636366")
                categoryAdapter.notifyDataSetChanged()
            }
            val catIdx = categories.indexOf(savedCategory)
            if (catIdx >= 0) binding.spinnerCategory.setSelection(catIdx)
        }
    }

    private fun saveTodo() {
        val title = binding.etTitle.text.toString().trim()
        if (title.isEmpty()) {
            Toast.makeText(this, "제목을 입력해 주세요", Toast.LENGTH_SHORT).show()
            return
        }

        val category = categories[binding.spinnerCategory.selectedItemPosition]
        val body = JSONObject().apply {
            put("date", binding.etDate.text.toString())
            put("title", title)
            put("start_time", if (binding.checkAllDay.isChecked) "" else binding.etStartTime.text.toString())
            put("end_time", if (binding.checkAllDay.isChecked) "" else binding.etEndTime.text.toString())
            put("all_day", binding.checkAllDay.isChecked)
            put("category", category)
            put("category_color", categoryToColor(category))
            put("location", binding.etLocation.text.toString())
            put("note", binding.etNote.text.toString())
            put("memo", binding.etNote.text.toString())
            put("content", binding.etContent.text.toString())
        }

        val checklistSnapshot = checklistItems
            .filter { it.text.isNotBlank() }
            .map { it.copy(text = it.text.trim()) }

        lifecycleScope.launch {
            val saveResult = withContext(Dispatchers.IO) {
                runCatching {
                    val savedId: Int
                    if (todoId != -1) {
                        // 수정
                        val url = URL("$API_URL?id=$todoId")
                        val conn = url.openConnection() as HttpURLConnection
                        conn.requestMethod = "PATCH"
                        conn.setRequestProperty("Content-Type", "application/json")
                        conn.setRequestProperty("Prefer", "return=representation")
                        conn.doOutput = true
                        conn.outputStream.write(body.toString().toByteArray())
                        conn.inputStream.close()
                        conn.disconnect()
                        savedId = todoId
                    } else {
                        // 추가
                        val listConn = URL(API_URL).openConnection() as HttpURLConnection
                        val listResponse = listConn.inputStream.bufferedReader().readText()
                        listConn.disconnect()
                        val rows = JSONArray(listResponse)
                        var nextId = 1
                        for (index in 0 until rows.length()) {
                            nextId = maxOf(nextId, rows.getJSONObject(index).optInt("id") + 1)
                        }
                        body.put("id", nextId)
                        savedId = nextId

                        val url = URL(API_URL)
                        val conn = url.openConnection() as HttpURLConnection
                        conn.requestMethod = "POST"
                        conn.setRequestProperty("Content-Type", "application/json")
                        conn.setRequestProperty("Prefer", "return=representation")
                        conn.doOutput = true
                        conn.outputStream.write(body.toString().toByteArray())
                        conn.inputStream.close()
                        conn.disconnect()
                    }
                    savedId to CloudStateClient.saveTodo(savedId, body, checklistSnapshot)
                }.getOrNull()
            }

            if (saveResult != null && saveResult.second) {
                refreshWidget()
                setResult(RESULT_OK)
                finish()
            } else if (saveResult != null) {
                todoId = saveResult.first
                Toast.makeText(
                    this@AddEditActivity,
                    "일정은 저장됐지만 체크리스트 동기화에 실패했습니다. 다시 저장해 주세요.",
                    Toast.LENGTH_LONG
                ).show()
            } else {
                Toast.makeText(this@AddEditActivity, "저장 실패. 다시 시도해 주세요.", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun addChecklistItem() {
        checklistItems.add(
            ChecklistItem(
                id = "check-${UUID.randomUUID()}",
                text = "",
                done = false
            )
        )
        renderChecklistEditor(checklistItems.lastIndex)
    }

    private fun renderChecklistEditor(focusIndex: Int = -1) {
        binding.checklistEditor.removeAllViews()

        if (checklistItems.isEmpty()) {
            binding.checklistEditor.addView(TextView(this).apply {
                text = "체크 항목이 없습니다"
                textSize = 12f
                setTextColor(Color.parseColor("#A8ADBC"))
                gravity = Gravity.CENTER
                setPadding(0, dp(10), 0, dp(10))
            })
            return
        }

        checklistItems.forEachIndexed { index, item ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                if (index > 0) setPadding(0, dp(5), 0, 0)
            }

            val checkbox = CheckBox(this).apply {
                isChecked = item.done
                buttonTintList = ColorStateList.valueOf(Color.parseColor("#6366F1"))
                setOnCheckedChangeListener { _, checked -> item.done = checked }
            }

            val input = EditText(this).apply {
                layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
                background = null
                hint = "할 일을 입력하세요"
                textSize = 14f
                setTextColor(Color.parseColor("#333846"))
                setHintTextColor(Color.parseColor("#A8ADBC"))
                inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
                setSingleLine(true)
                setText(item.text)
                addTextChangedListener { item.text = it?.toString().orEmpty() }
                setOnEditorActionListener { _, _, _ ->
                    if (text.toString().isNotBlank()) addChecklistItem()
                    true
                }
            }

            val remove = TextView(this).apply {
                layoutParams = LinearLayout.LayoutParams(dp(36), dp(40))
                gravity = Gravity.CENTER
                text = "×"
                textSize = 20f
                setTextColor(Color.parseColor("#E45868"))
                contentDescription = "체크 항목 삭제"
                setOnClickListener {
                    checklistItems.removeAt(index)
                    renderChecklistEditor()
                }
            }

            row.addView(checkbox)
            row.addView(input)
            row.addView(remove)
            binding.checklistEditor.addView(row)

            if (focusIndex == index) input.post { input.requestFocus() }
        }
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun categoryToColor(category: String): String = categoryColors[category] ?: when (category) {
        "학업" -> "#FF6B6B"
        "취업" -> "#FFD93D"
        "운동" -> "#34C759"
        "일정" -> "#5856D6"
        "약속" -> "#FF2D55"
        "스터디" -> "#AF52DE"
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
