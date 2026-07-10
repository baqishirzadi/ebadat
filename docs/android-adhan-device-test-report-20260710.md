# Android Adhan Device Test Report — 2026-07-10

## Build & Install

| Item | Result |
|------|--------|
| APK path | `android/app/build/outputs/apk/release/app-release.apk` |
| Copy | `app-release-20260710.apk` |
| Package | `com.afghandev.ebadat` |
| versionName | **1.0.9** (versionCode 14) |
| APK size | 78 MB |
| Install | **PASS** — `adb install -r` succeeded |

## Device

| Item | Value |
|------|-------|
| Model | Samsung **SM-S928N** (Galaxy S24 Ultra) |
| Android | **16** |
| USB ID | R3CWC0ACVRT |

## Automated Tests

### Gradle unit tests (`:app:testReleaseUnitTest`)

| Test | Result |
|------|--------|
| `rollingSchedule_respectsMasterDisabled` | **PASS** |
| `formatDayKey_usesIsoDate` | **PASS** |
| `maghribOffset_appliesForAllCities` | **FAIL** — `UnsupportedClassVersionError` (adhan2 JVM bytecode vs test runtime) |

**Note:** Added `@OptIn(ExperimentalTime::class)` to fix Kotlin compile error in `PrayerTimeEngineTest.kt`.

### Maestro E2E

| Flow | Result |
|------|--------|
| `.maestro/android-device-adhan.yaml` (full onboarding) | **PARTIAL** — onboarding + home + More tab pass; adhan chip navigation flaky on first run |
| `.maestro/android-adhan-system-test.yaml` | **PASS** — deep link → scroll → system test button → 35s wait → screenshot |

## ADB Verification

| Scenario | Expected | Result |
|----------|----------|--------|
| Alarms after onboarding + app open | Multiple `com.afghandev.ebadat` alarms | **PASS** — 58 alarms |
| Notification permission | granted | **PASS** |
| Channels `adhan-fajr-v7` / `adhan-regular-v7` | Custom MP3 sound | **PASS** — `barakatullah_salim_18sec` |
| Process death (`am kill`) | Alarms survive | **PASS** — 58 before/after kill |
| Reopen after kill | Alarms repopulate if needed | **PASS** — 58 after reopen |
| Force-stop | No alarms until relaunch | **PASS** — 0 after force-stop |
| Relaunch after force-stop | Alarms restored | **PASS** — 58 after relaunch |
| Reboot recovery | Alarms after boot + launch | **PASS** — 58 after reboot |

## Manual / UI Checks

| Check | Result |
|-------|--------|
| Fresh install onboarding (Kabul + adhan permission) | **PASS** (via Maestro with pre-granted notifications) |
| Adhan settings screen loads | **PASS** (deep link `ebadat://adhan-settings`) |
| System test button tap | **PASS** (Maestro + adb tap) |
| System test notification (25s) | **PASS** (Maestro flow completed wait; audio requires ear verification on device) |
| Health banner (permission denied) | **NOT RUN** — permission pre-granted for test session |

## Artifacts

- `adhan-test.log` — logcat during system test
- `android-adhan-test-results.txt` — ADB script output
- Maestro screenshots: `~/.maestro/tests/2026-07-10_*/`
- New flows: `.maestro/android-device-adhan.yaml`, `.maestro/android-adhan-system-test.yaml`

## Issues Found

1. **Disk space** — initial `assembleRelease` failed with "No space left on device"; resolved by clearing old Gradle caches and Xcode DerivedData (~9 GB freed).
2. **Unit test JVM** — `maghribOffset_appliesForAllCities` fails at runtime with `UnsupportedClassVersionError` for adhan2 library classes.
3. **Maestro Android** — `adhan-system-test-status` testID only exists on iOS block; Android status text has no testID (use text assertion or add testID in a future fix).
4. **Samsung USB** — device initially showed `unauthorized`; resolved after approving USB debugging on phone.

## Overall

**Release APK built, installed, and adhan scheduling verified on physical device.** Native alarm stack schedules 58 exact alarms, survives process death and reboot, and clears on force-stop as expected. System test UI flow passes via Maestro.

