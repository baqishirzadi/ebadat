# Play Permissions Justification (Release Gate)

This document maps each sensitive Android permission to an in-app feature and Play Console declaration text.

## Active Sensitive Permissions

| Permission | Why Needed | User Impact | Runtime Usage |
| --- | --- | --- | --- |
| `android.permission.POST_NOTIFICATIONS` | Deliver prayer reminders and adhan alerts at scheduled times. | Users can receive on-time prayer notifications. | Requested during onboarding; app handles denied/blocked states with health banner. |
| `android.permission.USE_EXACT_ALARM` (API 33+) | Core app function is prayer-time alarms; azan must fire at exact religious times without a manual settings trip. | Users receive accurate adhan alerts when the app is closed. | Auto-granted for alarm-class apps; used by native `AdhanScheduleManager` via `setExactAndAllowWhileIdle`. |
| `android.permission.SCHEDULE_EXACT_ALARM` (API 31–32 only, `maxSdkVersion=32`) | Exact prayer alarms on Android 12 where `USE_EXACT_ALARM` is unavailable. | Same as above on Android 12. | Auto-granted on API 31–32; native scheduler uses exact alarms. |
| `android.permission.RECEIVE_BOOT_COMPLETED` | Recompute and restore prayer alarms after device reboot. | Users do not lose reminders after restart. | `AdhanBootReceiver` calls native `AdhanScheduleManager.ensureScheduled`. |
| `android.permission.ACCESS_FINE_LOCATION` | Auto-detect city for correct prayer-time and qibla calculation. | Users get local times without manual city selection. | Location used for city resolution; manual city override remains supported. |
| `android.permission.ACCESS_COARSE_LOCATION` | Fallback/low-precision location for city inference when fine location is unavailable. | Improves first-run city selection reliability. | Same city inference path with lower precision. |
| `android.permission.WAKE_LOCK` | Ensure notification delivery and short playback windows are not interrupted by sleep states. | Improves reliability of prayer reminder delivery. | Used by notification/audio lifecycle during alert windows. |
| `android.permission.FOREGROUND_SERVICE` | Maintain stable playback when Quran/adhan audio is active. | Prevents abrupt playback interruption. | Audio playback service behavior on Android. |
| `android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK` | Required subtype for media playback foreground service. | Same as above, explicit media scope. | Applied when media playback is active. |

## Not Declared (by design)

| Permission | Reason |
| --- | --- |
| `android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Avoid Play policy friction; battery guidance uses `ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS` without holding this permission. |

## Play Console Declaration Notes

Use the following concise rationale:

1. **Exact alarms are the core function of this app** — it is a Namaz/Quran application whose primary purpose is delivering azan (adhan) at fixed religious prayer times. This qualifies for `USE_EXACT_ALARM` under Google Play's alarm and clock app policy.
2. Notifications are enabled by default and configurable per prayer; users grant `POST_NOTIFICATIONS` during onboarding.
3. Location is used for local prayer times and qibla; users can choose city manually if they deny location.
4. Boot receive is required so the native prayer engine can recompute and restore schedules after reboot, timezone change, or app update.

## Verification Checklist Before Upload

1. Manifest and `app.json` permission list match this document.
2. `USE_EXACT_ALARM` is declared; `SCHEDULE_EXACT_ALARM` has `maxSdkVersion="32"`.
3. Prayer onboarding explains notification usage in user language (Dari/Pashto).
4. Store listing privacy section reflects location + notification usage accurately.
5. Play Console "Alarm & clock" / exact alarm declaration references azan as core functionality.
