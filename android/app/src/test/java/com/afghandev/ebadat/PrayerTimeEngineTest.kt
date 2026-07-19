package com.afghandev.ebadat

import org.junit.Assert.assertEquals
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
      countryCode = "AF",
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
  fun maghribOffset_appliesOnlyForAfghanistan() {
    val date = java.time.LocalDate.of(2026, 7, 6)
    val coordinates = com.batoulapps.adhan2.Coordinates(24.8607, 67.0011)
    val dateComponents = com.batoulapps.adhan2.data.DateComponents(date.year, date.monthValue, date.dayOfMonth)
    val parameters = com.batoulapps.adhan2.CalculationMethod.KARACHI.parameters.copy(
      madhab = com.batoulapps.adhan2.Madhab.HANAFI,
    )
    val baseMaghrib = com.batoulapps.adhan2.PrayerTimes(coordinates, dateComponents, parameters)
      .maghrib
      .toEpochMilliseconds()

    val karachiTimes = PrayerTimeEngine.computePrayerTimes(
      latitude = 24.8607,
      longitude = 67.0011,
      timezoneId = "Asia/Karachi",
      cityKey = "pakistan_karachi",
      date = date,
      countryCode = "PK",
    )
    assertEquals(baseMaghrib, karachiTimes[PrayerTimeEngine.PrayerKey.MAGHRIB])

    val kabulDate = java.time.LocalDate.of(2026, 7, 6)
    val kabulTimes = PrayerTimeEngine.computePrayerTimes(
      latitude = 34.5553,
      longitude = 69.2075,
      timezoneId = "Asia/Kabul",
      cityKey = "afghanistan_kabul",
      date = kabulDate,
      countryCode = "AF",
    )
    val kabulCoords = com.batoulapps.adhan2.Coordinates(34.5553, 69.2075)
    val kabulComponents = com.batoulapps.adhan2.data.DateComponents(
      kabulDate.year,
      kabulDate.monthValue,
      kabulDate.dayOfMonth,
    )
    val kabulBaseMaghrib = com.batoulapps.adhan2.PrayerTimes(kabulCoords, kabulComponents, parameters)
      .maghrib
      .toEpochMilliseconds()
    assertEquals(kabulBaseMaghrib + 3 * 60_000L, kabulTimes[PrayerTimeEngine.PrayerKey.MAGHRIB])
  }

  @Test
  fun afghanistanDhuhr_isExactly1230IncludingFriday() {
    val friday = java.time.LocalDate.of(2026, 7, 17) // Friday
    val monday = java.time.LocalDate.of(2026, 7, 20)
    for (date in listOf(friday, monday)) {
      val times = PrayerTimeEngine.computePrayerTimes(
        latitude = 34.3482,
        longitude = 62.1997,
        timezoneId = "Asia/Kabul",
        cityKey = "afghanistan_herat",
        date = date,
        countryCode = "AF",
      )
      val dhuhr = java.time.Instant.ofEpochMilli(times[PrayerTimeEngine.PrayerKey.DHUHR]!!)
        .atZone(java.time.ZoneId.of("Asia/Kabul"))
      assertEquals(12, dhuhr.hour)
      assertEquals(30, dhuhr.minute)
    }
  }

  @Test
  fun canonicalScheduleJson_isPreferredOverLocalCalculation() {
    val scheduleJson = """
      {"days":[{"dateKey":"2099-01-01","fajr":4102448400000,"dhuhr":4102466400000,"asr":4102477200000,"maghrib":4102488000000,"isha":4102495200000}]}
    """.trimIndent()
    val config = AdhanConfig(
      latitude = 34.5553,
      longitude = 69.2075,
      timezoneId = "Asia/Kabul",
      cityKey = "afghanistan_kabul",
      countryCode = "AF",
      scheduleJson = scheduleJson,
      masterEnabled = true,
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
    val schedule = PrayerTimeEngine.buildRollingSchedule(config, 0L, 7)
    assertEquals(5, schedule.size)
    assertEquals(4102448400000L, schedule.first().triggerAtMs)
  }
}
