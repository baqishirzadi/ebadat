package com.afghandev.ebadat

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

class AdhanAlarmSchedulerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AdhanAlarmSchedulerModule"

  @ReactMethod
  fun setAdhanConfig(config: ReadableMap, promise: Promise) {
    try {
      val parsed = AdhanConfig.fromReadableMap(config)
      val store = AdhanConfigStore.get(reactContext)
      val existing = store.load()
      if (existing != null && existing.toJson().toString() == parsed.toJson().toString()) {
        promise.resolve(
          AdhanScheduleResult(
            reason = "config-sync-unchanged",
            scheduledCount = 0,
            cancelledCount = 0,
            expectedCount = AdhanAlarmScheduler.getStored(reactContext)
              .count { it.type == "adhan" && !it.id.startsWith("__adhan_") },
            nextAlarmAtMs = AdhanAlarmScheduler.getStored(reactContext)
              .filter { it.type == "adhan" }
              .minByOrNull { it.triggerAtMs }
              ?.triggerAtMs,
          ).toWritableMap(),
        )
        return
      }
      store.save(parsed)
      val result = AdhanScheduleManager.ensureScheduled(reactContext.applicationContext, "config-sync")
      promise.resolve(result.toWritableMap())
    } catch (error: Exception) {
      promise.reject("adhan_config_sync_failed", error)
    }
  }

  @ReactMethod
  fun getAdhanHealth(promise: Promise) {
    try {
      val health = AdhanHealthReporter.collect(reactContext.applicationContext)
      promise.resolve(health.toWritableMap())
    } catch (error: Exception) {
      promise.reject("adhan_health_failed", error)
    }
  }

  @ReactMethod
  fun runMaintenanceNow(promise: Promise) {
    try {
      val result = AdhanScheduleManager.ensureScheduled(reactContext.applicationContext, "manual-maintenance")
      promise.resolve(result.toWritableMap())
    } catch (error: Exception) {
      promise.reject("adhan_maintenance_failed", error)
    }
  }

  @ReactMethod
  fun scheduleSystemTestAlarm(delayMs: Double, promise: Promise) {
    try {
      AdhanNotificationChannels.ensureCreated(reactContext.applicationContext)
      AdhanAlarmScheduler.cancel(reactContext, AdhanAlarmScheduler.SYSTEM_TEST_ALARM_ID)

      val delay = delayMs.toLong().coerceAtLeast(1000L)
      val triggerAtMs = System.currentTimeMillis() + delay
      val scheduleMode =
        if (AdhanAlarmScheduler.canScheduleExactAlarms(reactContext)) "exact" else "fallback_inexact"

      val payload = AdhanAlarmPayload(
        id = AdhanAlarmScheduler.SYSTEM_TEST_ALARM_ID,
        triggerAtMs = triggerAtMs,
        title = "تست اذان",
        body = "اگر این اعلان با صدا رسید، تنظیمات سیستم درست است.",
        channelId = AdhanNotificationChannels.ADHAN_REGULAR,
        scheduleMode = scheduleMode,
        type = "adhan",
        expectedFireAtMs = triggerAtMs,
        prayer = "fajr",
        voice = "barakatullah",
      )

      AdhanAlarmScheduler.schedule(reactContext.applicationContext, payload)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("adhan_system_test_failed", error)
    }
  }

  @ReactMethod
  fun scheduleAdhanAlarms(alarms: ReadableArray, mode: String?, promise: Promise) {
    scheduleAdhanAlarmsInternal(alarms, mode, promise)
  }

  @ReactMethod
  fun scheduleExactAdhanAlarms(alarms: ReadableArray, promise: Promise) {
    scheduleAdhanAlarmsInternal(alarms, "exact", promise)
  }

  @ReactMethod
  fun cancelAdhanAlarms(ids: ReadableArray, promise: Promise) {
    try {
      val toCancel = mutableListOf<String>()
      for (index in 0 until ids.size()) {
        val id = ids.getString(index)?.trim().orEmpty()
        if (id.isNotEmpty()) {
          toCancel.add(id)
        }
      }
      AdhanAlarmScheduler.cancelMany(reactContext, toCancel)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("native_adhan_cancel_failed", error)
    }
  }

  @ReactMethod
  fun getScheduledAdhanAlarms(promise: Promise) {
    try {
      val alarms = AdhanAlarmScheduler.getStored(reactContext)
      val result = Arguments.createArray()
      alarms.forEach { payload -> result.pushMap(payload.toWritableMap()) }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("native_adhan_get_failed", error)
    }
  }

  private fun scheduleAdhanAlarmsInternal(alarms: ReadableArray, mode: String?, promise: Promise) {
    try {
      val resolvedMode = normalizeMode(mode)
      if (resolvedMode == "exact" && !AdhanAlarmScheduler.canScheduleExactAlarms(reactContext)) {
        promise.reject("exact_alarm_missing", "Exact alarm permission is missing")
        return
      }

      val scheduledIds = Arguments.createArray()
      for (index in 0 until alarms.size()) {
        val map = alarms.getMap(index)
          ?: throw IllegalArgumentException("Alarm payload at index=$index is not an object")
        val payload = AdhanAlarmPayload.fromReadableMap(map).copy(scheduleMode = resolvedMode)
        AdhanAlarmScheduler.schedule(reactContext, payload)
        scheduledIds.pushString(payload.id)
      }

      promise.resolve(scheduledIds)
    } catch (error: Exception) {
      promise.reject("native_adhan_schedule_failed", error)
    }
  }

  private fun normalizeMode(mode: String?): String {
    return if (mode == "fallback_inexact") "fallback_inexact" else "exact"
  }
}
