// SPDX-License-Identifier: AGPL-3.0-or-later
package live.pyxietarot.app

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

private const val REFRESH_WORK_NAME = "spread_widget_refresh"
private const val PERIODIC_WORK_NAME = "spread_widget_periodic_refresh"
private const val PERIODIC_INTERVAL_HOURS = 6L

/** Triggers for [SpreadWidgetWorker]. */
object SpreadWidgetScheduler {
    /** One-off, immediate refresh - login/logout and widget-added events shouldn't wait for the
     * periodic tick. `REPLACE` means a rapid-fire burst of triggers collapses to the latest one. */
    fun refreshNow(context: Context) {
        WorkManager.getInstance(context)
            .enqueueUniqueWork(
                REFRESH_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                OneTimeWorkRequestBuilder<SpreadWidgetWorker>().build(),
            )
    }

    /** Called once from [SpreadWidgetProvider.onEnabled] (fires only on the first widget instance
     * placed). `KEEP` leaves an already-running schedule alone instead of resetting its timer. */
    fun schedulePeriodic(context: Context) {
        val request = PeriodicWorkRequestBuilder<SpreadWidgetWorker>(PERIODIC_INTERVAL_HOURS, TimeUnit.HOURS).build()
        WorkManager.getInstance(context)
            .enqueueUniquePeriodicWork(PERIODIC_WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, request)
    }
}