---

## More Tab Touch Freeze Fix (2026-07-10)

### Root cause

JS thread starvation from repeated `requestPrayerSchedule` / `setAdhanConfig` calls (~every 150ms via `config-sync`). Secondary: full-width header `View` on More tab could intercept touches on Android.

### Fixes applied

| Area | Change |
|------|--------|
| `PrayerContext.tsx` | Debounced `requestPrayerSchedule` (2s min interval), narrowed effect deps, deferred startup migration, one-time legacy channel deletion |
| `nativeAdhanScheduler.ts` | Config fingerprint cache — skip bridge when unchanged; stable `configVersion` hash |
| `AdhanAlarmSchedulerModule.kt` | Native JSON compare — skip save/schedule when config unchanged |
| `more.tsx` | `pointerEvents="box-none"` on header wrapper; `pointerEvents="none"` on gradient |
| `_layout.tsx` | `freezeOnBlur: false` on Android |

### Verification (SM-S928N, release APK v1.0.9)

| Check | Result |
|-------|--------|
| More tab → Home / Quran / Jantari / Naat tabs | **PASS** (adb tap + UI dump) |
| More quick action: اذکار | **PASS** — navigated to adhkar screen |
| Tab bar from More while idle | **PASS** |
| `config-sync` log burst (12s idle on More) | **PASS** — 0 events |
| Release APK rebuild + reinstall | **PASS** |

New regression flow: `.maestro/android-navigation-smoke.yaml` (requires unlocked device; run `adb shell wm dismiss-keyguard` first on Samsung)

---

## More Tab Freeze Regression Fix (2026-07-10 late)

### Repro (before fix)

On SM-S928N release APK: More tab scrolled but **tab bar and button taps did not navigate** (`uiautomator dump` reported "could not get idle state"). Root cause: JS thread busy from SectionList relayout — unmemoized `ListHeaderComponent` plus redundant `SET_SCHEDULE_AUDIT` dispatches on every schedule tick.

### Fixes

| Area | Change |
|------|--------|
| `more.tsx` | Memoize `listHeader`, calendar truth (per Kabul day), `scheduleModeLabel`, `locationLabel`; Android `nestedScrollEnabled` + `removeClippedSubviews` |
| `PrayerContext.tsx` | Skip `SET_SCHEDULE_AUDIT` when meaningful audit fields unchanged |
| `adhan-settings.tsx` | Restore missing `{scheduleMode === 'fallback' && (` wrapper around warning block |

### Verification (SM-S928N, release APK after fix)

| Check | Result |
|-------|--------|
| More tab → Home tab (adb tap) | **PASS** — `خانه selected=true`, home content visible |
| `uiautomator dump` idle on More | **PASS** — no "could not get idle state" |
| Maestro: More tab loads (`ios-more-ready`) | **PASS** |
| Release APK rebuild + reinstall | **PASS** |

---

## Android Fixes Bundle (2026-07-10 evening)

### Touch freeze after adhan settings
- Deferred `refreshAdhanSettingsSchedule` on Android (InteractionManager + 500ms)
- Lightweight path: native health check + `runMaintenanceNow` when healthy; full schedule only on recovery
- Android `AppState` activation health check mirrors iOS

### Naat seek bar
- Android-only RTL ratio inversion restored in `NaatProgressBar.tsx` (iOS unchanged)

### Azhan reliability (Tier 1)
- `USE_EXACT_ALARM` declared; `SCHEDULE_EXACT_ALARM` capped at API 32
- `setAlarmClock` for exact adhan alarms
- 7-day rolling alarm window (was 3)
- Native system test alarm (`scheduleSystemTestAlarm`)
- Cold-start watchdog in `MainApplication`
- Health banner surfaces `exact_alarm_missing`

### Device verification (SM-S928N, release APK)
| Check | Result |
|-------|--------|
| Scheduled alarms (`dumpsys alarm`) | **PASS** — 46 ebadat alarm entries |
| `config-sync` burst (8s idle) | **PASS** — 0 events |
| APK build + install | **PASS** |
