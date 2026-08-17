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
private const val REFRESH_TOKEN_KEY = "refresh_token"
private const val TAG = "SpreadWidgetWorker"

// Matches the VITE_API_BASE_URL the prod frontend is actually built with (infra/deploy-frontend.sh) -
// the API lives on its own subdomain, not `pyxietarot.live` itself (that origin is static S3/CloudFront
// only, no backend behind it). There's no WebView here to inherit this from, so it has to be hardcoded.
private const val API_BASE_URL = "https://api.pyxietarot.live/api/v1"

// Matches useCardArt.ts's SYSTEM_DECK_NAME - card art comes from the same system deck the in-app
// reading flow uses.
private const val SYSTEM_DECK_NAME = "Rider-Waite-Smith"

private const val LOGGED_OUT_TITLE = "Pyxie Tarot"
private const val LOGGED_OUT_SUBTITLE = "Sign in to see today's reading"
private const val NO_ENTRY_TITLE = "Today awaits"
private const val NO_ENTRY_SUBTITLE = "Tap to draw your cards"

private const val PATH_LOGIN = "/login"
private const val PATH_READING = "/reading"

private data class TodayEntry(val id: String, val positionsJson: JSONArray, val cardsJson: JSONArray)

/** Refreshes every placed widget instance with the current reading state: logged-out, no entry yet
 * today, or a composed bitmap of today's spread. */
class SpreadWidgetWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result =
        withContext(Dispatchers.IO) {
            val prefs = applicationContext.getSharedPreferences(WIDGET_PREFS_NAME, 0)
            if (prefs.getString(AUTH_TOKEN_KEY, null) == null) {
                updateAllWidgets(applicationContext, LOGGED_OUT_TITLE, LOGGED_OUT_SUBTITLE, PATH_LOGIN)
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

    /** Fetches today's diary entry. Renders and returns null directly for the logged-out/no-entry
     * states (nothing further to compose); returns the entry's raw positions/cards JSON otherwise. */
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
                        TodayEntry(entry.getString("id"), entry.getJSONArray("positions"), entry.getJSONArray("cards"))
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
        val imageByCard = fetchDeckImageByCard(prefs)
        val positions = parsePositions(entry.positionsJson)
        val cards = parseCards(entry.cardsJson, imageByCard)
        val imageLoader = ImageLoader.Builder(applicationContext).build()
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
     * ~80 small rows, only runs every 6h from a background job, and stays correct if an admin edits
     * card art later. */
    private fun fetchDeckImageByCard(prefs: SharedPreferences): Map<String, String> {
        val deckId = fetchSystemDeckId(prefs) ?: return emptyMap()
        val connection = authedConnection(prefs, "$API_BASE_URL/decks/$deckId/cards") ?: return emptyMap()
        try {
            if (connection.responseCode != HttpURLConnection.HTTP_OK) return emptyMap()
            val cards = JSONArray(connection.inputStream.bufferedReader().use { it.readText() })
            val imageByCard = mutableMapOf<String, String>()
            for (i in 0 until cards.length()) {
                val card = cards.getJSONObject(i)
                val rawUrl = card.optString("image_url").takeIf { it.isNotEmpty() } ?: continue
                resolveImageUrl(rawUrl)?.let { imageByCard[card.getString("card")] = it }
            }
            return imageByCard
        } finally {
            connection.disconnect()
        }
    }

    /** Opens an authenticated GET to [url], transparently redeeming the stored refresh token for a new
     * access token and retrying once on a 401 - mirrors `apiFetch`'s retry-once policy in utils.ts.
     * Returns null - after clearing the stored session and rendering the logged-out widget state - if
     * there's no access token to try, or the refresh itself fails (expired/reused/revoked). */
    private fun authedConnection(prefs: SharedPreferences, url: String, isRetry: Boolean = false): HttpURLConnection? {
        val token = prefs.getString(AUTH_TOKEN_KEY, null) ?: return null
        val connection = openAuthedConnection(url, token)
        if (connection.responseCode != HttpURLConnection.HTTP_UNAUTHORIZED) return connection
        connection.disconnect()

        if (isRetry || !refreshTokens(prefs)) {
            prefs.edit().remove(AUTH_TOKEN_KEY).remove(REFRESH_TOKEN_KEY).apply()
            updateAllWidgets(applicationContext, LOGGED_OUT_TITLE, LOGGED_OUT_SUBTITLE, PATH_LOGIN)
            return null
        }
        return authedConnection(prefs, url, isRetry = true)
    }
}

private fun openAuthedConnection(url: String, token: String): HttpURLConnection {
    val connection = URL(url).openConnection() as HttpURLConnection
    connection.setRequestProperty("Authorization", "Bearer $token")
    return connection
}

/** POSTs the stored refresh token to `/auth/refresh` and, on success, rotates both tokens in [prefs] -
 * mirrors utils.ts's `refreshAccessToken`. Returns false, leaving [prefs] untouched, on any failure
 * (network hiccup, or the refresh token itself is expired/reused/revoked) so the caller falls back to
 * logging the widget out. */
private fun refreshTokens(prefs: SharedPreferences): Boolean {
    val refreshToken = prefs.getString(REFRESH_TOKEN_KEY, null) ?: return false

    val connection = URL("$API_BASE_URL/auth/refresh").openConnection() as HttpURLConnection
    connection.requestMethod = "POST"
    connection.doOutput = true
    connection.setRequestProperty("Content-Type", "application/json")

    return try {
        val payload = JSONObject().put("refresh_token", refreshToken).toString()
        connection.outputStream.use { it.write(payload.toByteArray()) }

        if (connection.responseCode != HttpURLConnection.HTTP_OK) return false
        val body = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
        prefs
            .edit()
            .putString(AUTH_TOKEN_KEY, body.getString("access_token"))
            .putString(REFRESH_TOKEN_KEY, body.getString("refresh_token"))
            .apply()
        true
    } catch (e: IOException) {
        false
    } finally {
        connection.disconnect()
    }
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
    for (id in ids) {
        manager.updateAppWidget(id, buildWidgetViews(context, title, subtitle, targetPath))
    }
}

private fun updateAllWidgets(context: Context, bitmap: Bitmap, targetPath: String) {
    val manager = AppWidgetManager.getInstance(context)
    val ids = manager.getAppWidgetIds(ComponentName(context, SpreadWidgetProvider::class.java))
    for (id in ids) {
        manager.updateAppWidget(id, buildWidgetViews(context, bitmap, targetPath))
    }
}
