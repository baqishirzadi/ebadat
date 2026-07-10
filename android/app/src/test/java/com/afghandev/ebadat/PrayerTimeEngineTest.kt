package com.afghandev.ebadat

import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.time.ExperimentalTime

@OptIn(ExperimentalTime::class)
class PrayerTimeEngineTest {
  @Test
  fun rollingSchedule_respectsMasterDisabled() {
    val config = AdhanConfig(
      latitude = 34.5553,
      longitude = 69.2075,
      timezoneId = "Asia/Kabul",
      cityKey = "afghanistan_kabul",
      masterEnabled = false,
      fajrEnabled = true,
      dhuhrEnabled = true,
      asrEnabled = true,
      maghribEnabled = true,
      ishaEnabled = true,
      voice = "barakatullah",
      fajrTitle = "t",
      fajrBody = "b",
      dhuhrTitle = "t",
      dhuhrBody = "b",
      asrTitle = "t",
      asrBody = "b",
      maghribTitle = "t",
      maghribBody = "b",
      ishaTitle = "t",
      ishaBody = "b",
      jummahTitle = "t",
      jummahBody = "b",
      fajrChannelId = AdhanConfig.DEFAULT_FAJR_CHANNEL,
      regularChannelId = AdhanConfig.DEFAULT_REGULAR_CHANNEL,
      configVersion = 1L,
    )

    val schedule = PrayerTimeEngine.buildRollingSchedule(config, System.currentTimeMillis(), 3)
    assertTrue(schedule.isEmpty())
  }

  @Test
  fun formatDayKey_usesIsoDate() {
    val key = PrayerTimeEngine.formatDayKey(java.time.LocalDate.of(2026, 7, 6))
    assertTrue(key == "2026-07-06")
  }

  @Test
  fun maghribOffset_appliesForAllCities() {
    val date = java.time.LocalDate.of(2026, 7, 6)
    val karachiTimes = PrayerTimeEngine.computePrayerTimes(
      latitude = 24.8607,
      longitude = 67.0011,
      timezoneId = "Asia/Karachi",
      cityKey = "pakistan_karachi",
      date = date,
    )
    val coordinates = com.batoulapps.adhan2.Coordinates(24.8607, 67.0011)
    val dateComponents = com.batoulapps.adhan2.data.DateComponents(date.year, date.monthValue, date.dayOfMonth)
    val parameters = com.batoulapps.adhan2.CalculationMethod.KARACHI.parameters.copy(
      madhab = com.batoulapps.adhan2.Madhab.HANAFI,
    )
    val baseMaghrib = com.batoulapps.adhan2.PrayerTimes(coordinates, dateComponents, parameters)
      .maghrib
      .toEpochMilliseconds()
    val expected = baseMaghrib + 3 * 60_000L
    assertTrue(karachiTimes[PrayerTimeEngine.PrayerKey.MAGHRIB] == expected)
  }
}
