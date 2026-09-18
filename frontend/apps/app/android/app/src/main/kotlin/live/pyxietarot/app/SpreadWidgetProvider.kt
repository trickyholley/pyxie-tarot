// SPDX-License-Identifier: AGPL-3.0-or-later
package live.pyxietarot.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.view.View
import android.widget.RemoteViews
import java.io.File

/** Intent extra [MainActivity] reads to navigate the webview past its default landing route - see
 * [buildWidgetViews]'s `targetPath` and [SpreadWidgetWorker]'s per-state PATH_* constants. */
const val EXTRA_TARGET_PATH = "target_path"
private const val CACHE_PREFS_NAME = "widget_cache_prefs"
private const val CACHE_BITMAP_FILE_NAME = "widget_today.png"
private const val CACHE_TITLE_KEY = "title"
private const val CACHE_SUBTITLE_KEY = "subtitle"
private const val CACHE_TARGET_KEY = "target_path"

private const val DEFAULT_TITLE = "Pyxie Tarot"
private const val DEFAULT_SUBTITLE = "Reading the cards…"

/** Home-screen widget shell. `onUpdate` fires on add, resize, and after a reboot; `onEnabled` fires once,
 * the first time any instance is placed. */
class SpreadWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val views = cachedWidgetViews(context)
        for (id in appWidgetIds) {
            appWidgetManager.updateAppWidget(id, views)
        }
    }

    override fun onEnabled(context: Context) {
        SpreadWidgetScheduler.refreshNow(context)
        SpreadWidgetScheduler.scheduleNextMidnightRefresh(context)
    }
}

/** Renders a [title]/[subtitle] message */
fun buildWidgetViews(context: Context, title: String, subtitle: String, targetPath: String): RemoteViews {
    cacheMessageState(context, title, subtitle, targetPath)
    return messageViews(context, title, subtitle, targetPath)
}

/** Renders a composed spread [bitmap] (the drawn entry's diary page as [targetPath]) */
fun buildWidgetViews(context: Context, bitmap: Bitmap, targetPath: String): RemoteViews {
    cacheBitmapState(context, bitmap, targetPath)
    return bitmapViews(context, bitmap, targetPath)
}

private fun cachePrefs(context: Context) = context.getSharedPreferences(CACHE_PREFS_NAME, 0)

private fun cachedWidgetViews(context: Context): RemoteViews {
    val cache = cachePrefs(context)
    val targetPath = cache.getString(CACHE_TARGET_KEY, "/") ?: "/"
    val bitmapFile = cacheBitmapFile(context)
    if (bitmapFile.exists()) {
        BitmapFactory.decodeFile(bitmapFile.path)?.let { return bitmapViews(context, it, targetPath) }
    }
    val title = cache.getString(CACHE_TITLE_KEY, DEFAULT_TITLE) ?: DEFAULT_TITLE
    val subtitle = cache.getString(CACHE_SUBTITLE_KEY, DEFAULT_SUBTITLE) ?: DEFAULT_SUBTITLE
    return messageViews(context, title, subtitle, targetPath)
}

private fun cacheBitmapFile(context: Context) = File(context.filesDir, CACHE_BITMAP_FILE_NAME)

private fun cacheMessageState(context: Context, title: String, subtitle: String, targetPath: String) {
    cacheBitmapFile(context).delete()
    cachePrefs(context).edit()
        .putString(CACHE_TITLE_KEY, title)
        .putString(CACHE_SUBTITLE_KEY, subtitle)
        .putString(CACHE_TARGET_KEY, targetPath)
        .apply()
}

private fun cacheBitmapState(context: Context, bitmap: Bitmap, targetPath: String) {
    cacheBitmapFile(context).outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    cachePrefs(context).edit()
        .putString(CACHE_TITLE_KEY, DEFAULT_TITLE)
        .putString(CACHE_SUBTITLE_KEY, DEFAULT_SUBTITLE)
        .putString(CACHE_TARGET_KEY, targetPath)
        .apply()
}

private fun messageViews(context: Context, title: String, subtitle: String, targetPath: String): RemoteViews {
    val views = baseWidgetViews(context, targetPath)
    views.setTextViewText(R.id.widget_title, title)
    views.setTextViewText(R.id.widget_subtitle, subtitle)
    views.setViewVisibility(R.id.widget_message_group, View.VISIBLE)
    views.setViewVisibility(R.id.widget_image, View.GONE)
    return views
}

private fun bitmapViews(context: Context, bitmap: Bitmap, targetPath: String): RemoteViews {
    val views = baseWidgetViews(context, targetPath)
    views.setImageViewBitmap(R.id.widget_image, bitmap)
    views.setViewVisibility(R.id.widget_message_group, View.GONE)
    views.setViewVisibility(R.id.widget_image, View.VISIBLE)
    return views
}

private fun baseWidgetViews(context: Context, targetPath: String): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.spread_widget)

    val launchIntent = Intent(context, MainActivity::class.java).putExtra(EXTRA_TARGET_PATH, targetPath)
    val pendingIntent =
        PendingIntent.getActivity(context, 0, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

    return views
}
