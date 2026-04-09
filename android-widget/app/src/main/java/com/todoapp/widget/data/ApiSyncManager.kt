package com.todoapp.widget.data

import android.content.Context
import com.google.gson.Gson
import com.google.gson.JsonArray
import java.net.HttpURLConnection
import java.net.URL

object ApiSyncManager {

    private const val PREFS_NAME = "todo_prefs"
    const val KEY_API_URL = "api_url"

    fun getApiUrl(context: Context): String {
        val saved = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_API_URL, "") ?: ""
        return if (saved.isNotEmpty()) saved else com.todoapp.widget.BuildConfig.API_URL
    }

    fun setApiUrl(context: Context, url: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putString(KEY_API_URL, url.trim()).apply()
    }

    /**
     * Fetch todos from the web API and save to Room DB.
     * The API returns Supabase data in snake_case format.
     * Returns true if sync succeeded, false otherwise.
     */
    suspend fun syncFromApi(context: Context): Boolean {
        val apiUrl = getApiUrl(context)
        if (apiUrl.isEmpty()) return false

        return try {
            val connection = URL(apiUrl).openConnection() as HttpURLConnection
            connection.apply {
                requestMethod = "GET"
                connectTimeout = 10_000
                readTimeout = 10_000
                setRequestProperty("Accept", "application/json")
            }

            if (connection.responseCode == 200) {
                val json = connection.inputStream.bufferedReader().readText()
                val array = Gson().fromJson(json, JsonArray::class.java)

                val todos = array.mapNotNull { element ->
                    try {
                        val obj = element.asJsonObject
                        val date = obj.get("date")?.asString?.takeIf { it.isNotEmpty() }
                            ?: return@mapNotNull null
                        val title = obj.get("title")?.asString?.takeIf { it.isNotEmpty() }
                            ?: return@mapNotNull null

                        Todo(
                            date = date,
                            title = title,
                            startTime = obj.get("start_time")?.asString ?: "",
                            endTime = obj.get("end_time")?.asString ?: "",
                            allDay = obj.get("all_day")?.asBoolean ?: false,
                            category = obj.get("category")?.asString ?: "기타",
                            categoryColor = obj.get("category_color")?.asString ?: "#636366",
                            location = obj.get("location")?.asString ?: "",
                            note = obj.get("note")?.asString ?: "",
                            content = obj.get("content")?.asString ?: "",
                            done = obj.get("done")?.asBoolean ?: false
                        )
                    } catch (e: Exception) {
                        null
                    }
                }

                val dao = TodoDatabase.getDatabase(context).todoDao()
                dao.deleteAll()
                dao.insertAll(todos)
                true
            } else {
                false
            }
        } catch (e: Exception) {
            false
        }
    }
}
