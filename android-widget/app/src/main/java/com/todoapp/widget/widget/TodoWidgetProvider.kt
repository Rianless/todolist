package com.todoapp.widget.widget

import android.app.PendingIntent
import android.app.AlarmManager
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.widget.RemoteViews
import com.todoapp.widget.MainActivity
import com.todoapp.widget.R
import com.todoapp.widget.data.CloudStateClient
import com.todoapp.widget.data.applyItemOrder
import com.todoapp.widget.ui.AddEditActivity
import com.todoapp.widget.ui.TodoDetailPopupActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters

class TodoWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_TOGGLE_DONE = "com.todoapp.widget.ACTION_TOGGLE_DONE"
        const val ACTION_SELECT_DATE = "com.todoapp.widget.ACTION_SELECT_DATE"
        const val ACTION_WEEK_PREV = "com.todoapp.widget.ACTION_WEEK_PREV"
        const val ACTION_WEEK_NEXT = "com.todoapp.widget.ACTION_WEEK_NEXT"
        const val ACTION_WEEK_TODAY = "com.todoapp.widget.ACTION_WEEK_TODAY"
        const val ACTION_MIDNIGHT = "com.todoapp.widget.ACTION_MIDNIGHT"

        const val EXTRA_TODO_ID = "extra_todo_id"
        const val EXTRA_DONE = "extra_done"
        const val EXTRA_DATE = "extra_date"

        const val PREFS = "widget_prefs"
        const val KEY_WEEK_OFFSET = "week_offset"
        const val KEY_SELECTED_DATE = "selected_date"
        const val KEY_LAST_TODAY = "last_today"

        private const val API_URL = "https://todolist-liart-mu.vercel.app/api/todos"

        // 날짜 숫자 ID
        val CAL_DAY_IDS = intArrayOf(
            R.id.widget_cal_day0, R.id.widget_cal_day1, R.id.widget_cal_day2,
            R.id.widget_cal_day3, R.id.widget_cal_day4, R.id.widget_cal_day5,
            R.id.widget_cal_day6
        )
        // 요일 라벨 ID
        val CAL_DOW_IDS = intArrayOf(
            R.id.widget_cal_dow0, R.id.widget_cal_dow1, R.id.widget_cal_dow2,
            R.id.widget_cal_dow3, R.id.widget_cal_dow4, R.id.widget_cal_dow5,
            R.id.widget_cal_dow6
        )
        // 셀 컨테이너 ID (클릭 영역)
        val CAL_CELL_IDS = intArrayOf(
            R.id.widget_cal_cell0, R.id.widget_cal_cell1, R.id.widget_cal_cell2,
            R.id.widget_cal_cell3, R.id.widget_cal_cell4, R.id.widget_cal_cell5,
            R.id.widget_cal_cell6
        )
        // 도트 ID: [day][dotIdx]
        val CAL_DOT_IDS = arrayOf(
            intArrayOf(R.id.widget_cal_dot0_0, R.id.widget_cal_dot0_1, R.id.widget_cal_dot0_2),
            intArrayOf(R.id.widget_cal_dot1_0, R.id.widget_cal_dot1_1, R.id.widget_cal_dot1_2),
            intArrayOf(R.id.widget_cal_dot2_0, R.id.widget_cal_dot2_1, R.id.widget_cal_dot2_2),
            intArrayOf(R.id.widget_cal_dot3_0, R.id.widget_cal_dot3_1, R.id.widget_cal_dot3_2),
            intArrayOf(R.id.widget_cal_dot4_0, R.id.widget_cal_dot4_1, R.id.widget_cal_dot4_2),
            intArrayOf(R.id.widget_cal_dot5_0, R.id.widget_cal_dot5_1, R.id.widget_cal_dot5_2),
            intArrayOf(R.id.widget_cal_dot6_0, R.id.widget_cal_dot6_1, R.id.widget_cal_dot6_2)
        )

        private fun midnightPendingIntent(context: Context): PendingIntent {
            val intent = Intent(context, TodoWidgetProvider::class.java).apply { action = ACTION_MIDNIGHT }
            return PendingIntent.getBroadcast(
                context, 9001, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        // 자정 직후(00:00:05)에 위젯을 새로고침하도록 알람을 예약한다.
        // Android 8 이후에는 앱이 DATE_CHANGED 방송을 거의 받지 못하므로, 알람으로 직접 깨운다.
        fun scheduleMidnightRefresh(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val triggerAt = LocalDate.now().plusDays(1)
                .atStartOfDay(ZoneId.systemDefault())
                .plusSeconds(5)
                .toInstant()
                .toEpochMilli()
            val pending = midnightPendingIntent(context)
            val exactAllowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()
            if (exactAllowed) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending)
            } else {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending)
            }
        }

        fun cancelMidnightRefresh(context: Context) {
            (context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager)?.cancel(midnightPendingIntent(context))
        }

        fun getWeekStart(today: LocalDate): LocalDate {
            return if (today.dayOfWeek == DayOfWeek.SUNDAY) today
            else today.with(TemporalAdjusters.previous(DayOfWeek.SUNDAY))
        }

        fun refreshAllWidgets(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, TodoWidgetProvider::class.java)
            )
            val provider = TodoWidgetProvider()
            ids.forEach { provider.updateWidget(context, manager, it) }
        }

        private fun applyDateRollover(context: Context) {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
            val lastToday = prefs.getString(KEY_LAST_TODAY, null)
            if (lastToday == today) return

            val selectedDate = prefs.getString(KEY_SELECTED_DATE, null)
            val wasFollowingToday = lastToday == null || selectedDate == null || selectedDate == lastToday
            prefs.edit().apply {
                putString(KEY_LAST_TODAY, today)
                if (wasFollowingToday) {
                    putInt(KEY_WEEK_OFFSET, 0)
                    putString(KEY_SELECTED_DATE, today)
                }
            }.apply()
        }
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        scheduleMidnightRefresh(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        cancelMidnightRefresh(context)
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        scheduleMidnightRefresh(context)
        appWidgetIds.forEach { widgetId ->
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: android.os.Bundle
    ) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        updateWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

        when (intent.action) {
            Intent.ACTION_DATE_CHANGED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
            Intent.ACTION_BOOT_COMPLETED,
            ACTION_MIDNIGHT -> {
                // 날짜가 바뀌었을 수 있다: 선택 날짜를 오늘로 넘기고, 위젯을 다시 그리고, 다음 자정 알람을 다시 예약한다.
                // 데이터를 불러오는 동안 프로세스가 끝나지 않도록 잠시 수신 상태를 유지한다.
                val pendingResult = goAsync()
                applyDateRollover(context)
                refreshAllWidgets(context)
                scheduleMidnightRefresh(context)
                Handler(Looper.getMainLooper()).postDelayed({ pendingResult.finish() }, 8000)
            }

            ACTION_TOGGLE_DONE -> {
                val id = intent.getIntExtra(EXTRA_TODO_ID, -1)
                val done = intent.getBooleanExtra(EXTRA_DONE, false)
                if (id != -1) {
                    CoroutineScope(Dispatchers.IO).launch {
                        runCatching {
                            val url = URL("$API_URL?id=$id")
                            val conn = url.openConnection() as HttpURLConnection
                            conn.requestMethod = "PATCH"
                            conn.setRequestProperty("Content-Type", "application/json")
                            conn.doOutput = true
                            conn.outputStream.write("{\"done\":$done}".toByteArray())
                            conn.inputStream.close()
                            conn.disconnect()
                        }
                        refreshAllWidgets(context)
                    }
                }
            }

            ACTION_SELECT_DATE -> {
                val date = intent.getStringExtra(EXTRA_DATE) ?: return
                prefs.edit().putString(KEY_SELECTED_DATE, date).apply()
                refreshAllWidgets(context)
            }

            ACTION_WEEK_PREV -> {
                val cur = prefs.getInt(KEY_WEEK_OFFSET, 0)
                prefs.edit()
                    .putInt(KEY_WEEK_OFFSET, cur - 1)
                    .remove(KEY_SELECTED_DATE) // 주 이동시 선택 해제 → 해당 주 첫날로
                    .apply()
                refreshAllWidgets(context)
            }

            ACTION_WEEK_NEXT -> {
                val cur = prefs.getInt(KEY_WEEK_OFFSET, 0)
                prefs.edit()
                    .putInt(KEY_WEEK_OFFSET, cur + 1)
                    .remove(KEY_SELECTED_DATE)
                    .apply()
                refreshAllWidgets(context)
            }

            ACTION_WEEK_TODAY -> {
                prefs.edit()
                    .putInt(KEY_WEEK_OFFSET, 0)
                    .putString(KEY_SELECTED_DATE, LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE))
                    .apply()
                refreshAllWidgets(context)
            }
        }
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        applyDateRollover(context)
        val options = manager.getAppWidgetOptions(widgetId)
        val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
        val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)

        // Launcher-provided dp dimensions are used so the widget changes UI immediately while resizing.
        if (minWidth >= 220 && minHeight in 1 until 105) {
            updateWideCompactWidget(context, manager, widgetId)
            return
        }
        if ((minWidth in 1 until 220) || (minHeight in 1 until 105)) {
            updateCompactWidget(context, manager, widgetId)
            return
        }
        if (minHeight in 105 until 170) {
            updateMediumWidget(context, manager, widgetId)
            return
        }

        val views = RemoteViews(context.packageName, R.layout.widget_layout)
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

        val today = LocalDate.now()
        val weekOffset = prefs.getInt(KEY_WEEK_OFFSET, 0)
        val weekStart = getWeekStart(today).plusWeeks(weekOffset.toLong())
        val weekEnd = weekStart.plusDays(6)

        // 선택된 날짜 결정
        val savedSel = prefs.getString(KEY_SELECTED_DATE, null)
        val selectedDate: LocalDate = if (savedSel != null) {
            try {
                val d = LocalDate.parse(savedSel, DateTimeFormatter.ISO_LOCAL_DATE)
                if (d < weekStart || d > weekEnd) {
                    // 주 범위 벗어나면 보정
                    if (today in weekStart..weekEnd) today else weekStart
                } else d
            } catch (e: Exception) {
                if (today in weekStart..weekEnd) today else weekStart
            }
        } else {
            if (today in weekStart..weekEnd) today else weekStart
        }

        // 보정된 선택 날짜 저장
        prefs.edit().putString(KEY_SELECTED_DATE, selectedDate.format(DateTimeFormatter.ISO_LOCAL_DATE)).apply()

        // 헤더 타이틀
        val fmtShort = DateTimeFormatter.ofPattern("M월 d일")
        val rangeText = "${weekStart.format(fmtShort)} – ${weekEnd.format(fmtShort)}"
        views.setTextViewText(R.id.widget_title, rangeText)
        views.setTextViewText(R.id.widget_progress, "불러오는 중")

        // 선택 날짜 헤더
        val selFmt = DateTimeFormatter.ofPattern("M.dd")
        val dowEnArr = arrayOf("SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT")
        val selDow = dowEnArr[selectedDate.dayOfWeek.value % 7]
        views.setTextViewText(
            R.id.widget_selected_date_header,
            "${selectedDate.format(selFmt)} · $selDow"
        )

        // 버튼 PendingIntents
        val addTodoPending = PendingIntent.getActivity(
            context, 0,
            Intent(context, AddEditActivity::class.java).apply {
                putExtra(AddEditActivity.EXTRA_DATE, selectedDate.format(DateTimeFormatter.ISO_LOCAL_DATE))
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val openWebPending = makeOpenWebPending(context, widgetId, 200)
        views.setOnClickPendingIntent(R.id.widget_root, openWebPending)
        views.setOnClickPendingIntent(R.id.widget_open_app_button, addTodoPending)

        views.setOnClickPendingIntent(
            R.id.widget_week_prev,
            makeBroadcastPending(context, ACTION_WEEK_PREV, widgetId, 1000)
        )
        views.setOnClickPendingIntent(
            R.id.widget_week_next,
            makeBroadcastPending(context, ACTION_WEEK_NEXT, widgetId, 1001)
        )
        views.setOnClickPendingIntent(
            R.id.widget_week_today,
            makeBroadcastPending(context, ACTION_WEEK_TODAY, widgetId, 1002)
        )

        // 달력 7칸: 날짜 + 도트 + 클릭 인텐트
        for (i in 0..6) {
            val day = weekStart.plusDays(i.toLong())
            val dayStr = day.format(DateTimeFormatter.ISO_LOCAL_DATE)
            val isToday = day == today
            val isSelected = day == selectedDate

            // 날짜 숫자
            views.setTextViewText(CAL_DAY_IDS[i], day.dayOfMonth.toString())

            // 선택/오늘 하이라이트 우선순위: selected > today
            if (isSelected) {
                if (isToday) {
                    // 오늘이자 선택됨: 시안색 채움
                    views.setInt(CAL_DAY_IDS[i], "setBackgroundResource", R.drawable.bg_widget_cal_today)
                    views.setTextColor(CAL_DAY_IDS[i], Color.parseColor("#6366F1"))
                } else {
                    // 선택만: 테두리 느낌 (시안색 배경 + 원형)
                    views.setInt(CAL_DAY_IDS[i], "setBackgroundResource", R.drawable.bg_widget_cal_today)
                    views.setTextColor(CAL_DAY_IDS[i], Color.parseColor("#6366F1"))
                }
            } else if (isToday) {
                // 오늘이지만 선택 안 됨: 작은 하이라이트 (시안색 텍스트)
                views.setInt(CAL_DAY_IDS[i], "setBackgroundColor", Color.TRANSPARENT)
                views.setTextColor(CAL_DAY_IDS[i], Color.parseColor("#6366F1"))
            } else {
                views.setInt(CAL_DAY_IDS[i], "setBackgroundColor", Color.TRANSPARENT)
                // 일요일 빨강, 토요일 시안, 평일 흰색
                val color = when (i) {
                    0 -> Color.parseColor("#FF6B6B")
                    6 -> Color.parseColor("#6366F1")
                    else -> Color.parseColor("#1F2430")
                }
                views.setTextColor(CAL_DAY_IDS[i], color)
            }

            // 셀 클릭 → SELECT_DATE 브로드캐스트
            val selectIntent = Intent(context, TodoWidgetProvider::class.java).apply {
                action = ACTION_SELECT_DATE
                putExtra(EXTRA_DATE, dayStr)
                // 같은 extras라도 서로 다른 PendingIntent로 인식되도록 data 설정
                data = Uri.parse("todoapp://select/$dayStr")
            }
            val selectPending = PendingIntent.getBroadcast(
                context,
                2000 + i,
                selectIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(CAL_CELL_IDS[i], selectPending)

            // 도트는 일단 숨김 (뒤에서 데이터 가져온 뒤 세팅)
            for (j in 0..2) {
                views.setViewVisibility(CAL_DOT_IDS[i][j], android.view.View.GONE)
            }
        }

        // 리스트 어댑터 연결 — 선택 날짜를 extra로 전달
        val serviceIntent = Intent(context, TodoWidgetService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            putExtra(EXTRA_DATE, selectedDate.format(DateTimeFormatter.ISO_LOCAL_DATE))
            // URI를 selectedDate+offset로 유니크하게 → 어댑터 재생성 보장
            data = Uri.parse("todoapp://list/${selectedDate.format(DateTimeFormatter.ISO_LOCAL_DATE)}/$weekOffset")
        }
        views.setRemoteAdapter(R.id.widget_list, serviceIntent)
        views.setEmptyView(R.id.widget_list, R.id.widget_empty)

        // 아이템 클릭 → TodoDetailPopupActivity
        val itemIntent = Intent(context, TodoDetailPopupActivity::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        }
        val itemFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val itemPending = PendingIntent.getActivity(context, widgetId, itemIntent, itemFlags)
        views.setPendingIntentTemplate(R.id.widget_list, itemPending)

        // 1차 렌더 (Loading + 도트 없음 상태)
        manager.updateAppWidget(widgetId, views)
        manager.notifyAppWidgetViewDataChanged(widgetId, R.id.widget_list)

        // 2차: 서버에서 이번 주 데이터 가져와 진행도 + 도트 렌더
        CoroutineScope(Dispatchers.IO).launch {
            val weekItems = fetchWeekTodos(weekStart, weekEnd)
            val total = weekItems.size
            val done = weekItems.count { it.done }

            // 날짜별 카테고리 색 목록
            val dotsByDay = mutableMapOf<String, MutableList<Int>>()
            weekItems.forEach { item ->
                val color = parseColorSafe(item.categoryColor)
                val list = dotsByDay.getOrPut(item.date) { mutableListOf() }
                if (list.size < 3) list.add(color)
            }

            val updated = RemoteViews(context.packageName, R.layout.widget_layout).apply {
                setTextViewText(R.id.widget_title, rangeText)
                setTextViewText(R.id.widget_progress, "$done/$total 완료")
                setTextViewText(
                    R.id.widget_selected_date_header,
                    "${selectedDate.format(selFmt)} · $selDow"
                )

                setOnClickPendingIntent(R.id.widget_root, openWebPending)
                setOnClickPendingIntent(R.id.widget_open_app_button, addTodoPending)
                setOnClickPendingIntent(
                    R.id.widget_week_prev,
                    makeBroadcastPending(context, ACTION_WEEK_PREV, widgetId, 1000)
                )
                setOnClickPendingIntent(
                    R.id.widget_week_next,
                    makeBroadcastPending(context, ACTION_WEEK_NEXT, widgetId, 1001)
                )
                setOnClickPendingIntent(
                    R.id.widget_week_today,
                    makeBroadcastPending(context, ACTION_WEEK_TODAY, widgetId, 1002)
                )

                for (i in 0..6) {
                    val day = weekStart.plusDays(i.toLong())
                    val dayStr = day.format(DateTimeFormatter.ISO_LOCAL_DATE)
                    val isToday = day == today
                    val isSelected = day == selectedDate

                    setTextViewText(CAL_DAY_IDS[i], day.dayOfMonth.toString())

                    if (isSelected) {
                        setInt(CAL_DAY_IDS[i], "setBackgroundResource", R.drawable.bg_widget_cal_today)
                        setTextColor(CAL_DAY_IDS[i], Color.parseColor("#6366F1"))
                    } else if (isToday) {
                        setInt(CAL_DAY_IDS[i], "setBackgroundColor", Color.TRANSPARENT)
                        setTextColor(CAL_DAY_IDS[i], Color.parseColor("#6366F1"))
                    } else {
                        setInt(CAL_DAY_IDS[i], "setBackgroundColor", Color.TRANSPARENT)
                        val color = when (i) {
                            0 -> Color.parseColor("#FF6B6B")
                            6 -> Color.parseColor("#6366F1")
                            else -> Color.parseColor("#1F2430")
                        }
                        setTextColor(CAL_DAY_IDS[i], color)
                    }

                    // 셀 클릭
                    val sIntent = Intent(context, TodoWidgetProvider::class.java).apply {
                        action = ACTION_SELECT_DATE
                        putExtra(EXTRA_DATE, dayStr)
                        data = Uri.parse("todoapp://select/$dayStr")
                    }
                    val sPending = PendingIntent.getBroadcast(
                        context, 2000 + i, sIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    setOnClickPendingIntent(CAL_CELL_IDS[i], sPending)

                    // 도트 세팅
                    val colors = dotsByDay[dayStr] ?: emptyList()
                    for (j in 0..2) {
                        val dotId = CAL_DOT_IDS[i][j]
                        if (j < colors.size) {
                            setViewVisibility(dotId, android.view.View.VISIBLE)
                            // 선택된 날짜의 연한 배경 위에서도 도트 색을 유지한다.
                            val c = colors[j]
                            setInt(dotId, "setBackgroundColor", c)
                        } else {
                            setViewVisibility(dotId, android.view.View.GONE)
                        }
                    }
                }

                setRemoteAdapter(R.id.widget_list, serviceIntent)
                setEmptyView(R.id.widget_list, R.id.widget_empty)
                setPendingIntentTemplate(R.id.widget_list, itemPending)
            }

            manager.updateAppWidget(widgetId, updated)
            manager.notifyAppWidgetViewDataChanged(widgetId, R.id.widget_list)
        }
    }

    private fun updateCompactWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        val today = LocalDate.now()
        val dateText = today.format(DateTimeFormatter.ofPattern("M월 d일"))
        val dowText = arrayOf("일", "월", "화", "수", "목", "금", "토")[today.dayOfWeek.value % 7]
        val views = RemoteViews(context.packageName, R.layout.widget_layout_compact)
        val openWebPending = makeOpenWebPending(context, widgetId, 300)
        val addPending = makeAddTodoPending(context, today, widgetId, 301)

        views.setTextViewText(R.id.compact_date, "$dateText ${dowText}요일")
        views.setTextViewText(R.id.compact_count, "불러오는 중")
        views.setTextViewText(R.id.compact_title, "오늘의 일정")
        views.setOnClickPendingIntent(R.id.widget_root, openWebPending)
        views.setOnClickPendingIntent(R.id.compact_add, addPending)
        manager.updateAppWidget(widgetId, views)

        CoroutineScope(Dispatchers.IO).launch {
            val todos = fetchDateTodos(today)
            val extras = runCatching { CloudStateClient.fetchDayExtras(today) }.getOrDefault(emptyList())
            val first = todos.firstOrNull { !it.done } ?: todos.firstOrNull()
            val updated = RemoteViews(context.packageName, R.layout.widget_layout_compact).apply {
                setTextViewText(R.id.compact_date, "$dateText ${dowText}요일")
                setTextViewText(R.id.compact_count, "${todos.size + extras.size}개")
                setTextViewText(
                    R.id.compact_title,
                    first?.let { if (it.done) "✓ ${it.title}" else it.title }
                        ?: extras.firstOrNull()?.summary
                        ?: "오늘 일정이 없습니다"
                )
                setOnClickPendingIntent(R.id.widget_root, openWebPending)
                setOnClickPendingIntent(R.id.compact_add, addPending)
                first?.let {
                    setOnClickPendingIntent(
                        R.id.compact_title,
                        makeTodoDetailPending(context, it.id, widgetId, 302)
                    )
                }
            }
            manager.updateAppWidget(widgetId, updated)
        }
    }

    private fun updateWideCompactWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        val today = LocalDate.now()
        val todayValue = today.format(DateTimeFormatter.ISO_LOCAL_DATE)
        val dateText = today.format(DateTimeFormatter.ofPattern("M월 d일"))
        val dowText = arrayOf("일", "월", "화", "수", "목", "금", "토")[today.dayOfWeek.value % 7]
        val openWebPending = makeOpenWebPending(context, widgetId, 350)
        val addPending = makeAddTodoPending(context, today, widgetId, 351)
        val serviceIntent = Intent(context, TodoWidgetService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            putExtra(EXTRA_DATE, todayValue)
            data = Uri.parse("todoapp://wide-list/$todayValue/$widgetId")
        }
        val itemIntent = Intent(context, TodoDetailPopupActivity::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        }
        val itemFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val itemPending = PendingIntent.getActivity(
            context,
            widgetId * 1000 + 352,
            itemIntent,
            itemFlags
        )

        fun createViews(countText: String): RemoteViews {
            return RemoteViews(context.packageName, R.layout.widget_layout_wide_compact).apply {
                setTextViewText(R.id.wide_compact_date, "$dateText ${dowText}요일")
                setTextViewText(R.id.wide_compact_count, countText)
                setOnClickPendingIntent(R.id.widget_root, openWebPending)
                setOnClickPendingIntent(R.id.wide_compact_add, addPending)
                setRemoteAdapter(R.id.wide_compact_list, serviceIntent)
                setEmptyView(R.id.wide_compact_list, R.id.wide_compact_empty)
                setPendingIntentTemplate(R.id.wide_compact_list, itemPending)
            }
        }

        manager.updateAppWidget(widgetId, createViews("불러오는 중"))
        manager.notifyAppWidgetViewDataChanged(widgetId, R.id.wide_compact_list)

        CoroutineScope(Dispatchers.IO).launch {
            val todos = fetchDateTodos(today)
            val extras = runCatching { CloudStateClient.fetchDayExtras(today) }.getOrDefault(emptyList())
            manager.updateAppWidget(widgetId, createViews("${todos.size + extras.size}개 · 스크롤"))
            manager.notifyAppWidgetViewDataChanged(widgetId, R.id.wide_compact_list)
        }
    }

    private fun updateMediumWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        val today = LocalDate.now()
        val dateText = today.format(DateTimeFormatter.ofPattern("M월 d일"))
        val dowText = arrayOf("일", "월", "화", "수", "목", "금", "토")[today.dayOfWeek.value % 7]
        val views = RemoteViews(context.packageName, R.layout.widget_layout_medium)
        val openWebPending = makeOpenWebPending(context, widgetId, 400)
        val addPending = makeAddTodoPending(context, today, widgetId, 401)

        views.setTextViewText(R.id.medium_date, "$dateText ${dowText}요일")
        views.setTextViewText(R.id.medium_progress, "불러오는 중")
        views.setOnClickPendingIntent(R.id.widget_root, openWebPending)
        views.setOnClickPendingIntent(R.id.medium_add, addPending)
        manager.updateAppWidget(widgetId, views)

        CoroutineScope(Dispatchers.IO).launch {
            val todos = fetchDateTodos(today)
            val done = todos.count { it.done }
            val updated = RemoteViews(context.packageName, R.layout.widget_layout_medium).apply {
                setTextViewText(R.id.medium_date, "$dateText ${dowText}요일")
                setTextViewText(R.id.medium_progress, "$done/${todos.size} 완료")
                setOnClickPendingIntent(R.id.widget_root, openWebPending)
                setOnClickPendingIntent(R.id.medium_add, addPending)

                val rowIds = intArrayOf(R.id.medium_title1, R.id.medium_title2)
                rowIds.forEachIndexed { index, rowId ->
                    val todo = todos.getOrNull(index)
                    if (todo == null) {
                        setViewVisibility(rowId, if (index == 0) android.view.View.VISIBLE else android.view.View.GONE)
                        if (index == 0) setTextViewText(rowId, "오늘 일정이 없습니다")
                    } else {
                        setViewVisibility(rowId, android.view.View.VISIBLE)
                        setTextViewText(rowId, if (todo.done) "✓ ${todo.title}" else "• ${todo.title}")
                        setTextColor(rowId, if (todo.done) Color.parseColor("#A8ADBC") else parseColorSafe(todo.categoryColor))
                        setOnClickPendingIntent(
                            rowId,
                            makeTodoDetailPending(context, todo.id, widgetId, 410 + index)
                        )
                    }
                }
            }
            manager.updateAppWidget(widgetId, updated)
        }
    }

    private fun makeOpenWebPending(context: Context, widgetId: Int, suffix: Int): PendingIntent {
        val webUrl = Uri.parse("https://todolist-liart-mu.vercel.app/")
        val openIntent = Intent(Intent.ACTION_VIEW, webUrl).apply {
            addCategory(Intent.CATEGORY_BROWSABLE)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        // Chrome-installed PWAs are separate WebAPK packages. Target that package directly
        // so tapping the widget does not open a Chrome tab before entering the installed app.
        val webAppHandler = context.packageManager
            .queryIntentActivities(openIntent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY)
            .firstOrNull { it.activityInfo.packageName.startsWith("org.chromium.webapk.") }
        if (webAppHandler != null) {
            openIntent.component = ComponentName(
                webAppHandler.activityInfo.packageName,
                webAppHandler.activityInfo.name
            )
        }

        return PendingIntent.getActivity(
            context,
            widgetId * 1000 + suffix,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun makeAddTodoPending(
        context: Context,
        date: LocalDate,
        widgetId: Int,
        suffix: Int
    ): PendingIntent {
        return PendingIntent.getActivity(
            context,
            widgetId * 1000 + suffix,
            Intent(context, AddEditActivity::class.java).apply {
                putExtra(AddEditActivity.EXTRA_DATE, date.format(DateTimeFormatter.ISO_LOCAL_DATE))
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun makeTodoDetailPending(
        context: Context,
        todoId: Int,
        widgetId: Int,
        suffix: Int
    ): PendingIntent {
        return PendingIntent.getActivity(
            context,
            widgetId * 100000 + todoId + suffix,
            Intent(context, TodoDetailPopupActivity::class.java).apply {
                putExtra(EXTRA_TODO_ID, todoId)
                data = Uri.parse("todoapp://detail/$todoId")
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun makeBroadcastPending(context: Context, action: String, widgetId: Int, reqCode: Int): PendingIntent {
        val intent = Intent(context, TodoWidgetProvider::class.java).apply {
            this.action = action
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            data = Uri.parse("todoapp://action/$action/$widgetId")
        }
        return PendingIntent.getBroadcast(
            context, reqCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun parseColorSafe(hex: String): Int {
        return try { Color.parseColor(hex) } catch (e: Exception) { Color.parseColor("#636366") }
    }

    // 이번 주 일정 전체 가져오기 (도트 + 진행도용)
    private data class MiniTodo(val date: String, val categoryColor: String, val done: Boolean)

    private data class DateTodo(
        val id: Int,
        val title: String,
        val categoryColor: String,
        val done: Boolean
    )

    private fun fetchDateTodos(date: LocalDate): List<DateTodo> {
        return runCatching {
            val dateValue = date.format(DateTimeFormatter.ISO_LOCAL_DATE)
            val url = URL("$API_URL?date=$dateValue")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            val response = conn.inputStream.bufferedReader().readText()
            conn.disconnect()
            val arr = JSONArray(response)
            val list = mutableListOf<DateTodo>()
            for (i in 0 until arr.length()) {
                val item = arr.getJSONObject(i)
                list.add(
                    DateTodo(
                        id = item.optInt("id"),
                        title = item.optString("title", "제목 없는 일정"),
                        categoryColor = item.optString("category_color", "#6366F1"),
                        done = item.optBoolean("done")
                    )
                )
            }
            // 웹앱에서 정한 일정 순서를 적용 (정한 적이 없으면 시간순 그대로)
            val order = if (list.size > 1) {
                runCatching { CloudStateClient.fetchItemOrder(date) }.getOrDefault(emptyList())
            } else {
                emptyList()
            }
            applyItemOrder(list, order) { it.id.toString() }
        }.getOrDefault(emptyList())
    }

    private fun fetchWeekTodos(weekStart: LocalDate, weekEnd: LocalDate): List<MiniTodo> {
        return runCatching {
            val fromDate = weekStart.format(DateTimeFormatter.ISO_LOCAL_DATE)
            val toDate = weekEnd.format(DateTimeFormatter.ISO_LOCAL_DATE)
            val url = URL("$API_URL?from=$fromDate&to=$toDate")
            val conn = url.openConnection() as HttpURLConnection
            val response = conn.inputStream.bufferedReader().readText()
            conn.disconnect()
            val arr = JSONArray(response)
            val list = mutableListOf<MiniTodo>()
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                list.add(
                    MiniTodo(
                        date = o.optString("date"),
                        categoryColor = o.optString("category_color", "#636366"),
                        done = o.optBoolean("done")
                    )
                )
            }
            list
        }.getOrDefault(emptyList())
    }
}
