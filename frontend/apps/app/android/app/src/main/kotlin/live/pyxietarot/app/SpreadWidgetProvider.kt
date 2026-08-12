// SPDX-License-Identifier: AGPL-3.0-or-later
package live.pyxietarot.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/** Home-screen widget shell - the system calls [onUpdate] when an instance is first added (and on
 * resize); actual data refresh happens via [SpreadWidgetScheduler]'s WorkManager jobs, not here. */
class SpreadWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            appWidgetManager.updateAppWidget(id, buildWidgetViews(context, "Pyxie Tarot"))
        }
        SpreadWidgetScheduler.refreshNow(context)
    }

    override fun onEnabled(context: Context) {
        SpreadWidgetScheduler.schedulePeriodic(context)
    }
}

/** Renders [text] into the widget layout - shared by [SpreadWidgetProvider]'s initial paint and
 * [SpreadWidgetWorker]'s refreshed state, so both stay in sync with one layout-building path. */
fun buildWidgetViews(context: Context, text: String): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.spread_widget)
    views.setTextViewText(R.id.widget_text, text)

    val launchIntent = Intent(context, MainActivity::class.java)
    val pendingIntent =
        PendingIntent.getActivity(context, 0, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

    return views
}
