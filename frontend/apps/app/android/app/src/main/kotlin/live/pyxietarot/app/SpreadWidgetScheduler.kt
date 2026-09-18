// SPDX-License-Identifier: AGPL-3.0-or-later
package live.pyxietarot.app

import android.content.Context
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
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

    // Wipes the widget at midnight to remove old spread and prompt a new daily entry
    fun scheduleNextMidnightRefresh(context: Context) {
        WorkManager.getInstance(context)
            .enqueueUniqueWork(
                MIDNIGHT_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                OneTimeWorkRequestBuilder<SpreadWidgetWorker>()
                    .setInitialDelay(millisUntilNextLocalMidnight(), TimeUnit.MILLISECONDS)
                    .setInputData(workDataOf(KEY_IS_MIDNIGHT_CLEAR to true))
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
