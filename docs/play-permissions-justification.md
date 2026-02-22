# Play Permissions Justification (Release Gate)

This document maps each sensitive Android permission to an in-app feature and Play Console declaration text.

## Active Sensitive Permissions

| Permission | Why Needed | User Impact | Runtime Usage |
| --- | --- | --- | --- |
| `android.permission.POST_NOTIFICATIONS` | Deliver prayer reminders and adhan alerts at scheduled times. | Users can receive on-time prayer notifications. | Requested on first notification flow; app handles denied/blocked states. |
| `android.permission.SCHEDULE_EXACT_ALARM` | Keep prayer alerts precise to minute-level times (especially adhan and Jummah timing). | Users receive accurate prayer alerts instead of delayed inexact alarms. | Used by notification scheduling in `PrayerContext` with timestamped triggers. |
| `android.permission.RECEIVE_BOOT_COMPLETED` | Restore prayer notification schedule after device reboot. | Users do not lose reminders after restart. | Scheduling refresh runs after app/service lifecycle startup. |
| `android.permission.ACCESS_FINE_LOCATION` | Auto-detect city for correct prayer-time and qibla calculation. | Users get local times without manual city selection. | Location used for city resolution; manual city override remains supported. |
| `android.permission.ACCESS_COARSE_LOCATION` | Fallback/low-precision location for city inference when fine location is unavailable. | Improves first-run city selection reliability. | Same city inference path with lower precision. |
| `android.permission.WAKE_LOCK` | Ensure notification delivery and short playback windows are not interrupted by sleep states. | Improves reliability of prayer reminder delivery. | Used by notification/audio lifecycle during alert windows. |
| `android.permission.FOREGROUND_SERVICE` | Maintain stable playback when Quran/adhan audio is active. | Prevents abrupt playback interruption. | Audio playback service behavior on Android. |
| `android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK` | Required subtype for media playback foreground service. | Same as above, explicit media scope. | Applied when media playback is active. |

## Explicitly Removed

| Permission | Reason Removed |
| --- | --- |
| `android.permission.USE_EXACT_ALARM` | Restricted policy risk. `SCHEDULE_EXACT_ALARM` is retained as the exact-alarm path. |

## Play Console Declaration Notes

Use the following concise rationale:

1. Exact alarms are core to prayer reminders that must trigger at fixed religious times.
2. Notifications are user-opt-in and configurable per prayer (sound/silent).
3. Location is used for local prayer times and qibla; users can choose city manually if they deny location.
4. Boot receive is required to restore schedules after reboot and avoid missed prayers.

## Verification Checklist Before Upload

1. Manifest and `app.json` permission list match this document.
2. No `USE_EXACT_ALARM` in source.
3. Prayer tab explains notification/location usage in user language.
4. Store listing privacy section reflects location + notification usage accurately.
