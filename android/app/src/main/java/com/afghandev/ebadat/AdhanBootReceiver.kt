package com.afghandev.ebadat

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
      -> {
        try {
          val rescheduled = AdhanAlarmScheduler.rescheduleStored(context.applicationContext)
          Log.i("AdhanBootReceiver", "Rescheduled $rescheduled alarms after action=$action")
        } catch (error: Exception) {
          Log.e("AdhanBootReceiver", "Failed to reschedule alarms after action=$action", error)
        }
      }
    }
  }
}
