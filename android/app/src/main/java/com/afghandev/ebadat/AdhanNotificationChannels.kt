package com.afghandev.ebadat

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationManagerCompat

object AdhanNotificationChannels {
  const val ADHAN_FAJR = AdhanConfig.DEFAULT_FAJR_CHANNEL
  const val ADHAN_REGULAR = AdhanConfig.DEFAULT_REGULAR_CHANNEL
  const val PRAYER_SILENT = "prayer-silent-v2"
  const val PRAYER_REMINDER = "prayer-reminder-v2"
  const val CALENDAR_QAMARI = "calendar-qamari"
  const val JUMMAH_REMINDER = "jummah-reminder-v2"

  private const val ADHAN_SOUND_RESOURCE = "barakatullah_salim_18sec"
  private var ensured = false

  fun ensureCreated(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      ensured = true
      return
    }

    val notificationManager =
      context.getSystemService(NotificationManager::class.java) ?: return

    val adhanSoundUri = Uri.parse("android.resource://${context.packageName}/raw/$ADHAN_SOUND_RESOURCE")
    val adhanAudioAttributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    createChannelIfMissing(
      notificationManager,
      ADHAN_FAJR,
      "اذان صبح",
      NotificationManager.IMPORTANCE_HIGH,
      adhanSoundUri,
      adhanAudioAttributes,
      longArrayOf(0, 250, 250, 250),
      "#1a4d3e",
    )

    createChannelIfMissing(
      notificationManager,
      ADHAN_REGULAR,
      "اذان (سایر نمازها)",
      NotificationManager.IMPORTANCE_HIGH,
      adhanSoundUri,
      adhanAudioAttributes,
      longArrayOf(0, 250, 250, 250),
      "#1a4d3e",
    )

    createChannelIfMissing(
      notificationManager,
      PRAYER_SILENT,
      "یادآوری نماز (بی‌صدا)",
      NotificationManager.IMPORTANCE_DEFAULT,
      null,
      null,
      longArrayOf(0, 100),
      "#1a4d3e",
    )

    createChannelIfMissing(
      notificationManager,
      PRAYER_REMINDER,
      "یادآوری قبل از نماز",
      NotificationManager.IMPORTANCE_LOW,
      null,
      null,
      longArrayOf(0, 50),
      "#D4AF37",
    )

    createChannelIfMissing(
      notificationManager,
      CALENDAR_QAMARI,
      "مناسبت‌های قمری",
      NotificationManager.IMPORTANCE_DEFAULT,
      null,
      null,
      longArrayOf(0, 100),
      null,
    )

    createChannelIfMissing(
      notificationManager,
      JUMMAH_REMINDER,
      "یادآوری نماز جمعه",
      NotificationManager.IMPORTANCE_HIGH,
      null,
      null,
      longArrayOf(0, 180, 120, 180),
      "#1a4d3e",
    )

    ensured = true
  }

  fun areNotificationsEnabled(context: Context): Boolean {
    return NotificationManagerCompat.from(context).areNotificationsEnabled()
  }

  private fun createChannelIfMissing(
    notificationManager: NotificationManager,
    channelId: String,
    name: String,
    importance: Int,
    soundUri: Uri?,
    audioAttributes: AudioAttributes?,
    vibrationPattern: LongArray,
    lightColor: String?,
  ) {
    if (notificationManager.getNotificationChannel(channelId) != null) {
      return
    }

    val channel = NotificationChannel(channelId, name, importance).apply {
      enableVibration(true)
      this.vibrationPattern = vibrationPattern
      enableLights(lightColor != null)
      if (lightColor != null) {
        this.lightColor = android.graphics.Color.parseColor(lightColor)
      }
      if (soundUri != null) {
        setSound(soundUri, audioAttributes)
      } else {
        setSound(null, null)
      }
      setShowBadge(channelId != PRAYER_REMINDER)
    }
    notificationManager.createNotificationChannel(channel)
  }
}
