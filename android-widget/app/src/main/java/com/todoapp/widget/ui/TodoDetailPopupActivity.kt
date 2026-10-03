package com.todoapp.widget.ui

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Paint
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.todoapp.widget.R
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

data class TodoDetail(
    val id: Int,
    val title: String,
    val date: String,
    val startTime: String,
    val endTime: String,
    val allDay: Boolean,
    val category: String,
    val categoryColor: String,
    val done: Boolean,
    val location: String,
    val note: String,
    val content: String,
    val instructor: String,
    val module: String,
    val room: String,
    val checklist: MutableList<ChecklistItem>
)

class TodoDetailPopupActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_TODO_ID = "extra_todo_id"
        private const val API_URL = "https://todolist-liart-mu.vercel.app/api/todos"
    }

    private var currentTodo: TodoDetail? = null

    private val editLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val id = currentTodo?.id ?: return@registerForActivityResult
            loadAndShow(id)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.setBackgroundDrawableResource(android.R.color.transparent)
        window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
        window.attributes = window.attributes.also { it.dimAmount = 0.6f }

        val todoId = intent.getIntExtra(EXTRA_TODO_ID, -1)
        if (todoId == -1) { finish(); return }

        loadAndShow(todoId)
    }

    private fun loadAndShow(id: Int) {
        lifecycleScope.launch {
            val todo = withContext(Dispatchers.IO) {
                runCatching {
                    val url = URL("$API_URL?id=$id")
                    val conn = url.openConnection() as HttpURLConnection
                    val response = conn.inputStream.bufferedReader().readText()
                    conn.disconnect()
                    val arr = JSONArray(response)
                    if (arr.length() == 0) return@runCatching null
                    val obj = arr.getJSONObject(0)
                    val checklist = CloudStateClient.fetchChecklist(id)
                    TodoDetail(
                        id = obj.optInt("id"),
                        title = obj.optString("title"),
                        date = obj.optString("date"),
                        startTime = obj.optString("start_time"),
                        endTime = obj.optString("end_time"),
                        allDay = obj.optBoolean("all_day"),
                        category = obj.optString("category"),
                        categoryColor = obj.optString("category_color", "#636366"),
                        done = obj.optBoolean("done"),
                        location = obj.optString("location"),
                        note = obj.optString("note"),
                        content = obj.optString("content"),
                        instructor = obj.optString("instructor"),
                        module = obj.optString("module"),
                        room = obj.optString("room"),
                        checklist = checklist
                    )
                }.getOrNull()
            }
            if (todo == null) { finish(); return@launch }
            currentTodo = todo
            showPopup(todo)
        }
    }

    private fun showPopup(todo: TodoDetail) {
        val view = layoutInflater.inflate(R.layout.dialog_todo_detail, null)
        setContentView(view)

        // 액센트 바
        val accentBar = view.findViewById<View>(R.id.dialog_accent_bar)
        try {
            accentBar.setBackgroundColor(Color.parseColor(todo.categoryColor))
        } catch (e: Exception) {
            accentBar.setBackgroundColor(Color.parseColor("#00ffe7"))
        }

        // 카테고리
        view.findViewById<TextView>(R.id.dialog_category).text = todo.category

        // 완료 뱃지
        val doneBadge = view.findViewById<TextView>(R.id.dialog_done_badge)
        doneBadge.visibility = if (todo.done) View.VISIBLE else View.GONE

        // 제목
        val titleView = view.findViewById<TextView>(R.id.dialog_title)
        titleView.text = todo.title
        titleView.alpha = if (todo.done) 0.45f else 1f

        // 날짜
        val dateView = view.findViewById<TextView>(R.id.dialog_date)
        try {
            val parsed = LocalDate.parse(todo.date, DateTimeFormatter.ISO_LOCAL_DATE)
            dateView.text = parsed.format(DateTimeFormatter.ofPattern("yyyy.MM.dd (E)"))
        } catch (e: Exception) {
            dateView.text = todo.date
        }

        // 시간
        view.findViewById<TextView>(R.id.dialog_time).text = when {
            todo.allDay -> "하루종일"
            todo.startTime.isNotEmpty() -> {
                if (todo.endTime.isNotEmpty()) "${todo.startTime} - ${todo.endTime}" else todo.startTime
            }
            else -> "-"
        }

        // 옵션 행
        setRow(view, R.id.dialog_row_module, R.id.dialog_module, todo.module)
        setRow(view, R.id.dialog_row_instructor, R.id.dialog_instructor, todo.instructor)
        val location = listOf(todo.location, todo.room).filter { it.isNotEmpty() }.joinToString(" ")
        setRow(view, R.id.dialog_row_location, R.id.dialog_location, location)
        setRow(view, R.id.dialog_row_note, R.id.dialog_note, todo.note)
        setRow(view, R.id.dialog_row_content, R.id.dialog_content, todo.content)
        renderChecklist(view, todo)

        // 완료 버튼
        val doneBtn = view.findViewById<TextView>(R.id.dialog_btn_done)
        doneBtn.text = if (todo.done) "미완료" else "완료"
        doneBtn.alpha = if (todo.done) 0.5f else 1f
        doneBtn.setOnClickListener {
            lifecycleScope.launch {
                withContext(Dispatchers.IO) {
                    runCatching {
                        val url = URL("$API_URL?id=${todo.id}")
                        val conn = url.openConnection() as HttpURLConnection
                        conn.requestMethod = "PATCH"
                        conn.setRequestProperty("Content-Type", "application/json")
                        conn.doOutput = true
                        val body = JSONObject().put("done", !todo.done).toString()
                        conn.outputStream.write(body.toByteArray())
                        conn.inputStream.close()
                        conn.disconnect()
                        CloudStateClient.updateDone(todo.id, !todo.done)
                    }
                }
                refreshWidget()
                loadAndShow(todo.id)
            }
        }

        // 수정 버튼 → AddEditActivity로 이동
        view.findViewById<TextView>(R.id.dialog_btn_edit).setOnClickListener {
            val intent = Intent(this, AddEditActivity::class.java).apply {
                putExtra(AddEditActivity.EXTRA_TODO_ID, todo.id)
            }
            editLauncher.launch(intent)
        }

        // 삭제 버튼
        view.findViewById<TextView>(R.id.dialog_btn_delete).setOnClickListener {
            lifecycleScope.launch {
                val deleted = withContext(Dispatchers.IO) {
                    runCatching {
                        val url = URL("$API_URL?id=${todo.id}")
                        val conn = url.openConnection() as HttpURLConnection
                        conn.requestMethod = "DELETE"
                        conn.inputStream.close()
                        conn.disconnect()
                        CloudStateClient.deleteTodo(todo.id)
                        true
                    }.getOrDefault(false)
                }
                if (deleted) {
                    refreshWidget()
                    finish()
                }
            }
        }

        // 순서 바꾸기: 그날 일정 목록에서 한 칸 위/아래로 (웹앱·PC 위젯과 같은 순서를 쓴다)
        view.findViewById<TextView>(R.id.dialog_btn_up).setOnClickListener { moveInDay(todo, -1) }
        view.findViewById<TextView>(R.id.dialog_btn_down).setOnClickListener { moveInDay(todo, 1) }

        // 닫기 버튼
        view.findViewById<TextView>(R.id.dialog_btn_close).setOnClickListener {
            finish()
        }
    }

    private fun moveInDay(todo: TodoDetail, delta: Int) {
        // 위젯에서 연 경우 보고 있던 날짜(반복 일정은 원래 날짜와 다를 수 있다), 아니면 일정 날짜
        val date = runCatching {
            LocalDate.parse(intent.getStringExtra(TodoWidgetProvider.EXTRA_DATE) ?: todo.date)
        }.getOrNull() ?: return
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) { CloudStateClient.moveTodoInDay(date, todo.id, delta) }
            when (result) {
                CloudStateClient.MoveResult.MOVED -> {
                    refreshWidget()
                    Toast.makeText(this@TodoDetailPopupActivity,
                        if (delta < 0) "한 칸 위로 옮겼어요" else "한 칸 아래로 옮겼어요", Toast.LENGTH_SHORT).show()
                }
                CloudStateClient.MoveResult.EDGE -> Toast.makeText(this@TodoDetailPopupActivity,
                    if (delta < 0) "이미 맨 위예요" else "이미 맨 아래예요", Toast.LENGTH_SHORT).show()
                CloudStateClient.MoveResult.FAILED -> Toast.makeText(this@TodoDetailPopupActivity,
                    "순서를 저장하지 못했어요. 연결을 확인해 주세요.", Toast.LENGTH_SHORT).show()
            }
        }
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

    private fun renderChecklist(root: View, todo: TodoDetail) {
        val row = root.findViewById<View>(R.id.dialog_row_checklist)
        val container = root.findViewById<LinearLayout>(R.id.dialog_checklist)
        val label = root.findViewById<TextView>(R.id.dialog_checklist_label)
        container.removeAllViews()

        if (todo.checklist.isEmpty()) {
            row.visibility = View.GONE
            return
        }

        row.visibility = View.VISIBLE
        val completed = todo.checklist.count { it.done }
        label.text = "체크리스트 $completed/${todo.checklist.size}"

        todo.checklist.forEachIndexed { index, item ->
            val checkbox = CheckBox(this).apply {
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
                text = item.text
                textSize = 13f
                setTextColor(if (item.done) Color.parseColor("#A8ADBC") else Color.parseColor("#333846"))
                buttonTintList = ColorStateList.valueOf(Color.parseColor("#6366F1"))
                isChecked = item.done
                gravity = android.view.Gravity.CENTER_VERTICAL
                setPadding(0, dp(5), 0, dp(5))
                if (item.done) paintFlags = paintFlags or Paint.STRIKE_THRU_TEXT_FLAG
                setOnCheckedChangeListener { button, checked ->
                    button.isEnabled = false
                    val updated = todo.checklist.map { it.copy() }.toMutableList()
                    updated[index].done = checked
                    lifecycleScope.launch {
                        val saved = withContext(Dispatchers.IO) {
                            CloudStateClient.saveChecklist(todo.id, updated)
                        }
                        if (saved) {
                            loadAndShow(todo.id)
                        } else {
                            button.setOnCheckedChangeListener(null)
                            button.isChecked = !checked
                            button.isEnabled = true
                            Toast.makeText(
                                this@TodoDetailPopupActivity,
                                "체크리스트 저장에 실패했습니다.",
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    }
                }
            }
            container.addView(checkbox)
        }
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun refreshWidget() {
        val manager = AppWidgetManager.getInstance(this)
        val ids = manager.getAppWidgetIds(ComponentName(this, TodoWidgetProvider::class.java))
        sendBroadcast(Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        })
    }
}
