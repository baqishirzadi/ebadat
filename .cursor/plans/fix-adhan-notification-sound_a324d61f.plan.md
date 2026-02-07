---
name: fix-adhan-notification-sound
overview: Fix Adhan notification scheduling (per-prayer times, no bunching), default preferences (Fajr ON, others OFF), and sound playback so notifications play the correct adhan audio when they fire.
todos:
  - id: default-prefs
    content: "Change DEFAULT_ADHAN_PREFERENCES: Fajr ON, others OFF in adhanManager.ts"
    status: completed
  - id: stable-identifiers
    content: Use stable identifiers (adhan-fajr, adhan-dhuhr, etc.) and cancel only adhan notifications before rescheduling
    status: completed
  - id: sound-format
    content: Fix notification sound format for custom adhan audio; ensure Android channel uses correct sound
    status: completed
  - id: debug-logging
    content: Add debug logging for scheduled prayer keys, times, and cancellation count
    status: completed
  - id: test-dev-build
    content: Test adhan flow in development/production build (not Expo Go)
    status: completed
isProject: false
---

# Fix Adhan Notification & Sound Issues

## Current State Analysis

### What Already Works

- **Scheduling loop** in `[context/PrayerContext.tsx](context/PrayerContext.tsx)` (lines 786–884) uses **distinct** `prayer.time` per prayer (fajr, dhuhr, asr, maghrib, isha), so each notification is scheduled at its own time.
- **Prayer times** come from `getPrayerTimesForDate` in `[utils/prayerTimesAgent.ts](utils/prayerTimesAgent.ts)` and produce valid, distinct `Date` objects per prayer.
- **Audio playback** in `[utils/adhanAudio.ts](utils/adhanAudio.ts)` correctly uses `fajr_adhan.mp3` for Fajr and `barakatullah_salim.mp3` for others.
- **expo-notifications plugin** in `[app.json](app.json)` already registers both sounds:
  ```json
  "sounds": ["./assets/audio/adhan/fajr_adhan.mp3", "./assets/audio/adhan/barakatullah_salim.mp3"]
  ```
- **Android channels** are set up (`adhan-sound`, `prayer-silent`) in PrayerContext.

### Likely Root Causes

1. **"All at once" / wrong time** – Possible causes:
  - Race: `scheduleAdhanNotifications` runs before `state.prayerTimes` is loaded, or `adhanPreferences` changes trigger reschedule with stale dates.
  - Missing `identifier` on scheduled notifications can cause platform quirks; using stable IDs helps.
  - `cancelAllScheduledNotificationsAsync` might interact poorly with rapid reschedules.
2. **No sound** – Possible causes:
  - `sound: 'fajr_adhan.mp3'` as a string may not match expo-notifications’ expected format for plugin-registered sounds.
  - In Expo managed workflow, custom notification sounds often require `sound: true` (default) or a specific path/format.
  - When app is **killed**, `addNotificationReceivedListener` does not run; only the OS notification sound plays. So custom sound must be in the notification payload.
3. **Default preferences** – Current `[utils/adhanManager.ts](utils/adhanManager.ts)` defaults:
  - Fajr: enabled, playSound true (correct)
  - Dhuhr, Asr, Maghrib, Isha: **all enabled**, playSound false  
   Your plan requires: Fajr ON, others OFF by default.

---

## Phase 1: Fix Default Preferences and Scheduling Logic

### 1.1 Change default adhan preferences

**File:** `[utils/adhanManager.ts](utils/adhanManager.ts)`

Update `DEFAULT_ADHAN_PREFERENCES` so that only Fajr is enabled by default:

```typescript
dhuhr: { enabled: false, playSound: false, selectedVoice: 'barakatullah' },
asr: { enabled: false, playSound: false, selectedVoice: 'barakatullah' },
maghrib: { enabled: false, playSound: false, selectedVoice: 'barakatullah' },
isha: { enabled: false, playSound: false, selectedVoice: 'barakatullah' },
```

Keep Fajr as `enabled: true`, `playSound: true`.

### 1.2 Add stable identifiers and cancel by identifier

**File:** `[context/PrayerContext.tsx](context/PrayerContext.tsx)`

- Use stable identifiers for adhan notifications: `adhan-fajr`, `adhan-dhuhr`, etc.
- Before scheduling, cancel **only** adhan notifications (not dua or other types):
  - Call `getAllScheduledNotificationsAsync()`, filter by `identifier.startsWith('adhan-')`, then `cancelScheduledNotificationAsync(id)` for each.
- Pass `identifier: \`adhan-${prayer.key}`when calling`scheduleNotificationAsync`.

This avoids cancelling non-adhan notifications and reduces risk of duplicate or odd behavior.

### 1.3 Schedule at exact prayer time only

