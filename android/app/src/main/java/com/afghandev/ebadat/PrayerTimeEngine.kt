package com.afghandev.ebadat

import com.batoulapps.adhan2.CalculationMethod
import com.batoulapps.adhan2.Coordinates
import com.batoulapps.adhan2.Madhab
import com.batoulapps.adhan2.PrayerTimes
import com.batoulapps.adhan2.data.DateComponents
import org.json.JSONObject
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import kotlin.time.ExperimentalTime

@OptIn(ExperimentalTime::class)
object PrayerTimeEngine {
  private const val MAGHRIB_OFFSET_MINUTES = 5
  private const val AFGHAN_DHUHR_HOUR = 12
  private const val AFGHAN_DHUHR_MINUTE = 30

  enum class PrayerKey {
    FAJR,
    DHUHR,
    ASR,
    MAGHRIB,
    ISHA,
  }

  data class ScheduledPrayer(
    val prayerKey: PrayerKey,
    val triggerAtMs: Long,
    val dayKey: String,
    val isJummah: Boolean,
  )

  fun computePrayerTimes(
    latitude: Double,
    longitude: Double,
    timezoneId: String,
    cityKey: String,
    date: LocalDate,
    countryCode: String = "",
    calculationMethod: String = "Karachi",
    madhab: String = "Hanafi",
  ): Map<PrayerKey, Long> {
    val coordinates = Coordinates(latitude, longitude)
    val dateComponents = DateComponents(date.year, date.monthValue, date.dayOfMonth)
    val method = resolveCalculationMethod(calculationMethod)
    val madhabEnum = if (madhab.equals("Shafi", ignoreCase = true)) Madhab.SHAFI else Madhab.HANAFI
    var parameters = method.parameters.copy(madhab = madhabEnum)
    // University of Tehran angles (adhan2 has no TEHRAN enum).
    if (calculationMethod.equals("Tehran", ignoreCase = true) || countryCode.equals("IR", ignoreCase = true)) {
      parameters = parameters.copy(fajrAngle = 17.7, ishaAngle = 14.0, madhab = madhabEnum)
    }
    val prayerTimes = PrayerTimes(coordinates, dateComponents, parameters)

    val raw = linkedMapOf(
      PrayerKey.FAJR to prayerTimes.fajr.toEpochMilliseconds(),
      PrayerKey.DHUHR to prayerTimes.dhuhr.toEpochMilliseconds(),
      PrayerKey.ASR to prayerTimes.asr.toEpochMilliseconds(),
      PrayerKey.MAGHRIB to prayerTimes.maghrib.toEpochMilliseconds(),
      PrayerKey.ISHA to prayerTimes.isha.toEpochMilliseconds(),
    )

    // Apply the global Maghrib delay here only for native-calculated raw
    // times. Canonical schedule JSON is already adjusted and is consumed as-is.
    raw[PrayerKey.MAGHRIB] = raw.getValue(PrayerKey.MAGHRIB) + MAGHRIB_OFFSET_MINUTES * 60_000L

    val isAfghanistan = isAfghanistanCity(cityKey, countryCode)
    if (isAfghanistan) {
      val zoneId = ZoneId.of(timezoneId)
      raw[PrayerKey.DHUHR] = ZonedDateTime.of(
        date.year,
        date.monthValue,
        date.dayOfMonth,
        AFGHAN_DHUHR_HOUR,
        AFGHAN_DHUHR_MINUTE,
        0,
        0,
        zoneId,
      ).toInstant().toEpochMilli()
    }

    return raw
  }

  fun buildRollingSchedule(
    config: AdhanConfig,
    nowMs: Long,
    rollingDays: Int,
  ): List<ScheduledPrayer> {
    if (!config.masterEnabled) return emptyList()

    val fromCanonical = buildFromCanonicalSchedule(config, nowMs)
    if (fromCanonical != null) return fromCanonical

    val zoneId = ZoneId.of(config.timezoneId)
    val today = ZonedDateTime.ofInstant(java.time.Instant.ofEpochMilli(nowMs), zoneId).toLocalDate()
    val enabledPrayers = config.enabledPrayerKeys()
    val results = mutableListOf<ScheduledPrayer>()

    for (dayOffset in 0 until rollingDays) {
      val targetDate = today.plusDays(dayOffset.toLong())
      val dayKey = formatDayKey(targetDate)
      val times = computePrayerTimes(
        latitude = config.latitude,
        longitude = config.longitude,
        timezoneId = config.timezoneId,
        cityKey = config.cityKey,
        date = targetDate,
        countryCode = config.countryCode,
        calculationMethod = config.calculationMethod,
        madhab = config.madhab,
      )

      val isFriday = targetDate.dayOfWeek == DayOfWeek.FRIDAY
      for (prayerKey in enabledPrayers) {
        val triggerAtMs = times[prayerKey] ?: continue
        if (triggerAtMs <= nowMs) continue
        val isJummah = isFriday && prayerKey == PrayerKey.DHUHR
        results.add(
          ScheduledPrayer(
            prayerKey = prayerKey,
            triggerAtMs = triggerAtMs,
            dayKey = dayKey,
            isJummah = isJummah,
          ),
        )
      }
    }

    return results.sortedBy { it.triggerAtMs }
  }

