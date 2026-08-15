// SPDX-License-Identifier: AGPL-3.0-or-later
package live.pyxietarot.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.view.View
import android.widget.RemoteViews

/** Intent extra [MainActivity] reads to navigate the webview past its default landing route - see
 * [buildWidgetViews]'s `targetPath` and [SpreadWidgetWorker]'s per-state PATH_* constants. */
const val EXTRA_TARGET_PATH = "target_path"

/** Home-screen widget shell - the system calls [onUpdate] when an instance is first added (and on
 * resize); actual data refresh happens via [SpreadWidgetScheduler]'s WorkManager jobs, not here. */
class SpreadWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            appWidgetManager.updateAppWidget(id, buildWidgetViews(context, "Pyxie Tarot", "Loading your reading…", "/"))
        }
        SpreadWidgetScheduler.refreshNow(context)
    }

    override fun onEnabled(context: Context) {
        SpreadWidgetScheduler.schedulePeriodic(context)
    }
}

/** Renders a [title]/[subtitle] message into the widget layout (logged-out/no-entry states), with a
 * tap target of [targetPath] - shared by [SpreadWidgetProvider]'s initial paint and
 * [SpreadWidgetWorker]'s refreshed state, so both stay in sync with one layout-building path. */
fun buildWidgetViews(context: Context, title: String, subtitle: String, targetPath: String): RemoteViews {
    val views = baseWidgetViews(context, targetPath)
    views.setTextViewText(R.id.widget_title, title)
    views.setTextViewText(R.id.widget_subtitle, subtitle)
    views.setViewVisibility(R.id.widget_message_group, View.VISIBLE)
    views.setViewVisibility(R.id.widget_image, View.GONE)
    return views
}

/** Renders a composed spread [bitmap] into the widget layout, replacing the message state, with a tap
 * target of [targetPath] (the drawn entry's diary page). */
fun buildWidgetViews(context: Context, bitmap: Bitmap, targetPath: String): RemoteViews {
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