- Ensure no `minutesBefore` logic is used for adhan notifications. Current code already schedules at `prayer.time` directly; keep it that way.
- If `scheduleNotifications` (the legacy “minutes before” flow) is still active and could interfere, either disable it when adhan master toggle is on, or keep it clearly separate so it does not overwrite adhan notifications.

---

## Phase 2: Fix Sound Playback

### 2.1 Notification content sound field

**File:** `[context/PrayerContext.tsx](context/PrayerContext.tsx)`

- For **Android**, expo-notifications custom sounds registered via plugin are typically referenced by filename (e.g. `fajr_adhan` or `fajr_adhan.mp3`). Try:
  - `sound: true` (default system sound) first to confirm notifications play any sound.
  - If that works, try custom: `sound: 'fajr_adhan'` (no extension) or `sound: require('../assets/audio/adhan/fajr_adhan.mp3')` if the API supports it.
- Check [expo-notifications docs](https://docs.expo.dev/versions/latest/sdk/notifications/) for the exact `sound` format for local notification scheduling.

### 2.2 Android notification channel

**File:** `[context/PrayerContext.tsx](context/PrayerContext.tsx)`

- In `configureAndroidNotificationChannels`, for `adhan-sound`:
  - Set `sound: 'default'` or the registered custom sound URI/name if supported.
  - Ensure `importance: AndroidImportance.HIGH` (already set) and `enableVibrate: true` if desired.

### 2.3 Fallback: play adhan when notification is received (foreground)

- When `addNotificationReceivedListener` fires (app in foreground), `playAdhan()` is already called for adhan notifications with `playSound: true`. Keep this.
- When app is **backgrounded or killed**, that listener does not run. The only sound is from the notification payload, so Phase 2.1/2.2 are critical.
- **Expo Go limitation:** Custom notification sounds and background behavior are limited in Expo Go. Document that full adhan behavior should be tested in a **development build** or **production APK**.

---

## Phase 3: Cancellation and Reschedule Order

**File:** `[context/PrayerContext.tsx](context/PrayerContext.tsx)`

- Before scheduling new adhan notifications:
  1. Fetch `getAllScheduledNotificationsAsync()`.
  2. For each notification with `identifier.startsWith('adhan-')`, call `cancelScheduledNotificationAsync(identifier)`.
  3. Then schedule new adhan notifications with `identifier: \`adhan-${prayer.key}`.
- Avoid `cancelAllScheduledNotificationsAsync()` if the app has other important notifications (e.g. dua response). Use targeted cancellation instead.

---

## Phase 4: Debug Logging and Validation

**File:** `[context/PrayerContext.tsx](context/PrayerContext.tsx)`

- Add logging in `scheduleAdhanNotifications`:
  - Before scheduling: log each `prayer.key`, `prayer.time.toISOString()`, `prayerSettings.enabled`, `prayerSettings.playSound`.
  - After each `scheduleNotificationAsync`: log `Scheduled adhan-${prayer.key} for ${date}`.
- Optionally add a small validation: assert `fajr < dhuhr < asr < maghrib < isha` (within the same day) before scheduling, and log a warning if order is wrong.
- Log the count of cancelled vs newly scheduled notifications.

---

## Phase 5: Migration for Existing Users

**File:** `[utils/adhanManager.ts](utils/adhanManager.ts)`

- In `migratePreferences`, when loading old stored preferences:
  - If stored prefs have dhuhr/asr/maghrib/isha `enabled: true` but no explicit migration flag, you can either:
    - Leave them as-is (respect user choice), or
    - Apply a one-time migration to set others to `enabled: false` for users who have never changed adhan settings (e.g. via a `migratedDefaults` flag).
- Prefer minimal migration: only adjust defaults for **new** users; existing users keep their saved choices unless you explicitly decide otherwise.

---

## File Summary


| File                                                     | Changes                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| `[utils/adhanManager.ts](utils/adhanManager.ts)`         | Default: Fajr ON, others OFF; optional migration              |
| `[context/PrayerContext.tsx](context/PrayerContext.tsx)` | Stable identifiers, targeted cancel, sound format, debug logs |
| `[app.json](app.json)`                                   | No change if sounds are already registered correctly          |


---

## Testing Checklist (Development / Production Build)

- Fajr notification scheduled at exact Fajr time; uses Fajr adhan.
- Dhuhr/Asr/Maghrib/Isha not scheduled when disabled; each scheduled at correct time when enabled.
- One notification per prayer, no duplicates.
- Sound plays when notification fires (test with app killed; use dev/production build, not Expo Go).
- Old adhan notifications cancelled before reschedule; dua/other notifications unaffected.
- Logs show correct prayer keys and times.

---

## Expo Go Limitation

Expo Go does not fully support custom notification sounds and background notification handling. For reliable adhan testing, use:

```bash
npx expo run:android   # Development build
# or
eas build --platform android --profile preview  # APK for device
```

