# iOS Adhan Verification Checklist

Manual device tests for the iOS azan notification architecture. Run on a physical iPhone (iOS 16+) with a Release build when validating sound and Focus behavior.

## Prerequisites

- City selected and notification permission granted
- Ahadith daily notifications enabled (default)
- Optional: calendar Qamari notifications enabled

## 1. Pending notification budget

1. Open the app and let scheduling complete.
2. In Xcode debugger or a dev helper, call `Notifications.getAllScheduledNotificationsAsync()` and count results.
3. **Expected:** total pending ≤ 60 (azan ~40 + ahadith ~14 + calendar ≤ 6).

## 2. CAF sound (background / killed)

1. Schedule a system adhan test from Adhan settings, or wait for the next prayer.
2. Background the app (do not force-quit).
3. **Expected:** custom azan CAF plays (~18s), not the default tri-tone.

Repeat with app force-quit before fire time:

4. **Expected:** notification still fires with CAF sound (iOS persists scheduled locals).

## 3. Time-Sensitive / Focus breakthrough

1. Enable Sleep Focus or Do Not Disturb.
2. Trigger adhan test notification.
3. **Expected:** azan notification appears and plays sound (unless user disabled Time Sensitive for عبادت in Settings).

## 4. Foreground — no double audio

1. Keep app in foreground.
2. Trigger adhan test.
3. **Expected:** single azan playback via expo-av; no overlapping system notification sound.

## 5. Reboot survival

1. Confirm pending adhan notifications exist.
2. Reboot device.
3. **Expected:** pending count unchanged; next prayer still fires on time.

## 6. Activation window top-up

1. Note pending adhan count.
2. Change device date forward 2 days (Settings → General → Date & Time), then open app.
3. **Expected:** schedule refresh runs; rolling 8-day window repopulated.

## 7. Timezone change

1. Change device timezone (e.g. Kabul → London).
2. Bring app to foreground.
3. **Expected:** reschedule triggered (`ios-timezone-changed`); prayer times match new zone after city-based calculation.

## 8. Permission onboarding

1. Fresh install (or reset notification permission).
2. Complete first-open city selection.
3. **Expected:** notification explanation step appears on iOS before system prompt; push registration does not show a second prompt.

## 9. Health banner

1. Deny notification permission in iOS Settings.
2. Open prayer tab.
3. **Expected:** `AdhanHealthBanner` shows with link to Settings.

## 10. Background task (debug)

```bash
# In dev client only:
import * as BackgroundTask from 'expo-background-task';
await BackgroundTask.triggerTaskWorkerForTestingAsync();
```

**Expected:** schedule sync runs or pending flag stored for next foreground open.
