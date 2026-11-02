package com.todoapp.widget.data

import com.todoapp.widget.BuildConfig
import java.net.HttpURLConnection

/**
 * 서버(/api/state, /api/todos)가 접근 토큰(APP_TOKEN)을 요구할 때 요청 헤더에 붙인다.
 * 토큰은 소스에 적지 않고 빌드할 때 gradle 속성/환경변수 APP_TOKEN 으로 넣는다. (비어 있으면 헤더를 붙이지 않음)
 */
fun HttpURLConnection.applyAppToken() {
    if (BuildConfig.APP_TOKEN.isNotEmpty()) setRequestProperty("x-app-token", BuildConfig.APP_TOKEN)
}
