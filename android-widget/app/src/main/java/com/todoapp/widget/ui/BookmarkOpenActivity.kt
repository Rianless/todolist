package com.todoapp.widget.ui

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import com.todoapp.widget.data.isOpenableBookmarkUrl

/**
 * 북마크 위젯에서 항목을 누르면 거치는 화면 없는 중간 단계.
 * 위젯의 PendingIntent 는 대상이 정해진(explicit) 인텐트여야 해서(Android 14+), 먼저 이 액티비티를 열고
 * 여기서 http(s) 주소인지 확인한 뒤 브라우저로 넘긴다.
 */
class BookmarkOpenActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val uri = intent?.data
        if (uri != null && isOpenableBookmarkUrl(uri.toString())) {
            runCatching {
                startActivity(
                    Intent(Intent.ACTION_VIEW, uri).apply {
                        addCategory(Intent.CATEGORY_BROWSABLE)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                )
            }
        }
        finish()
    }
}
