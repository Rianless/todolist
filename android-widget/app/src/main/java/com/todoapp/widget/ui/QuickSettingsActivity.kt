package com.todoapp.widget.ui

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.InputType
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import com.todoapp.widget.quick.QuickNotifier
import com.todoapp.widget.quick.QuickPrefs

/** 결제 알림 간편입력 설정: 켜기/끄기, 가계부 비밀번호(토큰), 서버 주소, 감시할 앱, 권한, 테스트 알림 */
class QuickSettingsActivity : AppCompatActivity() {
    private lateinit var prefs: QuickPrefs
    private lateinit var status: TextView

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    private fun label(text: String) = TextView(this).apply {
        this.text = text; textSize = 14f; setPadding(0, dp(14), 0, dp(4))
    }

    private fun field(value: String, hint: String, secret: Boolean = false) = EditText(this).apply {
        setText(value); this.hint = hint; setSingleLine(true)
        inputType = InputType.TYPE_CLASS_TEXT or
            (if (secret) InputType.TYPE_TEXT_VARIATION_PASSWORD else InputType.TYPE_TEXT_VARIATION_URI)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        title = "결제 알림 간편입력"
        prefs = QuickPrefs(this)

        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(20), dp(16), dp(20), dp(32)) }
        val intro = TextView(this).apply {
            text = "결제 알림이 오면 알림 칸에 입력창이 내려와요. 거기에 '올리브영 만원'처럼 적고 보내면 가계부에 저장돼요."
            textSize = 14f
        }
        val enabledSwitch = Switch(this).apply { text = "결제 알림에 입력칸 띄우기"; isChecked = prefs.enabled; setPadding(0, dp(12), 0, 0) }
        val token = field(prefs.token, "가계부 비밀번호 (LEDGER_TOKEN)", secret = true)
        val url = field(prefs.baseUrl, "https://...vercel.app")
        val pkgs = field(prefs.packages, "viva.republica.toss")
        status = TextView(this).apply { textSize = 13f; setPadding(0, dp(12), 0, 0) }

        val save = Button(this).apply {
            text = "저장"
            setOnClickListener {
                prefs.enabled = enabledSwitch.isChecked
                prefs.token = token.text.toString()
                prefs.baseUrl = url.text.toString()
                prefs.packages = pkgs.text.toString()
                Toast.makeText(context, "저장했어요", Toast.LENGTH_SHORT).show()
                refreshStatus()
            }
        }
        val listenerBtn = Button(this).apply {
            text = "① 알림 읽기 허용 열기"
            setOnClickListener { startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) }
        }
        val postBtn = Button(this).apply {
            text = "② 알림 표시 허용"
            setOnClickListener {
                if (Build.VERSION.SDK_INT >= 33) {
                    ActivityCompat.requestPermissions(this@QuickSettingsActivity, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
                } else {
                    startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, packageName))
                }
            }
        }
        val testBtn = Button(this).apply {
            text = "③ 테스트 알림 보내기"
            setOnClickListener {
                prefs.token = token.text.toString(); prefs.baseUrl = url.text.toString()
                QuickNotifier.showPrompt(applicationContext, 777, "테스트 결제 4,500원")
                Toast.makeText(context, "알림 칸을 내려 보세요", Toast.LENGTH_SHORT).show()
            }
        }

        listOf<View>(
            intro, enabledSwitch,
            label("가계부 비밀번호 (Vercel 의 LEDGER_TOKEN 과 같은 값)"), token,
            label("가계부 서버 주소"), url,
            label("감시할 앱 이름(패키지). 기본은 토스. 여러 개면 쉼표로 구분"), pkgs,
            save, listenerBtn, postBtn, testBtn, status
        ).forEach { root.addView(it) }
        setContentView(ScrollView(this).apply { addView(root) })
    }

    override fun onResume() { super.onResume(); refreshStatus() }

    private fun refreshStatus() {
        val listening = NotificationManagerCompat.getEnabledListenerPackages(this).contains(packageName)
        val posting = NotificationManagerCompat.from(this).areNotificationsEnabled()
        status.text = "알림 읽기: ${if (listening) "허용됨 ✓" else "아직 허용 안 됨 ✗"}\n" +
            "알림 표시: ${if (posting) "허용됨 ✓" else "아직 허용 안 됨 ✗"}\n" +
            "비밀번호: ${if (prefs.token.isNotBlank()) "입력됨 ✓" else "비어 있음 ✗"}"
    }
}
