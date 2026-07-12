package com.afghandev.ebadat

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class AdhanBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val action = intent?.action ?: return
    when (action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED,
      AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED,
      -> {
        val pending = goAsync()
        Thread {
          try {
            val result = AdhanScheduleManager.ensureScheduled(context.applicationContext, "boot-$action")
            Log.i(
              "AdhanBootReceiver",
              "Recomputed alarms after action=$action scheduled=${result.scheduledCount} expected=${result.expectedCount}",
            )
            WidgetReloadHelper.reloadPrayerWidget(context.applicationContext)
          } catch (error: Exception) {
            Log.e("AdhanBootReceiver", "Failed to recompute alarms after action=$action", error)
          } finally {
            pending.finish()
          }
        }.start()
      }
    }
  }
}
