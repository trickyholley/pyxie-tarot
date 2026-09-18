// SPDX-License-Identifier: AGPL-3.0-or-later
package live.pyxietarot.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import coil3.ImageLoader
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.MalformedURLException
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private const val WIDGET_PREFS_NAME = "widget_prefs"
private const val AUTH_TOKEN_KEY = "auth_token"
private const val TAG = "SpreadWidgetWorker"

// Matches the VITE_API_BASE_URL the prod frontend is actually built with (infra/deploy-frontend.sh) -
// the API lives on its own subdomain, not `pyxietarot.live` itself (that origin is static S3/CloudFront
// only, no backend behind it). There's no WebView here to inherit this from, so it has to be hardcoded.
private const val API_BASE_URL = "https://api.pyxietarot.live/api/v1"

// Matches useCardArt.ts's SYSTEM_DECK_NAME - card art comes from the same system deck the in-app
// reading flow uses.
private const val SYSTEM_DECK_NAME = "Rider-Waite-Smith"

private const val NO_ENTRY_TITLE = "Today awaits"
private const val NO_ENTRY_SUBTITLE = "Tap to draw your cards"

private const val PATH_LOGIN = "/login"
private const val PATH_READING = "/reading"
internal const val KEY_IS_MIDNIGHT_CLEAR = "is_midnight_clear"

private data class TodayEntry(
    val id: String,
    val spreadName: String,
    val positionsJson: JSONArray,
    val cardsJson: JSONArray,
    val imageUrl: String?,
)

/** Refreshes every placed widget instance with the current reading state: no entry yet today (whether
 * logged out or just not drawn), or a composed bitmap of today's spread. */
class SpreadWidgetWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result =
        withContext(Dispatchers.IO) {
            // Queued first, before anything network-dependent below can fail or this run can get killed -
            // otherwise a bad run would silently break the self-rescheduling midnight chain (issue #281).
            SpreadWidgetScheduler.scheduleNextMidnightRefresh(applicationContext)

            val prefs = applicationContext.getSharedPreferences(WIDGET_PREFS_NAME, 0)
            val isLoggedIn = prefs.getString(AUTH_TOKEN_KEY, null) != null

            if (inputData.getBoolean(KEY_IS_MIDNIGHT_CLEAR, false)) {
                val path = if (isLoggedIn) PATH_READING else PATH_LOGIN
                updateAllWidgets(applicationContext, NO_ENTRY_TITLE, NO_ENTRY_SUBTITLE, path)
                return@withContext Result.success()
            }

            if (!isLoggedIn) {
                updateAllWidgets(applicationContext, NO_ENTRY_TITLE, NO_ENTRY_SUBTITLE, PATH_LOGIN)
                return@withContext Result.success()
            }

            try {
                val entry = fetchTodayEntry(prefs)
                if (entry != null) {
                    updateAllWidgets(applicationContext, renderTodayEntry(prefs, entry), "/diary/${entry.id}")
                }
                // else: fetchTodayEntry already rendered the logged-out/no-entry message state.
                Result.success()
            } catch (e: Exception) {
                // Network hiccup or unexpected response shape - leave the widget showing its last
                // known state rather than blanking it out, and let WorkManager retry later.
                Log.e(TAG, "widget refresh failed", e)
                Result.retry()
            }
        }

    /** Fetches today's diary entry, rendering directly for the no-entry-yet state. Returns null without
     * rendering if the mirrored token has gone stale (see authedConnection) - the widget's last known
     * state is left alone in that case. */
    private fun fetchTodayEntry(prefs: SharedPreferences): TodayEntry? {
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        val connection =
            authedConnection(prefs, "$API_BASE_URL/diary-entries?entry_date_from=$today&entry_date_to=$today") ?: return null

        try {
            return when (connection.responseCode) {
                HttpURLConnection.HTTP_OK -> {
                    val body = connection.inputStream.bufferedReader().use { it.readText() }
                    val items = JSONObject(body).getJSONArray("items")
                    if (items.length() == 0) {
                        updateAllWidgets(applicationContext, NO_ENTRY_TITLE, NO_ENTRY_SUBTITLE, PATH_READING)
                        null
                    } else {
                        val entry = items.getJSONObject(0)
                        TodayEntry(
                            entry.getString("id"),
                            entry.getString("spread_name"),
                            entry.getJSONArray("positions"),
                            entry.getJSONArray("cards"),
                            if (entry.isNull("image_url")) null else entry.getString("image_url"),
                        )
                    }
                }
                else -> {
                    val error = connection.errorStream?.bufferedReader()?.use { it.readText() }
                    throw IOException("Unexpected response ${connection.responseCode}: $error")
                }
            }
        } finally {
            connection.disconnect()
        }
    }

    private suspend fun renderTodayEntry(prefs: SharedPreferences, entry: TodayEntry): Bitmap {
        val imageLoader = ImageLoader.Builder(applicationContext).build()
        if (entry.imageUrl != null) return renderPhoto(applicationContext, imageLoader, entry.imageUrl)

        val imageByCard = fetchDeckImageByCard(prefs)
        val positions = applySoloSpreadBoost(entry.spreadName, parsePositions(entry.positionsJson))
        val cards = parseCards(entry.cardsJson, imageByCard)
        return renderSpread(applicationContext, imageLoader, positions, cards)
    }

    private fun fetchSystemDeckId(prefs: SharedPreferences): String? {
        val connection = authedConnection(prefs, "$API_BASE_URL/decks") ?: return null
        try {
            if (connection.responseCode != HttpURLConnection.HTTP_OK) return null
            val decks = JSONArray(connection.inputStream.bufferedReader().use { it.readText() })
            for (i in 0 until decks.length()) {
                val deck = decks.getJSONObject(i)
                if (deck.getString("name") == SYSTEM_DECK_NAME) return deck.getString("id")
            }
            return null
        } finally {
            connection.disconnect()
        }
    }

    /** `card` slug -> resolved image URL, for the system deck. Refetched every run rather than cached -
     * ~80 small rows, only runs once daily from a background job (plus login/logout/new-entry triggers),
     * and stays correct if an admin edits card art later. */
    private fun fetchDeckImageByCard(prefs: SharedPreferences): Map<String, String> {
        val deckId = fetchSystemDeckId(prefs) ?: return emptyMap()
        val connection = authedConnection(prefs, "$API_BASE_URL/decks/$deckId/cards") ?: return emptyMap()
        try {
            if (connection.responseCode != HttpURLConnection.HTTP_OK) return emptyMap()
            val cards = JSONArray(connection.inputStream.bufferedReader().use { it.readText() })
            val imageByCard = mutableMapOf<String, String>()
            for (i in 0 until cards.length()) {
                val card = cards.getJSONObject(i)
                if (card.isNull("image_url")) continue
                val rawUrl = card.getString("image_url")
                resolveImageUrl(rawUrl)?.let { imageByCard[card.getString("card")] = it }
            }
            return imageByCard
        } finally {
            connection.disconnect()
        }
    }

    /** Returns null on a 401 rather than treating it as a real logout - this worker no longer holds a
     * refresh token to recover with, so a 401 here just means the mirrored token has gone stale past its
     * short TTL (config.py's ACCESS_TOKEN_EXPIRES_MINUTES). Leaves the widget's last known state alone;
     * the next login/app-open/entry-complete trigger re-syncs a fresh token. */
    private fun authedConnection(prefs: SharedPreferences, url: String): HttpURLConnection? {
        val token = prefs.getString(AUTH_TOKEN_KEY, null) ?: return null
        val connection = openAuthedConnection(url, token)
        if (connection.responseCode != HttpURLConnection.HTTP_UNAUTHORIZED) return connection
        connection.disconnect()
        return null
    }
}

