package com.afghandev.ebadat

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class AdhanFiredEvent(
  val id: String,
  val type: String,
  val expectedFireAtMs: Long,
  val actualFireAtMs: Long,
  val delaySeconds: Long,
  val prayer: String?,
) {
  fun toJson(): JSONObject {
    return JSONObject().apply {
      put("id", id)
      put("type", type)
      put("expectedFireAtMs", expectedFireAtMs)
      put("actualFireAtMs", actualFireAtMs)
      put("delaySeconds", delaySeconds)
      if (prayer != null) {
        put("prayer", prayer)
      }
    }
  }

  companion object {
    fun fromJson(json: JSONObject): AdhanFiredEvent? {
      val id = json.optString("id", "").trim()
      if (id.isEmpty()) return null
      return AdhanFiredEvent(
        id = id,
        type = json.optString("type", "adhan"),
        expectedFireAtMs = json.optLong("expectedFireAtMs"),
        actualFireAtMs = json.optLong("actualFireAtMs"),
        delaySeconds = json.optLong("delaySeconds"),
        prayer = json.optString("prayer", null)?.takeIf { it.isNotBlank() },
      )
    }
  }
}

class AdhanFiredLogStore(context: Context) {
  private val preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  @Synchronized
  fun append(
    id: String,
    type: String,
    expectedFireAtMs: Long,
    actualFireAtMs: Long,
    prayer: String?,
  ) {
    val delaySeconds = ((actualFireAtMs - expectedFireAtMs) / 1000L).coerceAtLeast(0L)
    val event = AdhanFiredEvent(
      id = id,
      type = type,
      expectedFireAtMs = expectedFireAtMs,
      actualFireAtMs = actualFireAtMs,
      delaySeconds = delaySeconds,
      prayer = prayer,
    )

    val events = getAll().toMutableList()
    events.removeAll { it.id == id && it.actualFireAtMs == actualFireAtMs }
    events.add(0, event)
    saveAll(events.take(MAX_EVENTS))

    if (type == "maintenance") {
      preferences.edit().putLong(KEY_LAST_MAINTENANCE_FIRED_AT, actualFireAtMs).apply()
    }
  }

  @Synchronized
  fun getAll(): List<AdhanFiredEvent> {
    val raw = preferences.getString(KEY_EVENTS_JSON, null) ?: return emptyList()
    return try {
      val array = JSONArray(raw)
      val events = mutableListOf<AdhanFiredEvent>()
      for (index in 0 until array.length()) {
        val item = array.optJSONObject(index) ?: continue
        val parsed = AdhanFiredEvent.fromJson(item) ?: continue
        events.add(parsed)
      }
      events
    } catch (_: Exception) {
      emptyList()
    }
  }

  @Synchronized
  fun getLastMaintenanceFiredAtMs(): Long? {
    val value = preferences.getLong(KEY_LAST_MAINTENANCE_FIRED_AT, 0L)
    return if (value > 0L) value else null
  }

  @Synchronized
  private fun saveAll(events: List<AdhanFiredEvent>) {
    if (events.isEmpty()) {
      preferences.edit().remove(KEY_EVENTS_JSON).apply()
      return
    }

    val array = JSONArray()
    events.forEach { event -> array.put(event.toJson()) }
    preferences.edit().putString(KEY_EVENTS_JSON, array.toString()).apply()
  }

  companion object {
    private const val PREFS_NAME = "ebadat_adhan_fired_log_v1"
    private const val KEY_EVENTS_JSON = "events"
    private const val KEY_LAST_MAINTENANCE_FIRED_AT = "last_maintenance_fired_at"
    private const val MAX_EVENTS = 30

    fun get(context: Context): AdhanFiredLogStore {
      return AdhanFiredLogStore(context.applicationContext)
    }
  }
}
