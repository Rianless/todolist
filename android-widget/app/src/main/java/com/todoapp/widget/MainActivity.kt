package com.todoapp.widget

import android.app.AlertDialog
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.widget.EditText
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.todoapp.widget.data.ApiSyncManager
import com.todoapp.widget.databinding.ActivityMainBinding
import com.todoapp.widget.ui.AddEditActivity
import com.todoapp.widget.ui.TodoAdapter
import com.todoapp.widget.ui.TodoViewModel
import com.todoapp.widget.widget.TodoWidgetProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var viewModel: TodoViewModel
    private lateinit var adapter: TodoAdapter

    private val addEditLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            refreshWidget()
        }
    }

    private val importLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let {
            try {
                val json = contentResolver.openInputStream(it)
                    ?.bufferedReader()?.readText() ?: return@let
                viewModel.importFromJson(json) { count ->
                    runOnUiThread {
                        if (count >= 0) {
                            Toast.makeText(this, "✅ ${count}개 항목 가져오기 완료", Toast.LENGTH_SHORT).show()
                            refreshWidget()
                        } else {
                            Toast.makeText(this, "❌ JSON 형식 오류", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            } catch (e: Exception) {
                Toast.makeText(this, "❌ 파일 읽기 실패", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // 앱 아이콘 → TDL 웹앱으로 바로 이동
        startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse(com.todoapp.widget.BuildConfig.WEB_URL)))
        finish()
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.menu_main, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_set_api_url -> {
                showApiUrlDialog()
                true
            }
            R.id.action_sync_now -> {
                syncNow()
                true
            }
            R.id.action_import -> {
                importLauncher.launch("application/json")
                true
            }
            R.id.action_export -> {
                viewModel.exportToJson { json ->
                    runOnUiThread { shareJson(json) }
                }
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun showApiUrlDialog() {
        val currentUrl = ApiSyncManager.getApiUrl(this)
        val input = EditText(this).apply {
            setText(currentUrl)
            hint = getString(R.string.hint_api_url)
            setSingleLine(true)
        }
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.dialog_api_url_title))
            .setView(input)
            .setPositiveButton("저장") { _, _ ->
                val url = input.text.toString().trim()
                ApiSyncManager.setApiUrl(this, url)
                if (url.isNotEmpty()) syncNow()
            }
            .setNegativeButton("취소", null)
            .show()
    }

    private fun syncNow() {
        val apiUrl = ApiSyncManager.getApiUrl(this)
        if (apiUrl.isEmpty()) {
            Toast.makeText(this, getString(R.string.sync_no_url), Toast.LENGTH_SHORT).show()
            return
        }
        lifecycleScope.launch {
            val success = withContext(Dispatchers.IO) {
                ApiSyncManager.syncFromApi(this@MainActivity)
            }
            val msg = if (success) getString(R.string.sync_success) else getString(R.string.sync_fail)
            Toast.makeText(this@MainActivity, msg, Toast.LENGTH_SHORT).show()
            if (success) refreshWidget()
        }
    }

    private fun shareJson(json: String) {
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "application/json"
            putExtra(Intent.EXTRA_TEXT, json)
            putExtra(Intent.EXTRA_SUBJECT, "TodoList 내보내기")
        }
        startActivity(Intent.createChooser(intent, "JSON 공유"))
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
