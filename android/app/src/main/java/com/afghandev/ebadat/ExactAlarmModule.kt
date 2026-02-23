package com.afghandev.ebadat

import android.app.AlarmManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
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
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        promise.resolve(true)
        return
      }
      val alarmManager = reactContext.getSystemService(AlarmManager::class.java)
      promise.resolve(alarmManager?.canScheduleExactAlarms() == true)
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
}
