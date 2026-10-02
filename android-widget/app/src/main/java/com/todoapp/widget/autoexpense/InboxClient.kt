package com.todoapp.widget.autoexpense

import android.content.Context
import android.os.Handler
import android.os.Looper
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/** 감지한 결제를 서버 받은편지함(/api/inbox)으로 보낸다. 보내지 못하면 대기열에 남겨 다시 시도한다. */
object InboxClient {
    private const val INBOX_URL = "https://todolist-liart-mu.vercel.app/api/inbox"
    private val executor = Executors.newSingleThreadExecutor()

    enum class Result { SENT, UNAUTHORIZED, NOT_CONFIGURED, REJECTED, NETWORK }

    /** 결제 한 건을 대기열에 넣고 바로 보낸다. onRemaining 에는 아직 못 보낸 건수가 전달된다. */
    fun submit(context: Context, payment: PendingPayment, onRemaining: ((Int) -> Unit)? = null) {
        val appContext = context.applicationContext
        executor.execute {
            val prefs = AutoExpensePrefs(appContext)
            val queue = prefs.pending().toMutableList()
            if (queue.none { it.uid == payment.uid }) queue.add(payment)
            prefs.setPending(queue)
            onRemaining?.invoke(flushNow(appContext))
        }
    }

    /** 대기열에 남은 결제를 다시 보낸다. */
    fun flush(context: Context, onRemaining: ((Int) -> Unit)? = null) {
        val appContext = context.applicationContext
        executor.execute {
            val remaining = flushNow(appContext)
            onRemaining?.invoke(remaining)
        }
    }

    /** 설정 화면의 "테스트 결제 보내기": 대기열을 거치지 않고 결과를 그대로 알려준다. (결과는 메인 스레드로 전달) */
    fun sendTest(context: Context, payment: PendingPayment, onResult: (Result) -> Unit) {
        val appContext = context.applicationContext
        executor.execute {
            val key = AutoExpensePrefs(appContext).inboxKey
            val result = if (key.isBlank()) Result.UNAUTHORIZED else post(payment, key)
            Handler(Looper.getMainLooper()).post { onResult(result) }
        }
    }

    private fun flushNow(context: Context): Int {
        val prefs = AutoExpensePrefs(context)
        val queue = prefs.pending().toMutableList()
        if (queue.isEmpty()) return 0
        val key = prefs.inboxKey
        if (key.isBlank()) {
            prefs.setStatus("비밀키를 입력해 주세요 (대기 ${queue.size}건)")
            return queue.size
        }
        val iterator = queue.iterator()
        while (iterator.hasNext()) {
            val payment = iterator.next()
            when (post(payment, key)) {
                Result.SENT -> {
                    iterator.remove()
                    prefs.setStatus("보냄: ${payment.merchant} ${"%,d".format(payment.amount)}원")
                }
                Result.REJECTED -> {
                    iterator.remove()
                    prefs.setStatus("서버가 받지 않는 결제는 건너뜀: ${payment.merchant}")
                }
                Result.UNAUTHORIZED -> { prefs.setStatus("비밀키가 서버와 달라요"); break }
                Result.NOT_CONFIGURED -> { prefs.setStatus("서버에 INBOX_KEY 환경변수를 설정해 주세요"); break }
                Result.NETWORK -> { prefs.setStatus("서버에 연결하지 못했어요. 나중에 다시 보낼게요"); break }
            }
        }
        prefs.setPending(queue)
        return queue.size
    }

    private fun post(payment: PendingPayment, key: String): Result {
        return try {
            val connection = URL(INBOX_URL).openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.connectTimeout = 8000
            connection.readTimeout = 8000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("x-inbox-key", key)
            connection.outputStream.use { it.write(payment.toJson().toString().toByteArray()) }
            val code = connection.responseCode
            connection.disconnect()
            when (code) {
                in 200..299 -> Result.SENT
                401 -> Result.UNAUTHORIZED
                503 -> Result.NOT_CONFIGURED
                in 400..499 -> Result.REJECTED
                else -> Result.NETWORK
            }
        } catch (e: Exception) {
            Result.NETWORK
        }
    }
}
