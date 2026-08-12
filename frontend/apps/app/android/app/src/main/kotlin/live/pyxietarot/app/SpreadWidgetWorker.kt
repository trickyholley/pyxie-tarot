// SPDX-License-Identifier: AGPL-3.0-or-later
package live.pyxietarot.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private const val WIDGET_PREFS_NAME = "widget_prefs"
private const val AUTH_TOKEN_KEY = "auth_token"

// Mirrors capacitor.config.ts's `server.url` + @pyxie/api-client's default API base path - there's no
// WebView here to inherit a relative origin from, so this has to be absolute.
private const val API_BASE_URL = "https://pyxietarot.live/api/v1"

private const val LOGGED_OUT_TEXT = "Log in to see today's reading"

/** Refreshes every placed widget instance with the current reading state: logged-out, no entry yet
 * today, or today's spread name. */
class SpreadWidgetWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result =
        withContext(Dispatchers.IO) {
            val prefs = applicationContext.getSharedPreferences(WIDGET_PREFS_NAME, 0)
            val token = prefs.getString(AUTH_TOKEN_KEY, null)
            if (token == null) {
                updateAllWidgets(applicationContext, LOGGED_OUT_TEXT)
                return@withContext Result.success()
            }

            try {
                fetchTodayState(token, prefs).also { updateAllWidgets(applicationContext, it) }
                Result.success()
            } catch (e: Exception) {
                // Network hiccup or unexpected response shape - leave the widget showing its last
                // known state rather than blanking it out, and let WorkManager retry later.
                Result.retry()
            }
        }

    private fun fetchTodayState(token: String, prefs: SharedPreferences): String {
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        val url = URL("$API_BASE_URL/diary-entries?entry_date_from=$today&entry_date_to=$today")
        val connection = url.openConnection() as HttpURLConnection
        connection.setRequestProperty("Authorization", "Bearer $token")

        try {
            return when (connection.responseCode) {
                HttpURLConnection.HTTP_OK -> {
                    val body = connection.inputStream.bufferedReader().use { it.readText() }
                    val items = JSONObject(body).getJSONArray("items")
                    if (items.length() == 0) {
                        "No reading yet today — tap to draw"
                    } else {
                        "Today: ${items.getJSONObject(0).getString("spread_name")}"
                    }
                }
                HttpURLConnection.HTTP_UNAUTHORIZED -> {
                    prefs.edit().remove(AUTH_TOKEN_KEY).apply()
                    LOGGED_OUT_TEXT
                }
                else -> throw IOException("Unexpected response ${connection.responseCode}")
            }
        } finally {
            connection.disconnect()
        }
    }
}

private fun updateAllWidgets(context: Context, text: String) {
    val manager = AppWidgetManager.getInstance(context)
    val ids = manager.getAppWidgetIds(ComponentName(context, SpreadWidgetProvider::class.java))
    for (id in ids) {
        manager.updateAppWidget(id, buildWidgetViews(context, text))
    }
}
