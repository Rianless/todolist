package com.todoapp.widget.ui

import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.text.InputType
import android.util.TypedValue
import android.view.View
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SwitchCompat
import androidx.core.app.NotificationManagerCompat
import com.todoapp.widget.autoexpense.AutoExpensePrefs
import com.todoapp.widget.autoexpense.InboxClient
import com.todoapp.widget.autoexpense.PendingPayment
import java.time.LocalDate
import java.util.UUID

/**
 * 자동 가계부 설정: 결제 알림을 읽어 웹 가계부의 "확인 대기함"으로 보낸다.
 * 화면을 코드로 만들어 레이아웃 파일 없이 동작한다.
 */
class AutoExpenseSettingsActivity : AppCompatActivity() {
    private lateinit var prefs: AutoExpensePrefs
    private lateinit var root: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = AutoExpensePrefs(this)
        val scroll = ScrollView(this)
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(24), dp(20), dp(32))
        }
        scroll.addView(root)
        setContentView(scroll)
    }

    override fun onResume() {
        super.onResume()
        render()
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    private fun text(content: String, sizeSp: Float = 14f, bold: Boolean = false, color: Int = Color.parseColor("#1F2430")): TextView {
        return TextView(this).apply {
            text = content
            setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
            setTextColor(color)
            if (bold) setTypeface(typeface, Typeface.BOLD)
            setPadding(0, dp(4), 0, dp(4))
        }
    }

    private fun gap(heightDp: Int = 16) = View(this).apply { minimumHeight = dp(heightDp) }

    private fun section(title: String) {
        root.addView(gap(20))
        root.addView(text(title, 16f, true, Color.parseColor("#6366F1")))
    }

    private fun button(label: String, onClick: () -> Unit) = Button(this).apply {
        text = label
        isAllCaps = false
        setOnClickListener { onClick() }
    }

    private fun listenerAllowed() = NotificationManagerCompat.getEnabledListenerPackages(this).contains(packageName)

    private fun render() {
        root.removeAllViews()
        root.addView(text("자동 가계부", 24f, true))
        root.addView(text("간편결제 앱의 결제 알림을 읽어 금액과 가맹점만 뽑아 웹 가계부의 '확인 대기함'으로 보내요. 알림 내용은 저장하거나 보내지 않아요.", 13f, color = Color.parseColor("#5D6476")))

        // 1) 알림 접근 권한
        section("1. 알림 접근 권한")
        val allowed = listenerAllowed()
        root.addView(text(if (allowed) "✅ 허용됨" else "⚠️ 아직 허용되지 않았어요", 14f, true, Color.parseColor(if (allowed) "#2DA77A" else "#E45F68")))
        root.addView(button(if (allowed) "알림 접근 설정 열기" else "알림 접근 허용하러 가기") {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        })
        root.addView(text("목록에서 이 앱을 켜 주세요. Android 13 이상에서 켜지지 않으면: 앱 정보 → 오른쪽 위 ⋮ → '제한된 설정 허용'을 누른 뒤 다시 켜세요.", 12f, color = Color.parseColor("#8A90A2")))
        root.addView(button("앱 정보 열기") {
            startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
        })

        // 2) 켜기 + 비밀키
        section("2. 자동 기록")
        root.addView(SwitchCompat(this).apply {
            text = "결제 알림 자동 기록"
            isChecked = prefs.enabled
            setOnCheckedChangeListener { _, checked -> prefs.enabled = checked }
        })
        root.addView(gap(8))
        root.addView(text("비밀키 (서버의 INBOX_KEY와 같은 값)", 13f, true))
        val keyInput = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            hint = if (prefs.inboxKey.isBlank()) "비밀키 입력" else "저장됨 (${prefs.inboxKey.length}자) · 바꾸려면 새로 입력"
            setSingleLine()
        }
        root.addView(keyInput)
        root.addView(button("비밀키 저장") {
            val value = keyInput.text.toString().trim()
            if (value.isEmpty()) {
                toast("비밀키를 입력해 주세요")
            } else {
                prefs.inboxKey = value
                toast("저장했어요")
                render()
            }
        })

        // 3) 감지할 앱
        section("3. 감지할 앱")
        val allowedPackages = prefs.allowedPackages.toMutableSet()
        AutoExpensePrefs.DEFAULT_APPS.forEach { (pkg, name) ->
            root.addView(CheckBox(this).apply {
                text = "$name\n$pkg"
                isChecked = pkg in allowedPackages
                setOnCheckedChangeListener { _, checked ->
                    if (checked) allowedPackages.add(pkg) else allowedPackages.remove(pkg)
                    prefs.allowedPackages = allowedPackages
                }
            })
        }
        val extra = prefs.allowedPackages.filter { it !in AutoExpensePrefs.DEFAULT_APPS.keys }
        extra.forEach { pkg ->
            root.addView(CheckBox(this).apply {
                text = "${prefs.sourceLabel(pkg)}\n$pkg"
                isChecked = true
                setOnCheckedChangeListener { _, checked ->
                    val set = prefs.allowedPackages.toMutableSet()
                    if (checked) set.add(pkg) else set.remove(pkg)
                    prefs.allowedPackages = set
                }
            })
        }
        val candidates = prefs.observed().filter { (pkg, _) -> pkg !in prefs.allowedPackages }
        if (candidates.isNotEmpty()) {
            root.addView(gap(8))
            root.addView(text("결제처럼 보이는 알림을 보낸 다른 앱 (원하는 앱만 허용하세요)", 13f, true))
            candidates.forEach { (pkg, count) ->
                root.addView(LinearLayout(this).apply {
                    orientation = LinearLayout.HORIZONTAL
                    addView(text("${prefs.sourceLabel(pkg)} · ${count}회\n$pkg", 12f).apply { layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f) })
                    addView(button("허용") {
                        prefs.allowedPackages = prefs.allowedPackages + pkg
                        prefs.forgetObserved(pkg)
                        render()
                    })
                })
            }
        }

        // 4) 확인
        section("4. 확인")
        root.addView(button("테스트 결제 보내기") { sendTest() })
        val pending = prefs.pending().size
        if (pending > 0) {
            root.addView(text("아직 보내지 못한 결제 ${pending}건", 13f, true, Color.parseColor("#E45F68")))
            root.addView(button("지금 다시 보내기") {
                InboxClient.flush(this) { remaining -> runOnUiThread { toast(if (remaining == 0) "모두 보냈어요" else "${remaining}건이 남았어요"); render() } }
            })
        }
        root.addView(text(prefs.lastStatus.ifBlank { "아직 보낸 기록이 없어요" }, 12f, color = Color.parseColor("#8A90A2")))
        root.addView(text("웹 가계부(가계부 탭)에 '자동 감지된 결제' 배너가 뜨면 확인하고 추가하면 돼요.", 12f, color = Color.parseColor("#8A90A2")))
    }

    private fun sendTest() {
        if (prefs.inboxKey.isBlank()) {
            toast("먼저 비밀키를 저장해 주세요")
            return
        }
        val payment = PendingPayment(
            uid = UUID.randomUUID().toString().replace("-", ""),
            date = LocalDate.now().toString(),
            time = "",
            amount = 1000,
            merchant = "테스트 결제",
            source = "테스트"
        )
        InboxClient.sendTest(this, payment) { result ->
            val message = when (result) {
                InboxClient.Result.SENT -> "보냈어요! 웹 가계부에서 '테스트 결제'가 보이는지 확인해 보세요"
                InboxClient.Result.UNAUTHORIZED -> "비밀키가 서버와 달라요"
                InboxClient.Result.NOT_CONFIGURED -> "서버에 INBOX_KEY 환경변수를 설정해 주세요"
                InboxClient.Result.REJECTED -> "서버가 받지 않았어요"
                InboxClient.Result.NETWORK -> "서버에 연결하지 못했어요"
            }
            toast(message)
        }
    }

    private fun toast(message: String) = Toast.makeText(this, message, Toast.LENGTH_LONG).show()
}
