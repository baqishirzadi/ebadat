package com.afghandev.ebadat

import android.content.Context

object WidgetDataStore {
  const val PREFS_NAME = "ebadat_widget"
  const val SNAPSHOT_KEY = "ebadat_widget_snapshot_v1"

  fun save(context: Context, json: String) {
    // commit() so a following widget reload cannot race and read the previous
    // snapshot (apply() is async and dropped the current-prayer highlight after
    // language switches, especially Dari ↔ Pashto).
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(SNAPSHOT_KEY, json)
      .commit()
  }

  fun read(context: Context): String? {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(SNAPSHOT_KEY, null)
  }
}
