package com.afghandev.ebadat

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetDataModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "WidgetDataModule"

  @ReactMethod
  fun setSnapshot(json: String, promise: Promise) {
    try {
      WidgetDataStore.save(reactContext.applicationContext, json)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("widget_snapshot_save_failed", error)
    }
  }

  @ReactMethod
  fun getSnapshot(promise: Promise) {
    try {
      promise.resolve(WidgetDataStore.read(reactContext.applicationContext))
    } catch (error: Exception) {
      promise.reject("widget_snapshot_read_failed", error)
    }
  }

  @ReactMethod
  fun reloadWidget(promise: Promise) {
    try {
      val context = reactContext.applicationContext
      val manager = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, "com.afghandev.ebadat.widget.PrayerTimesWidget")
      val ids = manager.getAppWidgetIds(component)
      if (ids.isNotEmpty()) {
        val intent = Intent(context, Class.forName("com.afghandev.ebadat.widget.PrayerTimesWidget"))
        intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        context.sendBroadcast(intent)
      }
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("widget_reload_failed", error)
    }
  }
}
