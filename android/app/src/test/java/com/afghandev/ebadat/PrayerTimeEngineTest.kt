package com.afghandev.ebadat

import org.junit.Assert.assertTrue
import org.junit.Test

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
}
