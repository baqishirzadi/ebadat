package com.afghandev.ebadat

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import kotlin.math.abs

class AdhanAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val payload = AdhanAlarmPayload.fromIntent(intent) ?: return
    val nowMs = System.currentTimeMillis()
    val delaySeconds = ((nowMs - payload.expectedFireAtMs) / 1000L).coerceAtLeast(0L)

    val launchIntent = context.packageManager
      .getLaunchIntentForPackage(context.packageName)
      ?.apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        putExtra("notificationType", payload.type)
        putExtra("prayer", payload.prayer)
        putExtra("id", payload.id)
      }

    val contentIntent = launchIntent?.let {
      PendingIntent.getActivity(
        context,
        requestCodeForId("open-${payload.id}"),
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }

    val builder = NotificationCompat.Builder(context, payload.channelId)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(payload.title)
      .setContentText(payload.body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(payload.body))
      .setAutoCancel(true)
      .setWhen(nowMs)
      .setShowWhen(true)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setPriority(
        if (payload.type == "adhan") {
          NotificationCompat.PRIORITY_MAX
        } else {
          NotificationCompat.PRIORITY_DEFAULT
        }
      )

    if (payload.type == "adhan") {
      builder.setCategory(NotificationCompat.CATEGORY_ALARM)
    }

    contentIntent?.let { builder.setContentIntent(it) }

    val notificationManager = NotificationManagerCompat.from(context)
    val notificationId = requestCodeForId(payload.id)

    try {
      notificationManager.notify(notificationId, builder.build())
      Log.i(
        "AdhanDelay",
        "id=${payload.id} prayer=${payload.prayer} delaySeconds=$delaySeconds expected=${payload.expectedFireAtMs} actual=$nowMs"
      )
    } catch (error: SecurityException) {
      Log.e("AdhanAlarmReceiver", "Notification post denied", error)
    }

    AdhanAlarmScheduler.cancel(context, payload.id)
  }

  private fun requestCodeForId(value: String): Int {
    val hash = value.hashCode()
    if (hash == Int.MIN_VALUE) return 0
    return abs(hash)
  }
}