  fun formatDayKey(date: LocalDate): String {
    return String.format("%04d-%02d-%02d", date.year, date.monthValue, date.dayOfMonth)
  }

  private fun buildFromCanonicalSchedule(
    config: AdhanConfig,
    nowMs: Long,
  ): List<ScheduledPrayer>? {
    // Pre-v6 canonical schedules may not contain the global Maghrib delay.
    // Recompute locally until JavaScript supplies a versioned fresh schedule.
    if (config.policyVersion < 6L) return null
    val raw = config.scheduleJson?.trim().orEmpty()
    if (raw.isEmpty()) return null

    return try {
      val root = JSONObject(raw)
      val days = root.optJSONArray("days") ?: return null
      val enabled = config.enabledPrayerKeys().toSet()
      val results = mutableListOf<ScheduledPrayer>()

      for (index in 0 until days.length()) {
        val day = days.optJSONObject(index) ?: continue
        val dayKey = day.optString("dateKey")
        if (dayKey.isBlank()) continue
        val localDate = LocalDate.parse(dayKey)
        val isFriday = localDate.dayOfWeek == DayOfWeek.FRIDAY

        fun readMs(key: String): Long? {
          if (!day.has(key) || day.isNull(key)) return null
          val value = day.optLong(key, -1L)
          return if (value > 0L) value else null
        }

        val mapped = mapOf(
          PrayerKey.FAJR to readMs("fajr"),
          PrayerKey.DHUHR to readMs("dhuhr"),
          PrayerKey.ASR to readMs("asr"),
          PrayerKey.MAGHRIB to readMs("maghrib"),
          PrayerKey.ISHA to readMs("isha"),
        )

        for ((prayerKey, triggerAtMs) in mapped) {
          if (prayerKey !in enabled) continue
          val at = triggerAtMs ?: continue
          if (at <= nowMs) continue
          results.add(
            ScheduledPrayer(
              prayerKey = prayerKey,
              triggerAtMs = at,
              dayKey = dayKey,
              isJummah = isFriday && prayerKey == PrayerKey.DHUHR,
            ),
          )
        }
      }

      // An expired canonical window must never suppress the native rolling
      // fallback after an app update, reboot, or long period offline. A
      // disabled-prayer configuration naturally also produces an empty native
      // fallback, so returning null is safe in both cases.
      results.sortedBy { it.triggerAtMs }.takeIf { it.isNotEmpty() }
    } catch (_: Exception) {
      null
    }
  }

  private fun resolveCalculationMethod(name: String): CalculationMethod {
    // adhan2 0.0.6 has no TEHRAN enum; IR canonical times come from JS scheduleJson.
    // OTHER is used as the local fallback for Tehran-style requests.
    return when (name.trim().lowercase()) {
      "muslimworldleague", "mwl" -> CalculationMethod.MUSLIM_WORLD_LEAGUE
      "egyptian" -> CalculationMethod.EGYPTIAN
      "ummalqura", "umm_al_qura" -> CalculationMethod.UMM_AL_QURA
      "dubai" -> CalculationMethod.DUBAI
      "moonsightingcommittee" -> CalculationMethod.MOON_SIGHTING_COMMITTEE
      "northamerica", "isna" -> CalculationMethod.NORTH_AMERICA
      "kuwait" -> CalculationMethod.KUWAIT
      "qatar" -> CalculationMethod.QATAR
      "singapore" -> CalculationMethod.SINGAPORE
      "tehran" -> CalculationMethod.OTHER
      "turkey", "diyanet" -> CalculationMethod.TURKEY
      else -> CalculationMethod.KARACHI
    }
  }

  private fun isAfghanistanCity(cityKey: String, countryCode: String): Boolean {
    if (countryCode.equals("AF", ignoreCase = true)) return true
    return cityKey.startsWith("afghanistan_")
  }
}
