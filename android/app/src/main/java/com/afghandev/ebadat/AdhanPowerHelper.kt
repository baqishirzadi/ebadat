package com.afghandev.ebadat

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings

object AdhanPowerHelper {
  fun isIgnoringBatteryOptimizations(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
    val powerManager = context.getSystemService(PowerManager::class.java) ?: return true
    return powerManager.isIgnoringBatteryOptimizations(context.packageName)
  }

  fun openBatteryOptimizationSettings(context: Context): Boolean {
    return try {
      val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
      true
    } catch (_: Exception) {
      try {
        val fallback = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.parse("package:${context.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(fallback)
        true
      } catch (_: Exception) {
        false
      }
    }
  }

  fun openOemAutostartSettings(context: Context): Boolean {
    val manufacturer = Build.MANUFACTURER.orEmpty().lowercase()
    val intents = mutableListOf<Intent>()

    when {
      manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco") -> {
        intents.add(Intent().setComponent(android.content.ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")))
      }
      manufacturer.contains("huawei") || manufacturer.contains("honor") -> {
        intents.add(Intent().setComponent(android.content.ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity")))
      }
      manufacturer.contains("oppo") -> {
        intents.add(Intent().setComponent(android.content.ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")))
      }
      manufacturer.contains("vivo") -> {
        intents.add(Intent().setComponent(android.content.ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity")))
      }
      manufacturer.contains("samsung") -> {
        intents.add(Intent().setComponent(android.content.ComponentName("com.samsung.android.lool", "com.samsung.android.sm.battery.ui.BatteryActivity")))
      }
      manufacturer.contains("tecno") || manufacturer.contains("infinix") || manufacturer.contains("itel") -> {
        intents.add(Intent().setComponent(android.content.ComponentName("com.transsion.phonemanager", "com.cyin.himgr.autostart.AutoStartActivity")))
      }
    }

    for (intent in intents) {
      try {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        return true
      } catch (_: Exception) {
        // Try next OEM intent.
      }
    }

    return openBatteryOptimizationSettings(context)
  }

  fun isAggressiveOem(manufacturer: String): Boolean {
    val normalized = manufacturer.lowercase()
    return listOf("xiaomi", "redmi", "poco", "huawei", "honor", "oppo", "vivo", "oneplus", "meizu", "tecno", "infinix", "itel")
      .any { normalized.contains(it) }
  }
}
