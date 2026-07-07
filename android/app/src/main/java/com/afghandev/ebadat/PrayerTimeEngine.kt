package com.afghandev.ebadat

import com.batoulapps.adhan2.CalculationMethod
import com.batoulapps.adhan2.Coordinates
import com.batoulapps.adhan2.Madhab
import com.batoulapps.adhan2.PrayerTimes
import com.batoulapps.adhan2.data.DateComponents
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import kotlin.time.ExperimentalTime

@OptIn(ExperimentalTime::class)
object PrayerTimeEngine {
  private const val AFGHAN_MAGHRIB_OFFSET_MINUTES = 4
  private const val AFGHAN_DHUHR_OFFSET_MINUTES = 20
  private const val JUMMAH_HOUR = 13
  private const val JUMMAH_MINUTE = 0

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
  ): Map<PrayerKey, Long> {
    val coordinates = Coordinates(latitude, longitude)
    val dateComponents = DateComponents(date.year, date.monthValue, date.dayOfMonth)
    val parameters = CalculationMethod.KARACHI.parameters.copy(madhab = Madhab.HANAFI)
    val prayerTimes = PrayerTimes(coordinates, dateComponents, parameters)

    val raw = linkedMapOf(
      PrayerKey.FAJR to prayerTimes.fajr.toEpochMilliseconds(),
      PrayerKey.DHUHR to prayerTimes.dhuhr.toEpochMilliseconds(),
      PrayerKey.ASR to prayerTimes.asr.toEpochMilliseconds(),
      PrayerKey.MAGHRIB to prayerTimes.maghrib.toEpochMilliseconds(),
      PrayerKey.ISHA to prayerTimes.isha.toEpochMilliseconds(),
    )

    if (isAfghanistanCityKey(cityKey)) {
      val dhuhrMs = raw[PrayerKey.DHUHR]
      if (dhuhrMs != null) {
        raw[PrayerKey.DHUHR] = dhuhrMs + AFGHAN_DHUHR_OFFSET_MINUTES * 60_000L
      }
      val maghribMs = raw[PrayerKey.MAGHRIB] ?: return raw
      raw[PrayerKey.MAGHRIB] = maghribMs + AFGHAN_MAGHRIB_OFFSET_MINUTES * 60_000L
    }

    val isFriday = date.dayOfWeek == DayOfWeek.FRIDAY
    if (isFriday) {
      val zoneId = ZoneId.of(timezoneId)
      val jummahMs = ZonedDateTime.of(
        date.year,
        date.monthValue,
        date.dayOfMonth,
        JUMMAH_HOUR,
        JUMMAH_MINUTE,
        0,
        0,
        zoneId,
      ).toInstant().toEpochMilli()
      raw[PrayerKey.DHUHR] = jummahMs
    }

    return raw
  }

  fun buildRollingSchedule(
    config: AdhanConfig,
    nowMs: Long,
    rollingDays: Int,
  ): List<ScheduledPrayer> {
    if (!config.masterEnabled) return emptyList()

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

  private fun isAfghanistanCityKey(cityKey: String): Boolean {
    return cityKey.startsWith("afghanistan_")
  }
}
