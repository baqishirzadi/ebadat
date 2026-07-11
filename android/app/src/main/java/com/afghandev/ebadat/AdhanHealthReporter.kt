package com.afghandev.ebadat

import android.content.Context
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

data class AdhanScheduleResult(
  val reason: String,
  val scheduledCount: Int,
  val cancelledCount: Int,
  val expectedCount: Int,
  val nextAlarmAtMs: Long?,
) {
  fun toWritableMap(): WritableMap {
    val map = Arguments.createMap()
    map.putString("reason", reason)
    map.putInt("scheduledCount", scheduledCount)
    map.putInt("cancelledCount", cancelledCount)
    map.putInt("expectedCount", expectedCount)
    if (nextAlarmAtMs != null) {
      map.putDouble("nextAlarmAtMs", nextAlarmAtMs.toDouble())
    } else {
      map.putNull("nextAlarmAtMs")
    }
    return map
  }
}

data class AdhanHealth(
  val notificationsEnabled: Boolean,
  val canScheduleExactAlarms: Boolean,
  val scheduledAlarmCount: Int,
  val nextAlarmAtMs: Long?,
  val configPresent: Boolean,
  val masterEnabled: Boolean,
  val isIgnoringBatteryOptimizations: Boolean,
  val manufacturer: String,
  val issues: List<String>,
  val lastMaintenanceFiredAtMs: Long?,
) {
  fun toWritableMap(): WritableMap {
    val map = Arguments.createMap()
    map.putBoolean("notificationsEnabled", notificationsEnabled)
    map.putBoolean("canScheduleExactAlarms", canScheduleExactAlarms)
    map.putInt("scheduledAlarmCount", scheduledAlarmCount)
    if (nextAlarmAtMs != null) {
      map.putDouble("nextAlarmAtMs", nextAlarmAtMs.toDouble())
    } else {
      map.putNull("nextAlarmAtMs")
    }
    map.putBoolean("configPresent", configPresent)
    map.putBoolean("masterEnabled", masterEnabled)
    map.putBoolean("isIgnoringBatteryOptimizations", isIgnoringBatteryOptimizations)
    map.putString("manufacturer", manufacturer)
    if (lastMaintenanceFiredAtMs != null) {
      map.putDouble("lastMaintenanceFiredAtMs", lastMaintenanceFiredAtMs.toDouble())
    } else {
      map.putNull("lastMaintenanceFiredAtMs")
    }
    val issuesArray = Arguments.createArray()
    issues.forEach { issuesArray.pushString(it) }
    map.putArray("issues", issuesArray)
    return map
  }
}

object AdhanHealthReporter {
  private const val MAINTENANCE_STALE_MS = 26L * 60L * 60L * 1000L

  fun collect(context: Context): AdhanHealth {
    val appContext = context.applicationContext
    AdhanNotificationChannels.ensureCreated(appContext)

    val config = AdhanConfigStore.get(appContext).load()
    val stored = AdhanAlarmScheduler.getStored(appContext)
    val nowMs = System.currentTimeMillis()
    val futureAlarms = stored.filter { it.triggerAtMs > nowMs && it.type == "adhan" }
    val notificationsEnabled = AdhanNotificationChannels.areNotificationsEnabled(appContext)
    val canScheduleExact = AdhanAlarmScheduler.canScheduleExactAlarms(appContext)
    val batteryOptimized = AdhanPowerHelper.isIgnoringBatteryOptimizations(appContext)
    val manufacturer = Build.MANUFACTURER.orEmpty()
    val lastMaintenanceFiredAtMs = AdhanFiredLogStore.get(appContext).getLastMaintenanceFiredAtMs()

    val issues = mutableListOf<String>()
    if (!notificationsEnabled) {
      issues.add("notification_denied")
    }
    if (!canScheduleExact) {
      issues.add("exact_alarm_missing")
    }
    if (config == null) {
      issues.add("config_missing")
    } else if (!config.masterEnabled) {
      issues.add("master_disabled")
    }
    if (config != null && config.masterEnabled && notificationsEnabled && futureAlarms.isEmpty()) {
      issues.add("no_alarms_scheduled")
    }
    if (
      config != null &&
      config.masterEnabled &&
      notificationsEnabled &&
      lastMaintenanceFiredAtMs != null &&
      nowMs - lastMaintenanceFiredAtMs > MAINTENANCE_STALE_MS
    ) {
      issues.add("alarms_not_firing")
    }
    if (!batteryOptimized && AdhanPowerHelper.isAggressiveOem(manufacturer)) {
      issues.add("battery_optimization_active")
    }

    val channelHealth = AdhanNotificationChannels.collectChannelHealth(appContext)
    if (!channelHealth.fajrHealthy || !channelHealth.regularHealthy) {
      issues.add("channel_unhealthy")
    }

    return AdhanHealth(
      notificationsEnabled = notificationsEnabled,
      canScheduleExactAlarms = canScheduleExact,
      scheduledAlarmCount = futureAlarms.size,
      nextAlarmAtMs = futureAlarms.minByOrNull { it.triggerAtMs }?.triggerAtMs,
      configPresent = config != null,
      masterEnabled = config?.masterEnabled ?: false,
      isIgnoringBatteryOptimizations = batteryOptimized,
      manufacturer = manufacturer,
      issues = issues,
      lastMaintenanceFiredAtMs = lastMaintenanceFiredAtMs,
    )
  }
}
