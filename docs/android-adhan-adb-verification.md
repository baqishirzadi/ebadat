# Android Adhan Reliability — Manual ADB Verification

Run on a physical device with USB debugging enabled.

## Fresh install (Android 14+)

1. Install release/debug APK.
2. Complete onboarding: city → notification permission.
3. Confirm **no** exact-alarm settings prompt appears.
4. `adb shell dumpsys alarm | grep -i ebadat` — expect multiple `adhan-` alarms.

## Reboot recovery

```bash
adb reboot
# After boot:
adb shell dumpsys alarm | grep -i adhan
```

## Timezone change

Change timezone in device settings, then:

```bash
adb shell dumpsys alarm | grep -i adhan
```

## Process death (not force-stop)

```bash
adb shell am kill com.afghandev.ebadat
# Open app once — alarms should repopulate via config sync
```

## Doze (optional)

```bash
adb shell dumpsys battery unplug
adb shell cmd deviceidle force-idle
# Wait past next scheduled prayer or use a near test alarm from adhan settings
adb shell cmd deviceidle unforce
adb shell dumpsys battery reset
```

## Force-stop limitation

```bash
adb shell am force-stop com.afghandev.ebadat
adb shell dumpsys alarm | grep -i adhan
# Expect: no alarms until user relaunches app (OS restriction)
```
