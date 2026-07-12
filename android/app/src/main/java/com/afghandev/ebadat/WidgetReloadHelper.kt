package com.afghandev.ebadat

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log

object WidgetReloadHelper {
  private const val TAG = "WidgetReloadHelper"
  private const val WIDGET_CLASS = "com.afghandev.ebadat.widget.PrayerTimesWidget"

  fun reloadPrayerWidget(context: Context) {
    try {
      val appContext = context.applicationContext
      val manager = AppWidgetManager.getInstance(appContext)
      val component = ComponentName(appContext, WIDGET_CLASS)
      val ids = manager.getAppWidgetIds(component)
      if (ids.isEmpty()) return

      val intent = Intent()
      intent.component = component
      intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
      intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
      appContext.sendBroadcast(intent)
    } catch (error: Exception) {
      Log.e(TAG, "Failed to reload prayer widget", error)
    }
  }
}
