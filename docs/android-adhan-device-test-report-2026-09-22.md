# Android Adhan Verification Report — 2026-09-22

## Scope

This report records the live verification of the Afghanistan Maghrib/شام policy on the connected Android phone after installing the current debug build.

The policy under test is:

```text
scheduled Maghrib = prayer-engine raw Maghrib + 180,000 ms
```

The adjustment is applied once by the canonical schedule policy. Native Android consumes canonical schedule entries verbatim and applies the same rule only in its native fallback calculation path.

## Device and build

- Device: Samsung Galaxy S24 Ultra, model `SM-S928N`
- Android: 16
- Device time zone: `+0430` (Afghanistan)
- App version: `1.0.21`, version code `29`
- Verification date: 2026-09-22
- APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## Automated verification

Passed:

- `npm run typecheck`
- `npm run verify:afghanistan-adhan-policy`
- `npm run verify:prayer-policy`
- `npm run verify:prayer-engine-parity`
- `npm run verify:ios-notification-settings`
- `npm run verify:ios-widget`
- Android `:app:testDebugUnitTest`
- Android `:app:assembleDebug`

The Afghanistan policy test covers Kabul, Herat, Kandahar, Badakhshan, an Afghan custom GPS location, a non-Afghanistan control, and month-boundary dates. Every Afghan fixture produced exactly `180,000 ms` between raw and scheduled Maghrib.

## Android permission and channel evidence

- `POST_NOTIFICATIONS`: granted
- Fine location: granted
- `SCHEDULE_EXACT_ALARM`: allowed
- Adhan alarms observed as `RTC_WAKEUP`, `window=0`, `exactAllowReason=permission`
- `adhan-fajr-v7`: importance 4, bundled `barakatullah_salim_18sec` sound
- `adhan-regular-v7`: importance 4, bundled `barakatullah_salim_18sec` sound
- Adhan channels use alarm audio attributes and vibration settings

## Rolling schedule evidence

The live alarm dump contained Maghrib alarms for the current date and future dates through the seven-day Android rolling horizon. Examples observed:

```text
2026-09-22 19:15
2026-09-23 19:13
2026-09-24 19:12
2026-09-25 19:10
2026-09-26 19:09
2026-09-27 19:07
2026-09-28 19:06
```

The exact clock values are location/date dependent; the reliability requirement is that each value is the canonical raw Maghrib value plus three minutes.

## Real-fire evidence

The phone fired the live Maghrib alarm on 2026-09-22:

```text
Expected: 2026-09-22 17:53:00.000 (+0430)
Actual:   2026-09-22 17:53:00.038 (+0430)
Delay:    0 seconds (38 ms measured process/logging difference)
Alarm:    adhan-maghrib-2026-09-22
```

Immediately after the fire, the scheduler rebuilt the future set:

```text
ensureScheduled reason=alarm-fired-adhan-maghrib-2026-09-22 scheduled=31 cancelled=0 expected=31
```

The app also rebuilt the same rolling set after the package-replacement/boot maintenance event:

```text
ensureScheduled reason=boot-android.intent.action.MY_PACKAGE_REPLACED scheduled=31 cancelled=0 expected=31
```

This verifies the physical-device trigger path and post-fire replenishment. It does not claim that sound can be heard when the phone is muted, in Do Not Disturb/Focus, or has OEM battery restrictions enabled.

## iOS status

The shared policy, iOS local-notification scheduling path, notification-settings checks, widget/prayer harness, rolling-window documentation, and month-boundary fixtures are implemented and pass the available static/harness checks.

No physical iPhone was connected during this run, and the local iOS simulator service was unavailable for reliable notification/audio testing. A physical-iPhone pass is still required for foreground/background/terminated delivery, Focus behavior, reboot behavior, and real Adhan audio.

## Remaining operational checks

For production release sign-off, verify on the target phone with the user’s normal settings:

1. Play the Adhan while the phone is audible and confirm the bundled sound is heard.
2. Confirm Samsung battery optimization/autostart settings do not restrict Ebadat.
3. Repeat once with the app backgrounded and once after normal process termination.
4. Do not use force-stop as a normal test expectation; Android may clear alarms after force-stop until the app is relaunched.
