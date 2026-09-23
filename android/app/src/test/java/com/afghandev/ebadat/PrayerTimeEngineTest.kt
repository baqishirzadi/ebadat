package com.afghandev.ebadat

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Ignore
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
  fun maghribOffset_appliesGloballyWithoutChangingOtherPrayerTimes() {
    val date = java.time.LocalDate.of(2026, 7, 6)
    val dateComponents = com.batoulapps.adhan2.data.DateComponents(date.year, date.monthValue, date.dayOfMonth)
    val parameters = com.batoulapps.adhan2.CalculationMethod.KARACHI.parameters.copy(
      madhab = com.batoulapps.adhan2.Madhab.HANAFI,
    )
    val fixtures = listOf(
      Triple(24.8607, 67.0011, "PK" to "pakistan_karachi"),
      Triple(40.7128, -74.0060, "US" to "usa_new_york"),
      Triple(-33.8688, 151.2093, "ZZ" to "custom_unknown"),
      Triple(34.5553, 69.2075, "AF" to "afghanistan_kabul"),
    )

    for ((latitude, longitude, identity) in fixtures) {
      val (countryCode, cityKey) = identity
      val coordinates = com.batoulapps.adhan2.Coordinates(latitude, longitude)
      val base = com.batoulapps.adhan2.PrayerTimes(coordinates, dateComponents, parameters)
      val actual = PrayerTimeEngine.computePrayerTimes(
        latitude = latitude,
        longitude = longitude,
        timezoneId = "UTC",
        cityKey = cityKey,
        date = date,
        countryCode = countryCode,
      )
      assertEquals(
        "$cityKey must receive exactly 300 seconds",
        300_000L,
        actual[PrayerTimeEngine.PrayerKey.MAGHRIB]!! - base.maghrib.toEpochMilliseconds(),
      )
      assertEquals(base.fajr.toEpochMilliseconds(), actual[PrayerTimeEngine.PrayerKey.FAJR])
      assertEquals(base.asr.toEpochMilliseconds(), actual[PrayerTimeEngine.PrayerKey.ASR])
      assertEquals(base.isha.toEpochMilliseconds(), actual[PrayerTimeEngine.PrayerKey.ISHA])
      if (countryCode != "AF") {
        assertEquals(base.dhuhr.toEpochMilliseconds(), actual[PrayerTimeEngine.PrayerKey.DHUHR])
      }
    }
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
  @Ignore("org.json is provided by Android at runtime; canonical parsing is covered by device verification")
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
      policyVersion = 6L,
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
    assertEquals(4102488000000L, schedule.first { it.prayerKey == PrayerTimeEngine.PrayerKey.MAGHRIB }.triggerAtMs)
  }

  @Test
  fun customAfghanistanCountryCode_getsExactlyFiveMinuteMaghribOffset() {
    val date = java.time.LocalDate.of(2026, 9, 22)
    val coordinates = com.batoulapps.adhan2.Coordinates(34.4415, 70.4361)
    val components = com.batoulapps.adhan2.data.DateComponents(date.year, date.monthValue, date.dayOfMonth)
    val parameters = com.batoulapps.adhan2.CalculationMethod.KARACHI.parameters.copy(
      madhab = com.batoulapps.adhan2.Madhab.HANAFI,
    )
    val raw = com.batoulapps.adhan2.PrayerTimes(coordinates, components, parameters).maghrib
      .toEpochMilliseconds()
    val scheduled = PrayerTimeEngine.computePrayerTimes(
      latitude = 34.4415,
      longitude = 70.4361,
      timezoneId = "Asia/Kabul",
      cityKey = "custom_gps",
      date = date,
      countryCode = "AF",
    )[PrayerTimeEngine.PrayerKey.MAGHRIB]!!
    assertEquals(300_000L, scheduled - raw)
  }
}
