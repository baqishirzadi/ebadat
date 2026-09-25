package com.afghandev.ebadat

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import org.json.JSONObject

/**
 * Reloads the prayer widget at the next prayer boundary so the current-prayer
 * highlight advances while the app is closed (all languages, including Pashto).
 */
object WidgetRefreshScheduler {
  private const val TAG = "WidgetRefreshScheduler"
  private const val REQUEST_CODE = 71001
  const val ACTION = "com.afghandev.ebadat.WIDGET_PRAYER_ROLLOVER"
  private const val WIDGET_CLASS = "com.afghandev.ebadat.widget.PrayerTimesWidget"
  private const val MIN_DELAY_MS = 5_000L
  private const val MAX_DELAY_MS = 24L * 60L * 60L * 1000L

  fun scheduleFromSnapshotJson(context: Context, json: String) {
    scheduleAt(context, nextBoundaryMs(json))
  }

  fun scheduleAt(context: Context, nextRefreshAtMs: Long) {
    val appContext = context.applicationContext
    val alarmManager = appContext.getSystemService(AlarmManager::class.java) ?: return
    val pending = pendingIntent(appContext)

    alarmManager.cancel(pending)

    if (nextRefreshAtMs <= 0L) return

    val now = System.currentTimeMillis()
    val triggerAt = nextRefreshAtMs.coerceIn(now + MIN_DELAY_MS, now + MAX_DELAY_MS)

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending)
      } else {
        @Suppress("DEPRECATION")
        alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pending)
      }
    } catch (error: Exception) {
      Log.w(TAG, "Failed to schedule widget prayer rollover", error)
    }
  }

  fun onRollover(context: Context) {
    WidgetReloadHelper.reloadPrayerWidget(context)
    val raw = WidgetDataStore.read(context.applicationContext) ?: return
    // Prefer the next future prayer from the multi-day payload — the stored
    // nextRefreshAtMs may already be in the past when this alarm fires.
    scheduleAt(context, nextBoundaryMs(raw))
  }

  /**
   * Earliest future prayer `atMs` across `days` / top-level `prayers`, falling
   * back to `nextRefreshAtMs` when the payload has no usable times.
   */
  fun nextBoundaryMs(json: String, nowMs: Long = System.currentTimeMillis()): Long {
    return try {
      val root = JSONObject(json)
      var soonest = Long.MAX_VALUE

      fun considerPrayers(arrayName: String, parent: JSONObject) {
        val prayers = parent.optJSONArray(arrayName) ?: return
        for (i in 0 until prayers.length()) {
          val atMs = prayers.optJSONObject(i)?.optLong("atMs", 0L) ?: 0L
          if (atMs > nowMs && atMs < soonest) soonest = atMs
        }
      }

      considerPrayers("prayers", root)
      val days = root.optJSONArray("days")
      if (days != null) {
        for (i in 0 until days.length()) {
          val day = days.optJSONObject(i) ?: continue
          considerPrayers("prayers", day)
        }
      }

      if (soonest != Long.MAX_VALUE) soonest
      else root.optLong("nextRefreshAtMs", 0L).takeIf { it > nowMs } ?: 0L
    } catch (error: Exception) {
      Log.w(TAG, "Failed to parse widget refresh boundary", error)
      0L
    }
  }

  private fun pendingIntent(context: Context): PendingIntent {
    val intent = Intent(context, Class.forName(WIDGET_CLASS)).apply {
      action = ACTION
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
    return PendingIntent.getBroadcast(context, REQUEST_CODE, intent, flags)
  }
}
