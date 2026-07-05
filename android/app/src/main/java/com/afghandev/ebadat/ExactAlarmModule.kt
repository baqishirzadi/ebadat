package com.afghandev.ebadat

import android.app.AlarmManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ExactAlarmModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ExactAlarmModule"

  @ReactMethod
  fun canScheduleExactAlarms(promise: Promise) {
    try {
      promise.resolve(AdhanAlarmScheduler.canScheduleExactAlarms(reactContext))
    } catch (error: Exception) {
      promise.reject("exact_alarm_check_failed", error)
    }
  }

  @ReactMethod
  fun openExactAlarmSettings(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        promise.resolve(false)
        return
      }

      val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
        data = Uri.parse("package:${reactContext.packageName}")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (_: Exception) {
      try {
        val fallbackIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.parse("package:${reactContext.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactContext.startActivity(fallbackIntent)
        promise.resolve(true)
      } catch (error: Exception) {
        promise.reject("exact_alarm_settings_open_failed", error)
      }
    }
  }

  @ReactMethod
  fun isIgnoringBatteryOptimizations(promise: Promise) {
    try {
      promise.resolve(AdhanPowerHelper.isIgnoringBatteryOptimizations(reactContext))
    } catch (error: Exception) {
      promise.reject("battery_optimization_check_failed", error)
    }
  }

  @ReactMethod
  fun openBatteryOptimizationSettings(promise: Promise) {
    try {
      promise.resolve(AdhanPowerHelper.openBatteryOptimizationSettings(reactContext))
    } catch (error: Exception) {
      promise.reject("battery_optimization_settings_open_failed", error)
    }
  }

  @ReactMethod
  fun openOemAutostartSettings(promise: Promise) {
    try {
      promise.resolve(AdhanPowerHelper.openOemAutostartSettings(reactContext))
    } catch (error: Exception) {
      promise.reject("oem_autostart_settings_open_failed", error)
    }
  }

  @ReactMethod
  fun getExactAlarmDebugState(promise: Promise) {
    try {
      val sdkInt = Build.VERSION.SDK_INT
      val canScheduleExactAlarms = AdhanAlarmScheduler.canScheduleExactAlarms(reactContext)
      val notificationsEnabled = NotificationManagerCompat.from(reactContext).areNotificationsEnabled()
      val isIgnoringBatteryOptimizations = AdhanPowerHelper.isIgnoringBatteryOptimizations(reactContext)

      val result = Arguments.createMap().apply {
        putInt("sdkInt", sdkInt)
        putBoolean("canScheduleExactAlarms", canScheduleExactAlarms)
        putBoolean("notificationsEnabled", notificationsEnabled)
        putBoolean("isIgnoringBatteryOptimizations", isIgnoringBatteryOptimizations)
        putString("manufacturer", Build.MANUFACTURER)
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("exact_alarm_debug_state_failed", error)
    }
  }
}
