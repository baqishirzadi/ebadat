package com.afghandev.ebadat

import android.content.Context

object WidgetDataStore {
  const val PREFS_NAME = "ebadat_widget"
  const val SNAPSHOT_KEY = "ebadat_widget_snapshot_v1"

  fun save(context: Context, json: String) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(SNAPSHOT_KEY, json)
      .apply()
  }

  fun read(context: Context): String? {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(SNAPSHOT_KEY, null)
  }
}
