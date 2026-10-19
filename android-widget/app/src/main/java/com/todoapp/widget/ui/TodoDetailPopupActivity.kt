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
import com.todoapp.widget.widget.WidgetLocalEdits
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

/** 팝업에서 바꾼 내용을 서버에 올리는 작업은 팝업이 닫혀도 끝까지 가야 하므로 화면과 별개 범위에서 돌린다. */
private val saveScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

class TodoDetailPopupActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_TODO_ID = "extra_todo_id"
        private const val API_URL = "https://todolist-liart-mu.vercel.app/api/todos"

        /** 한 번 열어 본 일정은 다음에 열 때 바로 보여 준다 */
        private val detailCache = ConcurrentHashMap<Int, TodoDetail>()
    }

    private var currentTodo: TodoDetail? = null
    private lateinit var root: View

    private val editLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val id = currentTodo?.id ?: return@registerForActivityResult
            refreshDetail(id)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.setBackgroundDrawableResource(android.R.color.transparent)
        window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
        window.attributes = window.attributes.also { it.dimAmount = 0.5f }

        val todoId = intent.getIntExtra(EXTRA_TODO_ID, -1)
        if (todoId == -1) { finish(); return }

        // 서버를 기다리지 않고 위젯이 넘겨 준 내용(또는 지난번에 본 내용)으로 바로 그린다
        val instant = detailFromIntent(todoId)?.let { quick ->
            detailCache[todoId]?.takeIf { it.title.isNotEmpty() }?.let { cached ->
                cached.copy(title = quick.title, done = quick.done, date = quick.date.ifEmpty { cached.date })
            } ?: quick
        } ?: detailCache[todoId]
        root = layoutInflater.inflate(R.layout.dialog_todo_detail, null)
        setContentView(root)
        bindActions()
        if (instant != null) {
            currentTodo = instant
            bind(instant)
        } else {
            root.visibility = View.INVISIBLE
        }
        refreshDetail(todoId)
    }

    /** 위젯 목록 한 줄에 있던 값으로 만든 임시 상세 (메모 · 체크리스트 등은 서버에서 채운다) */
    private fun detailFromIntent(id: Int): TodoDetail? {
        val title = intent.getStringExtra(TodoWidgetProvider.EXTRA_TITLE) ?: return null
        return TodoDetail(
            id = id,
            title = title,
            date = intent.getStringExtra(TodoWidgetProvider.EXTRA_TODO_DATE)
                ?: intent.getStringExtra(TodoWidgetProvider.EXTRA_DATE).orEmpty(),
            startTime = intent.getStringExtra(TodoWidgetProvider.EXTRA_START).orEmpty(),
            endTime = intent.getStringExtra(TodoWidgetProvider.EXTRA_END).orEmpty(),
            allDay = intent.getBooleanExtra(TodoWidgetProvider.EXTRA_ALL_DAY, false),
            category = intent.getStringExtra(TodoWidgetProvider.EXTRA_CATEGORY).orEmpty(),
            categoryColor = intent.getStringExtra(TodoWidgetProvider.EXTRA_COLOR) ?: "#636366",
            done = intent.getBooleanExtra(TodoWidgetProvider.EXTRA_DONE, false),
            location = "", note = "", content = "", instructor = "", module = "", room = "",
            checklist = mutableListOf()
        )
    }

    /** 서버에서 전체 내용을 받아 와 이미 떠 있는 팝업에 덧입힌다 (깜빡이지 않게 화면을 다시 만들지 않는다). */
    private fun refreshDetail(id: Int) {
        lifecycleScope.launch {
            val todo = withContext(Dispatchers.IO) { fetchDetail(id) }
            if (todo == null) {
                if (currentTodo == null) finish()
                return@launch
            }
            // 받아 오는 사이 사용자가 완료를 눌렀다면 그 선택을 덮어쓰지 않는다
            val local = currentTodo
            val merged = if (local != null && pendingDone != null) todo.copy(done = pendingDone!!) else todo
            // 반복 일정은 보고 있는 날짜의 제목 · 완료 상태가 위젯 목록에 맞춰져 있다
            val viewedDate = intent.getStringExtra(TodoWidgetProvider.EXTRA_DATE)
            val occurrence = viewedDate != null && viewedDate != todo.date && local != null
            val result = if (occurrence) merged.copy(title = local!!.title, done = local.done) else merged
            detailCache[id] = result
            currentTodo = result
            bind(result)
            root.visibility = View.VISIBLE
        }
    }

    /** 사용자가 누른 완료 상태 (서버 저장이 끝날 때까지) */
    private var pendingDone: Boolean? = null

    private fun fetchDetail(id: Int): TodoDetail? = runCatching {
        // 일정 한 건과 체크리스트(웹앱 상태)를 동시에 받아 기다리는 시간을 줄인다
        var checklist: MutableList<ChecklistItem> = mutableListOf()
        val checklistThread = Thread {
            checklist = runCatching { CloudStateClient.fetchChecklist(id) }.getOrDefault(mutableListOf())
        }.also { it.start() }
        val conn = URL("$API_URL?id=$id").openConnection() as HttpURLConnection
        conn.connectTimeout = 8000
        conn.readTimeout = 8000
        val response = conn.inputStream.bufferedReader().readText()
        conn.disconnect()
        checklistThread.join()
        val arr = JSONArray(response)
        if (arr.length() == 0) return@runCatching null
        val obj = arr.getJSONObject(0)
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

    /** 버튼 동작은 한 번만 연결하고, 현재 일정은 [currentTodo] 에서 읽는다. */
    private fun bindActions() {
        // 완료/미완료: 화면과 위젯에 먼저 반영하고 서버 저장은 뒤에서 한다
        root.findViewById<TextView>(R.id.dialog_btn_done).setOnClickListener {
            val todo = currentTodo ?: return@setOnClickListener
            val newDone = !todo.done
            pendingDone = newDone
            val updated = todo.copy(done = newDone)
            currentTodo = updated
            detailCache[todo.id] = updated
            bind(updated)
            WidgetLocalEdits.setDone(applicationContext, todo.id, newDone)
            val appContext = applicationContext
            saveScope.launch {
                val ok = runCatching {
                    // 서버의 두 저장소를 동시에 갱신
                    var stateOk = false
                    val stateThread = Thread {
                        stateOk = runCatching { CloudStateClient.updateDone(todo.id, newDone) }.getOrDefault(false)
                    }.also { it.start() }
                    val conn = URL("$API_URL?id=${todo.id}").openConnection() as HttpURLConnection
                    conn.requestMethod = "PATCH"
                    conn.setRequestProperty("Content-Type", "application/json")
                    conn.connectTimeout = 8000
                    conn.readTimeout = 8000
                    conn.doOutput = true
                    conn.outputStream.use { it.write(JSONObject().put("done", newDone).toString().toByteArray()) }
                    conn.inputStream.close()
                    conn.disconnect()
                    stateThread.join()
                    stateOk
                }.getOrDefault(false)
                withContext(Dispatchers.Main) {
                    if (pendingDone == newDone) pendingDone = null
                    if (!ok) Toast.makeText(appContext, "완료 상태를 저장하지 못했어요", Toast.LENGTH_SHORT).show()
                    WidgetLocalEdits.finish(appContext, todo.id)
                }
            }
        }

        // 수정 버튼 → AddEditActivity로 이동
        root.findViewById<TextView>(R.id.dialog_btn_edit).setOnClickListener {
            val todo = currentTodo ?: return@setOnClickListener
            val intent = Intent(this, AddEditActivity::class.java).apply {
                putExtra(AddEditActivity.EXTRA_TODO_ID, todo.id)
            }
            editLauncher.launch(intent)
        }

        // 삭제: 팝업을 바로 닫고 위젯에서도 먼저 지운 뒤 서버 삭제는 뒤에서 한다
        root.findViewById<TextView>(R.id.dialog_btn_delete).setOnClickListener {
            val todo = currentTodo ?: return@setOnClickListener
            detailCache.remove(todo.id)
            WidgetLocalEdits.delete(applicationContext, todo.id)
            val appContext = applicationContext
            saveScope.launch {
                val deleted = runCatching {
                    var stateOk = false
                    val stateThread = Thread {
                        stateOk = runCatching { CloudStateClient.deleteTodo(todo.id) }.getOrDefault(false)
                    }.also { it.start() }
                    val conn = URL("$API_URL?id=${todo.id}").openConnection() as HttpURLConnection
                    conn.requestMethod = "DELETE"
                    conn.connectTimeout = 8000
                    conn.readTimeout = 8000
                    conn.inputStream.close()
                    conn.disconnect()
                    stateThread.join()
                    stateOk
                }.getOrDefault(false)
                withContext(Dispatchers.Main) {
                    if (!deleted) Toast.makeText(appContext, "삭제하지 못했어요. 연결을 확인해 주세요.", Toast.LENGTH_SHORT).show()
                    WidgetLocalEdits.finish(appContext, todo.id)
                }
            }
            finish()
        }

        // 순서 바꾸기: 그날 일정 목록에서 한 칸 위/아래로 (웹앱·PC 위젯과 같은 순서를 쓴다)
        root.findViewById<TextView>(R.id.dialog_btn_up).setOnClickListener { currentTodo?.let { moveInDay(it, -1) } }
        root.findViewById<TextView>(R.id.dialog_btn_down).setOnClickListener { currentTodo?.let { moveInDay(it, 1) } }

        root.findViewById<TextView>(R.id.dialog_btn_close).setOnClickListener { finish() }
    }

    /** 일정 내용을 화면에 채운다. */
    private fun bind(todo: TodoDetail) {
        val view = root

        // 액센트 바
        val accentBar = view.findViewById<View>(R.id.dialog_accent_bar)
        try {
            accentBar.setBackgroundColor(Color.parseColor(todo.categoryColor))
        } catch (e: Exception) {
            accentBar.setBackgroundColor(Color.parseColor("#000080"))
        }

        // 카테고리 (제목 막대)
        view.findViewById<TextView>(R.id.dialog_category).text = todo.category.ifEmpty { "일정" }

        view.findViewById<TextView>(R.id.dialog_done_badge).visibility = if (todo.done) View.VISIBLE else View.GONE

        val titleView = view.findViewById<TextView>(R.id.dialog_title)
        titleView.text = todo.title
        titleView.alpha = if (todo.done) 0.45f else 1f
        titleView.paintFlags =
            if (todo.done) titleView.paintFlags or Paint.STRIKE_THRU_TEXT_FLAG
            else titleView.paintFlags and Paint.STRIKE_THRU_TEXT_FLAG.inv()

        val dateView = view.findViewById<TextView>(R.id.dialog_date)
        try {
            val parsed = LocalDate.parse(todo.date, DateTimeFormatter.ISO_LOCAL_DATE)
            dateView.text = parsed.format(DateTimeFormatter.ofPattern("yyyy.MM.dd (E)"))
        } catch (e: Exception) {
            dateView.text = todo.date
        }

        view.findViewById<TextView>(R.id.dialog_time).text = when {
            todo.allDay -> "하루종일"
            todo.startTime.isNotEmpty() -> {
                if (todo.endTime.isNotEmpty()) "${todo.startTime} - ${todo.endTime}" else todo.startTime
            }
            else -> "-"
        }

        setRow(view, R.id.dialog_row_module, R.id.dialog_module, todo.module)
        setRow(view, R.id.dialog_row_instructor, R.id.dialog_instructor, todo.instructor)
        val location = listOf(todo.location, todo.room).filter { it.isNotEmpty() }.joinToString(" ")
        setRow(view, R.id.dialog_row_location, R.id.dialog_location, location)
        setRow(view, R.id.dialog_row_note, R.id.dialog_note, todo.note)
        setRow(view, R.id.dialog_row_content, R.id.dialog_content, todo.content)
        renderChecklist(view, todo)

        val doneBtn = view.findViewById<TextView>(R.id.dialog_btn_done)
        doneBtn.text = if (todo.done) "미완료" else "완료"
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
                setTextColor(if (item.done) Color.parseColor("#808080") else Color.parseColor("#000000"))
                buttonTintList = ColorStateList.valueOf(Color.parseColor("#000080"))
                isChecked = item.done
                gravity = android.view.Gravity.CENTER_VERTICAL
                setPadding(0, dp(5), 0, dp(5))
                if (item.done) paintFlags = paintFlags or Paint.STRIKE_THRU_TEXT_FLAG
                setOnCheckedChangeListener { button, checked ->
                    // 화면에 먼저 반영하고 저장은 뒤에서 한다. 실패하면 되돌린다.
                    val updated = (currentTodo ?: todo).checklist.map { it.copy() }.toMutableList()
                    updated.getOrNull(index)?.done = checked
                    val before = currentTodo
                    val applied = (before ?: todo).copy(checklist = updated)
                    currentTodo = applied
                    detailCache[todo.id] = applied
                    setTextColor(if (checked) Color.parseColor("#808080") else Color.parseColor("#000000"))
                    paintFlags = if (checked) paintFlags or Paint.STRIKE_THRU_TEXT_FLAG
                    else paintFlags and Paint.STRIKE_THRU_TEXT_FLAG.inv()
                    root.findViewById<TextView>(R.id.dialog_checklist_label).text =
                        "체크리스트 ${updated.count { it.done }}/${updated.size}"
                    val appContext = applicationContext
                    saveScope.launch {
                        val saved = CloudStateClient.saveChecklist(todo.id, updated)
                        if (!saved) withContext(Dispatchers.Main) {
                            Toast.makeText(appContext, "체크리스트 저장에 실패했습니다.", Toast.LENGTH_SHORT).show()
                            if (!isFinishing) {
                                val reverted = (currentTodo ?: todo).copy(checklist = todo.checklist)
                                currentTodo = reverted
                                detailCache[todo.id] = reverted
                                bind(reverted)
                            }
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
