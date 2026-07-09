package com.afghandev.ebadat

import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject
import com.afghandev.ebadat.PrayerTimeEngine.PrayerKey

data class AdhanConfig(
  val latitude: Double,
  val longitude: Double,
  val timezoneId: String,
  val cityKey: String,
  val masterEnabled: Boolean,
  val fajrEnabled: Boolean,
  val dhuhrEnabled: Boolean,
  val asrEnabled: Boolean,
  val maghribEnabled: Boolean,
  val ishaEnabled: Boolean,
  val voice: String,
  val fajrTitle: String,
  val fajrBody: String,
  val dhuhrTitle: String,
  val dhuhrBody: String,
  val asrTitle: String,
  val asrBody: String,
  val maghribTitle: String,
  val maghribBody: String,
  val ishaTitle: String,
  val ishaBody: String,
  val jummahTitle: String,
  val jummahBody: String,
  val fajrChannelId: String,
  val regularChannelId: String,
  val configVersion: Long,
) {
  fun enabledPrayerKeys(): List<PrayerKey> {
    val keys = mutableListOf<PrayerKey>()
    if (fajrEnabled) keys.add(PrayerKey.FAJR)
    if (dhuhrEnabled) keys.add(PrayerKey.DHUHR)
    if (asrEnabled) keys.add(PrayerKey.ASR)
    if (maghribEnabled) keys.add(PrayerKey.MAGHRIB)
    if (ishaEnabled) keys.add(PrayerKey.ISHA)
    return keys
  }

  fun titleFor(prayerKey: PrayerKey, isJummah: Boolean): String {
    if (isJummah) return jummahTitle
    return when (prayerKey) {
      PrayerKey.FAJR -> fajrTitle
      PrayerKey.DHUHR -> dhuhrTitle
      PrayerKey.ASR -> asrTitle
      PrayerKey.MAGHRIB -> maghribTitle
      PrayerKey.ISHA -> ishaTitle
    }
  }

  fun bodyFor(prayerKey: PrayerKey, isJummah: Boolean): String {
    if (isJummah) return jummahBody
    return when (prayerKey) {
      PrayerKey.FAJR -> fajrBody
      PrayerKey.DHUHR -> dhuhrBody
      PrayerKey.ASR -> asrBody
      PrayerKey.MAGHRIB -> maghribBody
      PrayerKey.ISHA -> ishaBody
    }
  }

  fun channelIdFor(prayerKey: PrayerKey): String {
    return if (prayerKey == PrayerKey.FAJR) fajrChannelId else regularChannelId
  }

  fun prayerKeyToString(prayerKey: PrayerKey): String {
    return when (prayerKey) {
      PrayerKey.FAJR -> "fajr"
      PrayerKey.DHUHR -> "dhuhr"
      PrayerKey.ASR -> "asr"
      PrayerKey.MAGHRIB -> "maghrib"
      PrayerKey.ISHA -> "isha"
    }
  }

  fun toJson(): JSONObject {
    val json = JSONObject()
    json.put("latitude", latitude)
    json.put("longitude", longitude)
    json.put("timezoneId", timezoneId)
    json.put("cityKey", cityKey)
    json.put("masterEnabled", masterEnabled)
    json.put("fajrEnabled", fajrEnabled)
    json.put("dhuhrEnabled", dhuhrEnabled)
    json.put("asrEnabled", asrEnabled)
    json.put("maghribEnabled", maghribEnabled)
    json.put("ishaEnabled", ishaEnabled)
    json.put("voice", voice)
    json.put("fajrTitle", fajrTitle)
    json.put("fajrBody", fajrBody)
    json.put("dhuhrTitle", dhuhrTitle)
    json.put("dhuhrBody", dhuhrBody)
    json.put("asrTitle", asrTitle)
    json.put("asrBody", asrBody)
    json.put("maghribTitle", maghribTitle)
    json.put("maghribBody", maghribBody)
    json.put("ishaTitle", ishaTitle)
    json.put("ishaBody", ishaBody)
    json.put("jummahTitle", jummahTitle)
    json.put("jummahBody", jummahBody)
    json.put("fajrChannelId", fajrChannelId)
    json.put("regularChannelId", regularChannelId)
    json.put("configVersion", configVersion)
    return json
  }

  companion object {
    const val DEFAULT_FAJR_CHANNEL = "adhan-fajr-v7"
    const val DEFAULT_REGULAR_CHANNEL = "adhan-regular-v7"

    fun fromReadableMap(map: ReadableMap): AdhanConfig {
      val latitude = map.getDouble("latitude")
      val longitude = map.getDouble("longitude")
      val timezoneId = map.getString("timezoneId")?.trim().orEmpty()
      val cityKey = map.getString("cityKey")?.trim().orEmpty()
      if (timezoneId.isEmpty() || cityKey.isEmpty()) {
        throw IllegalArgumentException("timezoneId and cityKey are required")
      }

      return AdhanConfig(
        latitude = latitude,
        longitude = longitude,
        timezoneId = timezoneId,
        cityKey = cityKey,
        masterEnabled = readBoolean(map, "masterEnabled", true),
        fajrEnabled = readBoolean(map, "fajrEnabled", true),
        dhuhrEnabled = readBoolean(map, "dhuhrEnabled", true),
        asrEnabled = readBoolean(map, "asrEnabled", true),
        maghribEnabled = readBoolean(map, "maghribEnabled", true),
        ishaEnabled = readBoolean(map, "ishaEnabled", true),
        voice = map.getString("voice")?.trim().orEmpty().ifEmpty { "barakatullah" },
        fajrTitle = readString(map, "fajrTitle", "وقت نماز"),
        fajrBody = readString(map, "fajrBody", "وقت نماز صبح است، همانا نماز صبح مشهود است."),
        dhuhrTitle = readString(map, "dhuhrTitle", "وقت نماز"),
        dhuhrBody = readString(map, "dhuhrBody", "وقت نماز ظهر است، نماز را برای یاد خدا برپا دارید."),
        asrTitle = readString(map, "asrTitle", "وقت نماز"),
        asrBody = readString(map, "asrBody", "وقت نماز عصر است، نماز را پاس بدارید."),
        maghribTitle = readString(map, "maghribTitle", "وقت نماز"),
        maghribBody = readString(map, "maghribBody", "وقت نماز شام است، پروردگار خویش را تسبیح گویید."),
        ishaTitle = readString(map, "ishaTitle", "وقت نماز"),
        ishaBody = readString(map, "ishaBody", "وقت نماز خفتن است، دل را با یاد خدا آرام کنید."),
        jummahTitle = readString(map, "jummahTitle", "نماز جمعه"),
        jummahBody = readString(
          map,
          "jummahBody",
          "وقت نماز جمعه است. به سوی ذکر و عبادت خدا بشتابید و داد و ستد را رها سازید",
        ),
        fajrChannelId = readString(map, "fajrChannelId", DEFAULT_FAJR_CHANNEL),
        regularChannelId = readString(map, "regularChannelId", DEFAULT_REGULAR_CHANNEL),
        configVersion = if (map.hasKey("configVersion") && !map.isNull("configVersion")) {
          map.getDouble("configVersion").toLong()
        } else {
          System.currentTimeMillis()
        },
      )
    }

    fun fromJson(json: JSONObject): AdhanConfig? {
      return try {
        AdhanConfig(
          latitude = json.getDouble("latitude"),
          longitude = json.getDouble("longitude"),
          timezoneId = json.getString("timezoneId"),
          cityKey = json.getString("cityKey"),
          masterEnabled = json.optBoolean("masterEnabled", true),
          fajrEnabled = json.optBoolean("fajrEnabled", true),
          dhuhrEnabled = json.optBoolean("dhuhrEnabled", true),
          asrEnabled = json.optBoolean("asrEnabled", true),
          maghribEnabled = json.optBoolean("maghribEnabled", true),
          ishaEnabled = json.optBoolean("ishaEnabled", true),
          voice = json.optString("voice", "barakatullah"),
          fajrTitle = json.optString("fajrTitle", "وقت نماز"),
          fajrBody = json.optString("fajrBody", "وقت نماز صبح است، همانا نماز صبح مشهود است."),
          dhuhrTitle = json.optString("dhuhrTitle", "وقت نماز"),
          dhuhrBody = json.optString("dhuhrBody", "وقت نماز ظهر است، نماز را برای یاد خدا برپا دارید."),
          asrTitle = json.optString("asrTitle", "وقت نماز"),
          asrBody = json.optString("asrBody", "وقت نماز عصر است، نماز را پاس بدارید."),
          maghribTitle = json.optString("maghribTitle", "وقت نماز"),
          maghribBody = json.optString("maghribBody", "وقت نماز شام است، پروردگار خویش را تسبیح گویید."),
          ishaTitle = json.optString("ishaTitle", "وقت نماز"),
          ishaBody = json.optString("ishaBody", "وقت نماز خفتن است، دل را با یاد خدا آرام کنید."),
          jummahTitle = json.optString("jummahTitle", "نماز جمعه"),
          jummahBody = json.optString(
            "jummahBody",
            "وقت نماز جمعه است. به سوی ذکر و عبادت خدا بشتابید و داد و ستد را رها سازید",
          ),
          fajrChannelId = json.optString("fajrChannelId", DEFAULT_FAJR_CHANNEL),
          regularChannelId = json.optString("regularChannelId", DEFAULT_REGULAR_CHANNEL),
          configVersion = json.optLong("configVersion", System.currentTimeMillis()),
        )
      } catch (_: Exception) {
        null
      }
    }

    private fun readBoolean(map: ReadableMap, key: String, defaultValue: Boolean): Boolean {
      return if (map.hasKey(key) && !map.isNull(key)) map.getBoolean(key) else defaultValue
    }

    private fun readString(map: ReadableMap, key: String, defaultValue: String): String {
      val value = map.getString(key)?.trim().orEmpty()
      return value.ifEmpty { defaultValue }
    }
  }
}
