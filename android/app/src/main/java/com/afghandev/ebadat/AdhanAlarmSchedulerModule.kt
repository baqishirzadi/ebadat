package com.afghandev.ebadat

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class AdhanAlarmSchedulerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AdhanAlarmSchedulerModule"

  @ReactMethod
  fun scheduleExactAdhanAlarms(alarms: ReadableArray, promise: Promise) {
    try {
      if (!AdhanAlarmScheduler.canScheduleExactAlarms(reactContext)) {
        promise.reject("exact_alarm_missing", "Exact alarm permission is missing")
        return
      }

      val scheduledIds = Arguments.createArray()
      for (index in 0 until alarms.size()) {
        val map = alarms.getMap(index)
          ?: throw IllegalArgumentException("Alarm payload at index=$index is not an object")
        val payload = AdhanAlarmPayload.fromReadableMap(map)
        AdhanAlarmScheduler.scheduleExact(reactContext, payload)
        scheduledIds.pushString(payload.id)
      }

      promise.resolve(scheduledIds)
    } catch (error: Exception) {
      promise.reject("native_adhan_schedule_failed", error)
    }
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
}
