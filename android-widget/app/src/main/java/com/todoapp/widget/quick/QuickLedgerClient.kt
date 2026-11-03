package com.todoapp.widget.quick

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

sealed class QuickResult {
    /** 가계부에 저장됨 */
    data class Added(val title: String, val amount: Long, val type: String) : QuickResult()
    /** 5분 안에 같은 내역이 이미 있어 건너뜀 */
    object Duplicate : QuickResult()
    /** 서버가 글에서 금액을 못 찾음 */
    object NoAmount : QuickResult()
    /** 앱에 비밀번호를 아직 저장하지 않음 */
    object NoToken : QuickResult()
    /** 서버가 비밀번호를 거절함 */
    object BadToken : QuickResult()
    /** 네트워크·서버 오류 */
    data class Failed(val message: String) : QuickResult()
}

/** 글 한 줄을 /api/ledger 의 quick 입력으로 보낸다. 반드시 백그라운드 스레드에서 부른다. */
object QuickLedgerClient {
    /** 직접 적은 글("올리브영 만원")을 보낸다. */
    fun send(baseUrl: String, token: String, quickText: String): QuickResult =
        post(baseUrl, token, JSONObject().put("quick", quickText))

    /** 알림 글 그대로("…에서 4,500원 결제했어요")를 보낸다. 서버가 가게 이름·금액을 읽어서 저장한다. */
    fun sendNotificationText(baseUrl: String, token: String, notificationText: String): QuickResult =
        post(baseUrl, token, JSONObject().put("text", notificationText).put("memo", "자동입력(알림)"))

    private fun post(baseUrl: String, token: String, bodyJson: JSONObject): QuickResult {
        val endpoint = QuickLedgerLogic.ledgerEndpoint(baseUrl)
            ?: return QuickResult.Failed("서버 주소가 올바르지 않아요")
        if (token.isBlank()) return QuickResult.NoToken
        var conn: HttpURLConnection? = null
        return try {
            conn = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 10_000
                readTimeout = 15_000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                setRequestProperty("x-ledger-token", token)
            }
            val body = bodyJson.toString()
            conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            val text = (if (code < 400) conn.inputStream else conn.errorStream)
                ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            val json = runCatching { JSONObject(text) }.getOrNull()
            when {
                code == 401 -> QuickResult.BadToken
                code >= 400 -> QuickResult.Failed(json?.optString("error").orEmpty().ifEmpty { "서버 오류($code)" })
                json?.optBoolean("duplicate") == true -> QuickResult.Duplicate
                json?.optBoolean("ignored") == true -> QuickResult.NoAmount
                json?.optJSONObject("added") != null -> {
                    val a = json.getJSONObject("added")
                    QuickResult.Added(a.optString("title"), a.optLong("amount"), a.optString("type"))
                }
                else -> QuickResult.Failed("서버 응답을 이해하지 못했어요")
            }
        } catch (e: Exception) {
            QuickResult.Failed(e.message ?: "네트워크 오류")
        } finally {
            conn?.disconnect()
        }
    }
}
