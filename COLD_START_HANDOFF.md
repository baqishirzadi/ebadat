# Ebadat Android cold-start handoff (Galaxy A04e)

## Goal

Make `com.afghandev.ebadat` reliably interactive in under 3–5 seconds on low-end Android while foregrounded. Do not claim a result from the S24 Ultra alone.

## Strict scope

- Do **not** touch ahadith expansion/data work: `data/ahadith/**`, `types/hadith.ts`, `utils/ahadith*`, `components/ahadith*`, `app/ahadith*`, ahadith scripts, or the `20260722` migration.
- Do **not** restore the reverted experiments: splash-timeout plugin/MainActivity hide timeout, provider deferral changes, notification-prompt skipping, Quran/city asset rewrites, onboarding remount races, or OEM-throttle speculation.
- Preserve the existing startup behavior except for work proven to block time-to-interactive.

## Device evidence already captured

Target: Samsung Galaxy A04e (`SM-A042F`), Android 13 / API 33, arm64, Ebadat 1.0.14 (versionCode 22).

### Reproduced failing build (before the current local patch)

- `adb shell am start -S -W -n com.afghandev.ebadat/.MainActivity` reported Android first draw in **2.385 s**.
- Native process started at `T+0`; Hermes entered the JS bundle at roughly `T+1.676 s` from Android launch.
- JS reached `AppProviders mount unlocked` and native splash handoff at **425 ms after JS root epoch**; it never logged `Interactive ready`.
- More than 35 seconds later, the visible UI was still the greeting splash (not a permission dialog or blank native splash).
- `top -H` showed `mqt_v_js` at **92–100% CPU** with CPU time rising from **1:19** to **3:07**; native/render threads were idle. This rules out OEM background throttling, a permission pause, and a blocked AsyncStorage promise as the immediate cause.

## Root cause

`app/_layout.tsx` ran an optional calendar cache warm-up as a root startup effect, before the app became interactive:

```ts
getCalendarTruth(...)
getCalendarMonthGridMeta('qamari', ...)
getCalendarMonthGridMeta('shamsi', ...)
getCalendarMonthGridMeta('gregorian', ...)
warmCalendarEventsCache(...)
```

That calls expensive date conversion code repeatedly. In particular, `shamsiToGregorian()` scans up to 801 dates and calls a conversion that constructs `Intl.DateTimeFormat` objects per iteration; the Hijri conversion also performs search-based resolution. Warming several calendar grids plus two years of events therefore monopolizes Hermes on the A04e and prevents the splash timer and interaction callbacks from running.

## Local changes already present (do not revert)

1. `app/_layout.tsx`
   - Removed only the root calendar cache warm-up effect and its now-unused calendar imports.
   - Added a `Root navigation committed` JS timestamp.
   - Calendar behavior remains available on demand when its screen is opened.

2. `android/app/src/main/java/com/afghandev/ebadat/StartupTrace.kt`
   - Added compact monotonic native timestamps under the `EbadatStartup` log tag.

3. `MainApplication.kt` and `MainActivity.kt`
   - Added timestamps for application/activity lifecycle and RN bridge/bundle markers.

The locally signed release built successfully. A fresh install on the same A04e no longer pegs `mqt_v_js`: it was idle at 0% after launch with only 0.78 seconds accumulated CPU, and it reached the normal onboarding/notification UI. This is strong confirmation that the root prewarm was the freeze trigger, but the post-onboarding cold-start test must still be completed.

## What Cursor should do next

1. **Finish functional validation on the A04e**
   - Complete fresh onboarding: welcome → language → city → notifications → exact alarms/battery as applicable.
   - Force-stop and launch the app with the device foregrounded.
   - Capture `EbadatStartup` and `ReactNativeJS` logs. Confirm `Root navigation committed`, `Interactive ready`, native splash hide, and home UI all occur within 3–5 seconds.
   - Confirm the JS thread is not pinned:
     ```sh
     adb -s <serial> shell top -b -n 1 -H | rg 'mqt_v_js|HeapTaskDaemon|PID'
     ```
   - Capture the home screen and verify it responds to a tap. Then repeat once on the S24 Ultra as a regression baseline.

2. **If the calendar screen itself is now slow**
   - Keep it out of the startup path.
   - Profile it separately; do not add it back to root startup.
   - Optimize only if measured: cache `Intl.DateTimeFormat` instances, avoid repeated full-year event warming, and replace/bound the 801-day search in `shamsiToGregorian` before considering any background precomputation.

3. **If another startup stall remains after onboarding**
   - Add a timestamp immediately before and after each candidate effect; start with root navigation, onboarding redirect, prayer hydration, and TrackPlayer setup.
   - Make the next change only after the log interval identifies a single blocking section. Do not broadly defer providers or change permission sequencing.

## Required log capture

```sh
adb -s <serial> logcat -c
adb -s <serial> shell am start -S -W -n com.afghandev.ebadat/.MainActivity
adb -s <serial> logcat -d -v epoch -s \
  EbadatStartup:I ReactNativeJS:E ActivityTaskManager:I AndroidRuntime:E
```

Interpret phases as follows:

- `Application.onCreate` → `MainActivity.onCreate`: Android app/activity initialization.
- `RN REACT_BRIDGELESS_LOADING_START` → `RUN_JS_BUNDLE_END`: RN runtime plus Hermes bundle load/compile.
- `AppEntry begin` → `Root navigation committed`: JS entry and first React commit.
- `Native splash hidden` and `Interactive ready`: splash dismissal and usable app state.

## Acceptance criteria

- A04e post-onboarding cold start reaches an interactive home UI in <5 s in at least 3 consecutive foreground runs.
- No >10 s greeting splash, no continuous high CPU on `mqt_v_js`, and no 20–80 s blank/splash hang.
- S24 remains no worse than its prior baseline.
- The final commit includes only the startup fix/instrumentation and this handoff (if desired), never the user’s unrelated ahadith changes.
