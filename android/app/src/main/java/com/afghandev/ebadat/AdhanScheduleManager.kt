package com.afghandev.ebadat

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.concurrent.TimeUnit
import kotlin.math.abs

object AdhanScheduleManager {
  private const val TAG = "AdhanScheduleManager"
  private const val ROLLING_DAYS = 3
  private const val MAINTENANCE_ALARM_ID = "__adhan_daily_maintenance__"
  private const val MAINTENANCE_HOUR = 0
  private const val MAINTENANCE_MINUTE = 5
  const val ACTION_DAILY_MAINTENANCE = "com.afghandev.ebadat.action.DAILY_ADHAN_MAINTENANCE"
  private const val PERIODIC_WORK_NAME = "adhan_maintenance_periodic"

  fun ensureScheduled(context: Context, reason: String): AdhanScheduleResult {
    val appContext = context.applicationContext
    AdhanNotificationChannels.ensureCreated(appContext)
    enqueuePeriodicMaintenance(appContext)
    scheduleDailyMaintenanceAlarm(appContext)

    val config = AdhanConfigStore.get(appContext).load()
    if (config == null || !config.masterEnabled) {
      val existing = AdhanAlarmScheduler.getStored(appContext)
        .filter { it.id != MAINTENANCE_ALARM_ID }
      val cancelled = existing.size
      existing.forEach { AdhanAlarmScheduler.cancel(appContext, it.id) }
      Log.i(TAG, "ensureScheduled reason=$reason cleared alarms (config missing or disabled)")
      return AdhanScheduleResult(
        reason = reason,
        scheduledCount = 0,
        cancelledCount = cancelled,
        expectedCount = 0,
        nextAlarmAtMs = null,
      )
    }

    val nowMs = System.currentTimeMillis()
    val scheduleMode = if (AdhanAlarmScheduler.canScheduleExactAlarms(appContext)) "exact" else "fallback_inexact"
    val planned = PrayerTimeEngine.buildRollingSchedule(config, nowMs, ROLLING_DAYS)
    val expectedPayloads = planned.map { prayer ->
      buildPayload(config, prayer, scheduleMode)
    }

    val existingAdhan = AdhanAlarmScheduler.getStored(appContext)
      .filter { it.type == "adhan" && it.id != MAINTENANCE_ALARM_ID }
    val expectedById = expectedPayloads.associateBy { it.id }
    val existingById = existingAdhan.associateBy { it.id }

    var cancelledCount = 0
    var scheduledCount = 0

    for (existing in existingAdhan) {
      val expected = expectedById[existing.id]
      val shouldCancel = expected == null ||
        kotlin.math.abs(existing.triggerAtMs - expected.triggerAtMs) > 5_000L ||
        existing.title != expected.title ||
        existing.body != expected.body ||
        existing.channelId != expected.channelId
      if (shouldCancel) {
        AdhanAlarmScheduler.cancel(appContext, existing.id)
        cancelledCount += 1
      }
    }

    for (expected in expectedPayloads) {
      val existing = existingById[expected.id]
      val needsSchedule = existing == null ||
        kotlin.math.abs(existing.triggerAtMs - expected.triggerAtMs) > 5_000L ||
        existing.title != expected.title ||
        existing.body != expected.body ||
        existing.channelId != expected.channelId
      if (needsSchedule) {
        AdhanAlarmScheduler.schedule(appContext, expected)
        scheduledCount += 1
      }
    }

    val nextAlarmAtMs = expectedPayloads.minByOrNull { it.triggerAtMs }?.triggerAtMs
    Log.i(
      TAG,
      "ensureScheduled reason=$reason scheduled=$scheduledCount cancelled=$cancelledCount expected=${expectedPayloads.size}",
    )

    return AdhanScheduleResult(
      reason = reason,
      scheduledCount = scheduledCount,
      cancelledCount = cancelledCount,
      expectedCount = expectedPayloads.size,
      nextAlarmAtMs = nextAlarmAtMs,
    )
  }

  fun enqueuePeriodicMaintenance(context: Context) {
    val request = PeriodicWorkRequestBuilder<AdhanMaintenanceWorker>(12, TimeUnit.HOURS)
      .build()
    WorkManager.getInstance(context.applicationContext).enqueueUniquePeriodicWork(
      PERIODIC_WORK_NAME,
      ExistingPeriodicWorkPolicy.KEEP,
      request,
    )
  }

  fun scheduleDailyMaintenanceAlarm(context: Context) {
    val appContext = context.applicationContext
    val config = AdhanConfigStore.get(appContext).load() ?: return
    val zoneId = try {
      ZoneId.of(config.timezoneId)
    } catch (_: Exception) {
      ZoneId.systemDefault()
    }

    val now = ZonedDateTime.now(zoneId)
    var target = now.with(LocalTime.of(MAINTENANCE_HOUR, MAINTENANCE_MINUTE))
    if (!target.isAfter(now)) {
      target = target.plusDays(1)
    }

    val triggerAtMs = target.toInstant().toEpochMilli()
    val payload = AdhanAlarmPayload(
      id = MAINTENANCE_ALARM_ID,
      triggerAtMs = triggerAtMs,
      title = "Adhan maintenance",
      body = "Daily adhan maintenance",
      channelId = AdhanNotificationChannels.PRAYER_SILENT,
      scheduleMode = if (AdhanAlarmScheduler.canScheduleExactAlarms(appContext)) "exact" else "fallback_inexact",
      type = "maintenance",
      prayer = null,
      expectedFireAtMs = triggerAtMs,
      dayKey = PrayerTimeEngine.formatDayKey(target.toLocalDate()),
      isJummah = false,
      voice = null,
    )

    val existing = AdhanAlarmScheduler.getStored(appContext).firstOrNull { it.id == MAINTENANCE_ALARM_ID }
    if (existing != null && kotlin.math.abs(existing.triggerAtMs - triggerAtMs) <= 60_000L) {
      return
    }

    if (existing != null) {
      AdhanAlarmScheduler.cancel(appContext, MAINTENANCE_ALARM_ID)
    }
    AdhanAlarmScheduler.schedule(appContext, payload)
  }

  fun handleMaintenanceAlarm(context: Context) {
    ensureScheduled(context, "daily-maintenance")
    scheduleDailyMaintenanceAlarm(context)
  }

  private fun buildPayload(
    config: AdhanConfig,
    prayer: PrayerTimeEngine.ScheduledPrayer,
    scheduleMode: String,
  ): AdhanAlarmPayload {
    val prayerName = config.prayerKeyToString(prayer.prayerKey)
    val id = if (prayer.isJummah) {
      "adhan-jummah-${prayer.dayKey}"
    } else {
      "adhan-$prayerName-${prayer.dayKey}"
    }

    return AdhanAlarmPayload(
      id = id,
      triggerAtMs = prayer.triggerAtMs,
      title = config.titleFor(prayer.prayerKey, prayer.isJummah),
      body = config.bodyFor(prayer.prayerKey, prayer.isJummah),
      channelId = config.channelIdFor(prayer.prayerKey),
      scheduleMode = scheduleMode,
      type = "adhan",
      prayer = prayerName,
      expectedFireAtMs = prayer.triggerAtMs,
      dayKey = prayer.dayKey,
      isJummah = prayer.isJummah,
      voice = config.voice,
    )
  }
}
