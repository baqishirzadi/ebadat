package com.afghandev.ebadat

import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import org.json.JSONObject

data class AdhanAlarmPayload(
  val id: String,
  val triggerAtMs: Long,
  val title: String,
  val body: String,
  val channelId: String,
  val scheduleMode: String = "exact",
  val type: String = "adhan",
  val prayer: String? = null,
  val expectedFireAtMs: Long,
  val dayKey: String? = null,
  val isJummah: Boolean = false,
  val voice: String? = null
) {
  fun toJson(): JSONObject {
    val json = JSONObject()
    json.put("id", id)
    json.put("triggerAtMs", triggerAtMs)
    json.put("title", title)
    json.put("body", body)
    json.put("channelId", channelId)
    json.put("scheduleMode", scheduleMode)
    json.put("type", type)
    json.put("expectedFireAtMs", expectedFireAtMs)
    json.put("isJummah", isJummah)
    prayer?.let { json.put("prayer", it) }
    dayKey?.let { json.put("dayKey", it) }
    voice?.let { json.put("voice", it) }
    return json
  }

  fun toWritableMap(): WritableMap {
    val map = Arguments.createMap()
    map.putString("id", id)
    map.putDouble("triggerAtMs", triggerAtMs.toDouble())
    map.putString("title", title)
    map.putString("body", body)
    map.putString("channelId", channelId)
    map.putString("scheduleMode", scheduleMode)
    map.putString("type", type)
    map.putDouble("expectedFireAtMs", expectedFireAtMs.toDouble())
    map.putBoolean("isJummah", isJummah)
    if (prayer != null) map.putString("prayer", prayer) else map.putNull("prayer")
    if (dayKey != null) map.putString("dayKey", dayKey) else map.putNull("dayKey")
    if (voice != null) map.putString("voice", voice) else map.putNull("voice")
    return map
  }

  fun putIntentExtras(intent: Intent) {
    intent.putExtra(AdhanAlarmScheduler.EXTRA_ID, id)
    intent.putExtra(AdhanAlarmScheduler.EXTRA_PAYLOAD_JSON, toJson().toString())
  }

  companion object {
    fun fromReadableMap(map: ReadableMap): AdhanAlarmPayload {
      val id = map.getString("id")?.trim().orEmpty()
      if (id.isEmpty()) throw IllegalArgumentException("Alarm id is required")

      if (!map.hasKey("triggerAtMs") || map.isNull("triggerAtMs")) {
        throw IllegalArgumentException("triggerAtMs is required")
      }

      val triggerAtMs = map.getDouble("triggerAtMs").toLong()
      val title = map.getString("title")?.trim().orEmpty()
      val body = map.getString("body")?.trim().orEmpty()
      val channelId = map.getString("channelId")?.trim().orEmpty()
      if (title.isEmpty() || body.isEmpty() || channelId.isEmpty()) {
        throw IllegalArgumentException("title, body and channelId are required")
      }

      val scheduleMode = map.getString("scheduleMode")?.trim().orEmpty().ifEmpty { "exact" }
      if (scheduleMode != "exact" && scheduleMode != "fallback_inexact") {
        throw IllegalArgumentException("scheduleMode must be exact or fallback_inexact")
      }
      val type = map.getString("type")?.trim().orEmpty().ifEmpty { "adhan" }
      val prayer = if (map.hasKey("prayer") && !map.isNull("prayer")) map.getString("prayer") else null
      val dayKey = if (map.hasKey("dayKey") && !map.isNull("dayKey")) map.getString("dayKey") else null
      val voice = if (map.hasKey("voice") && !map.isNull("voice")) map.getString("voice") else null
      val isJummah = map.hasKey("isJummah") && !map.isNull("isJummah") && map.getBoolean("isJummah")
      val expectedFireAtMs =
        if (map.hasKey("expectedFireAtMs") && !map.isNull("expectedFireAtMs")) {
          map.getDouble("expectedFireAtMs").toLong()
        } else {
          triggerAtMs
        }

      return AdhanAlarmPayload(
        id = id,
        triggerAtMs = triggerAtMs,
        title = title,
        body = body,
        channelId = channelId,
        scheduleMode = scheduleMode,
        type = type,
        prayer = prayer,
        expectedFireAtMs = expectedFireAtMs,
        dayKey = dayKey,
        isJummah = isJummah,
        voice = voice,
      )
    }

    fun fromJson(json: JSONObject): AdhanAlarmPayload? {
      val id = json.optString("id", "").trim()
      val triggerAtMs = json.optLong("triggerAtMs", -1)
      val title = json.optString("title", "").trim()
      val body = json.optString("body", "").trim()
      val channelId = json.optString("channelId", "").trim()

      if (id.isEmpty() || triggerAtMs <= 0 || title.isEmpty() || body.isEmpty() || channelId.isEmpty()) {
        return null
      }

      val scheduleMode = json.optString("scheduleMode", "exact")
        .takeIf { it == "exact" || it == "fallback_inexact" }
        ?: "exact"

      return AdhanAlarmPayload(
        id = id,
        triggerAtMs = triggerAtMs,
        title = title,
        body = body,
        channelId = channelId,
        scheduleMode = scheduleMode,
        type = json.optString("type", "adhan"),
        prayer = optionalString(json, "prayer"),
        expectedFireAtMs = json.optLong("expectedFireAtMs", triggerAtMs),
        dayKey = optionalString(json, "dayKey"),
        isJummah = json.optBoolean("isJummah", false),
        voice = optionalString(json, "voice"),
      )
    }

    fun fromIntent(intent: Intent?): AdhanAlarmPayload? {
      if (intent == null) return null
      val jsonText = intent.getStringExtra(AdhanAlarmScheduler.EXTRA_PAYLOAD_JSON)
      if (jsonText.isNullOrBlank()) return null
      return try {
        fromJson(JSONObject(jsonText))
      } catch (_: Exception) {
        null
      }
    }

    private fun optionalString(json: JSONObject, key: String): String? {
      if (!json.has(key) || json.isNull(key)) return null
      val value = json.optString(key, "").trim()
      return value.ifEmpty { null }
    }
  }
}
