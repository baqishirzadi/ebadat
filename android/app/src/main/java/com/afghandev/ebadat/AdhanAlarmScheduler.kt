package com.afghandev.ebadat

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import kotlin.math.abs

object AdhanAlarmScheduler {
  private const val TAG = "AdhanAlarmScheduler"
  const val ACTION_FIRE_ADHAN = "com.afghandev.ebadat.action.FIRE_ADHAN"
  const val EXTRA_ID = "adhan_alarm_id"
  const val EXTRA_PAYLOAD_JSON = "adhan_alarm_payload_json"

  fun canScheduleExactAlarms(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    val alarmManager = context.getSystemService(AlarmManager::class.java) ?: return false
    return alarmManager.canScheduleExactAlarms()
  }

  fun scheduleExact(context: Context, payload: AdhanAlarmPayload) {
    val alarmManager = context.getSystemService(AlarmManager::class.java)
      ?: throw IllegalStateException("AlarmManager unavailable")

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
      throw SecurityException("SCHEDULE_EXACT_ALARM permission is required")
    }

    if (payload.triggerAtMs <= System.currentTimeMillis()) {
      cancel(context, payload.id)
      return
    }

    val pendingIntent = buildPendingIntent(context, payload.id, payload)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, payload.triggerAtMs, pendingIntent)
    } else {
      alarmManager.setExact(AlarmManager.RTC_WAKEUP, payload.triggerAtMs, pendingIntent)
    }

    store(context).upsert(payload)
    Log.i(TAG, "Scheduled exact adhan id=${payload.id} triggerAtMs=${payload.triggerAtMs}")
  }

  fun cancel(context: Context, id: String) {
    val alarmManager = context.getSystemService(AlarmManager::class.java) ?: return
    val pendingIntent = buildPendingIntent(context, id, null)
    alarmManager.cancel(pendingIntent)
    pendingIntent.cancel()
    store(context).remove(id)
    Log.i(TAG, "Canceled adhan id=$id")
  }

  fun cancelMany(context: Context, ids: List<String>) {
    ids.forEach { id -> cancel(context, id) }
  }

  fun getStored(context: Context): List<AdhanAlarmPayload> {
    return store(context).getAll().sortedBy { it.triggerAtMs }
  }

  fun rescheduleStored(context: Context): Int {
    val now = System.currentTimeMillis()
    val all = store(context).getAll()
    var rescheduled = 0

    for (payload in all) {
      if (payload.triggerAtMs <= now) {
        store(context).remove(payload.id)
        continue
      }

      try {
        scheduleExact(context, payload)
        rescheduled += 1
      } catch (error: Exception) {
        Log.e(TAG, "Failed to reschedule alarm id=${payload.id}", error)
      }
    }

    store(context).pruneExpired(now)
    return rescheduled
  }

  private fun store(context: Context): AdhanAlarmStore {
    return AdhanAlarmStore(context.applicationContext)
  }

  private fun buildPendingIntent(
    context: Context,
    id: String,
    payload: AdhanAlarmPayload?
  ): PendingIntent {
    val intent = Intent(context, AdhanAlarmReceiver::class.java).apply {
      action = ACTION_FIRE_ADHAN
      putExtra(EXTRA_ID, id)
      if (payload != null) {
        payload.putIntentExtras(this)
      }
    }

    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getBroadcast(context, requestCodeForId(id), intent, flags)
  }

  private fun requestCodeForId(id: String): Int {
    val hash = id.hashCode()
    if (hash == Int.MIN_VALUE) return 0
    return abs(hash)
  }
}
