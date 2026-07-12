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
      if (existing == null || existing.toJson().toString() != parsed.toJson().toString()) {
        store.save(parsed)
      }
      val reason = if (existing != null && existing.toJson().toString() == parsed.toJson().toString()) {
        "config-sync-verify"
      } else {
        "config-sync"
      }
      val result = AdhanScheduleManager.ensureScheduled(reactContext.applicationContext, reason)
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
  fun forceReschedule(promise: Promise) {
    try {
      val result = AdhanScheduleManager.ensureScheduled(reactContext.applicationContext, "force-reschedule")
      promise.resolve(result.toWritableMap())
    } catch (error: Exception) {
      promise.reject("adhan_force_reschedule_failed", error)
    }
  }

  @ReactMethod
  fun getFiredEvents(promise: Promise) {
    try {
      val events = AdhanFiredLogStore.get(reactContext.applicationContext).getAll()
      val result = Arguments.createArray()
      events.forEach { event ->
        val map = Arguments.createMap()
        map.putString("id", event.id)
        map.putString("type", event.type)
        map.putDouble("expectedFireAtMs", event.expectedFireAtMs.toDouble())
        map.putDouble("actualFireAtMs", event.actualFireAtMs.toDouble())
        map.putDouble("delaySeconds", event.delaySeconds.toDouble())
        if (event.prayer != null) {
          map.putString("prayer", event.prayer)
        } else {
          map.putNull("prayer")
        }
        result.pushMap(map)
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("adhan_fired_events_failed", error)
    }
  }

  @ReactMethod
  fun getChannelHealth(promise: Promise) {
    try {
      val health = AdhanNotificationChannels.collectChannelHealth(reactContext.applicationContext)
      val map = Arguments.createMap()
      map.putBoolean("fajrHealthy", health.fajrHealthy)
      map.putBoolean("regularHealthy", health.regularHealthy)
      val issues = Arguments.createArray()
      health.issues.forEach { issues.pushString(it) }
      map.putArray("issues", issues)
      promise.resolve(map)
    } catch (error: Exception) {
      promise.reject("adhan_channel_health_failed", error)
    }
  }

  @ReactMethod
  fun openAdhanChannelSettings(promise: Promise) {
    try {
      val opened = AdhanNotificationChannels.openAdhanChannelSettings(reactContext.applicationContext)
      promise.resolve(opened)
    } catch (error: Exception) {
      promise.reject("adhan_channel_settings_open_failed", error)
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
      val resolvedMode = if (resolvedModeInput(mode) == "exact" && !AdhanAlarmScheduler.canScheduleExactAlarms(reactContext)) {
        "fallback_inexact"
      } else {
        resolvedModeInput(mode)
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

  private fun resolvedModeInput(mode: String?): String {
    return if (mode == "fallback_inexact") "fallback_inexact" else "exact"
  }

  private fun normalizeMode(mode: String?): String {
    return resolvedModeInput(mode)
  }
}
