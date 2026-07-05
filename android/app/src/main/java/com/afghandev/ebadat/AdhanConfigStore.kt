package com.afghandev.ebadat

import android.content.Context
import org.json.JSONObject

class AdhanConfigStore(context: Context) {
  private val preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  @Synchronized
  fun save(config: AdhanConfig) {
    preferences.edit().putString(KEY_CONFIG_JSON, config.toJson().toString()).apply()
  }

  @Synchronized
  fun load(): AdhanConfig? {
    val raw = preferences.getString(KEY_CONFIG_JSON, null) ?: return null
    return try {
      AdhanConfig.fromJson(JSONObject(raw))
    } catch (_: Exception) {
      null
    }
  }

  @Synchronized
  fun clear() {
    preferences.edit().remove(KEY_CONFIG_JSON).apply()
  }

  companion object {
    private const val PREFS_NAME = "ebadat_adhan_config_v1"
    private const val KEY_CONFIG_JSON = "config"

    fun get(context: Context): AdhanConfigStore {
      return AdhanConfigStore(context.applicationContext)
    }
  }
}
