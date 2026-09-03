// SPDX-License-Identifier: AGPL-3.0-or-later
package live.pyxietarot.app

import android.content.Context
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import java.util.Calendar
import java.util.concurrent.TimeUnit

private const val REFRESH_WORK_NAME = "spread_widget_refresh"
private const val MIDNIGHT_WORK_NAME = "spread_widget_midnight_refresh"

/** Triggers for [SpreadWidgetWorker]. */
object SpreadWidgetScheduler {
    /** One-off, immediate refresh - login/logout and widget-added events shouldn't wait for the next
     * midnight tick. `REPLACE` means a rapid-fire burst of triggers collapses to the latest one. */
    fun refreshNow(context: Context) {
        WorkManager.getInstance(context)
            .enqueueUniqueWork(
                REFRESH_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                OneTimeWorkRequestBuilder<SpreadWidgetWorker>().build(),
            )
    }

    /** Queues the next day-rollover refresh, timed for just after local midnight - a daily spread only
     * changes content at that boundary (or on `refreshNow`'s explicit triggers: login/logout/new entry),
     * so there's nothing for a same-day tick to catch. [SpreadWidgetWorker] calls this again as the first
     * thing it does on every run - including this one - so the chain re-anchors to the *current* local
     * midnight each time rather than drifting via a fixed interval (which `PeriodicWorkRequest` can't
     * avoid: it has no wall-clock-time primitive, only a period from whenever it was first enqueued,
     * and doesn't correct for the delays Doze/reboots impose on it). `REPLACE` keeps only one link in the
     * chain queued at a time - see [SpreadWidgetProvider.onEnabled], the chain's original trigger.
     */
    fun scheduleNextMidnightRefresh(context: Context) {
        WorkManager.getInstance(context)
            .enqueueUniqueWork(
                MIDNIGHT_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                OneTimeWorkRequestBuilder<SpreadWidgetWorker>()
                    .setInitialDelay(millisUntilNextLocalMidnight(), TimeUnit.MILLISECONDS)
                    .build(),
            )
    }
}

private fun millisUntilNextLocalMidnight(): Long {
    val now = Calendar.getInstance()
    val nextMidnight =
        (now.clone() as Calendar).apply {
            add(Calendar.DAY_OF_YEAR, 1)
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
    return nextMidnight.timeInMillis - now.timeInMillis
}
