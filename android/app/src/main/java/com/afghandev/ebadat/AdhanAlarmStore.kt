package com.afghandev.ebadat

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

class AdhanAlarmStore(context: Context) {
  private val preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  @Synchronized
  fun getAll(): List<AdhanAlarmPayload> {
    val raw = preferences.getString(KEY_ALARMS_JSON, null) ?: return emptyList()
    return try {
      val array = JSONArray(raw)
      val payloads = mutableListOf<AdhanAlarmPayload>()
      for (index in 0 until array.length()) {
        val item = array.optJSONObject(index) ?: continue
        val parsed = AdhanAlarmPayload.fromJson(item)
        if (parsed != null) {
          payloads.add(parsed)
        }
      }
      payloads
    } catch (_: Exception) {
      emptyList()
    }
  }

  @Synchronized
  fun upsert(payload: AdhanAlarmPayload) {
    val map = LinkedHashMap<String, AdhanAlarmPayload>()
    for (item in getAll()) {
      map[item.id] = item
    }
    map[payload.id] = payload
    saveAll(map.values.toList())
  }

  @Synchronized
  fun remove(id: String) {
    val remaining = getAll().filter { it.id != id }
    saveAll(remaining)
  }

  @Synchronized
  fun pruneExpired(nowMs: Long) {
    val remaining = getAll().filter { it.triggerAtMs > nowMs }
    saveAll(remaining)
  }

  @Synchronized
  fun clear() {
    preferences.edit().remove(KEY_ALARMS_JSON).apply()
  }

  @Synchronized
  private fun saveAll(payloads: List<AdhanAlarmPayload>) {
    if (payloads.isEmpty()) {
      preferences.edit().remove(KEY_ALARMS_JSON).apply()
      return
    }

    val array = JSONArray()
    payloads.sortedBy { it.triggerAtMs }.forEach { payload ->
      array.put(payload.toJson())
    }
    preferences.edit().putString(KEY_ALARMS_JSON, array.toString()).apply()
  }

  companion object {
    private const val PREFS_NAME = "ebadat_adhan_exact_alarms_v1"
    private const val KEY_ALARMS_JSON = "alarms"
  }
}