private fun openAuthedConnection(url: String, token: String): HttpURLConnection {
    val connection = URL(url).openConnection() as HttpURLConnection
    connection.setRequestProperty("Authorization", "Bearer $token")
    return connection
}

/** Resolves a possibly-relative `image_url` against the API origin, rejecting non-http(s) schemes -
 * mirrors frontend/packages/ui/src/lib/imageUrl.ts's getSafeImageUrl. */
private fun resolveImageUrl(rawUrl: String): String? =
    try {
        URL(URL(API_BASE_URL), rawUrl).takeIf { it.protocol == "http" || it.protocol == "https" }?.toString()
    } catch (e: MalformedURLException) {
        null
    }

private fun parsePositions(positionsJson: JSONArray): List<SpreadRenderPosition> =
    (0 until positionsJson.length()).map { i ->
        val position = positionsJson.getJSONObject(i)
        SpreadRenderPosition(
            positionIndex = position.getInt("index"),
            x = position.getDouble("x").toFloat(),
            y = position.getDouble("y").toFloat(),
            rotation = position.getDouble("rotation").toFloat(),
            scale = position.getDouble("scale").toFloat(),
        )
    }

private fun parseCards(cardsJson: JSONArray, imageByCard: Map<String, String>): List<SpreadRenderCard> =
    (0 until cardsJson.length()).mapNotNull { i ->
        val card = cardsJson.getJSONObject(i)
        val imageUrl = imageByCard[card.getString("card")] ?: return@mapNotNull null
        SpreadRenderCard(positionIndex = card.getInt("position_index"), imageUrl = imageUrl, reversed = card.getBoolean("reversed"))
    }

private fun updateAllWidgets(context: Context, title: String, subtitle: String, targetPath: String) {
    val manager = AppWidgetManager.getInstance(context)
    val ids = manager.getAppWidgetIds(ComponentName(context, SpreadWidgetProvider::class.java))
    manager.updateAppWidget(ids, buildWidgetViews(context, title, subtitle, targetPath))
}

private fun updateAllWidgets(context: Context, bitmap: Bitmap, targetPath: String) {
    val manager = AppWidgetManager.getInstance(context)
    val ids = manager.getAppWidgetIds(ComponentName(context, SpreadWidgetProvider::class.java))
    manager.updateAppWidget(ids, buildWidgetViews(context, bitmap, targetPath))
}
