# Adhan Audio Notes

This project uses the same 18-second Adhan clip for app-managed playback and iOS notification delivery.

## Active File

- Foreground/app playback: `assets/audio/adhan/barakatullah_salim_18sec.mp3`
- iOS notification sound: `assets/audio/adhan/barakatullah_salim_18sec.caf`
- Android notification sound: `assets/audio/adhan/barakatullah_salim_18sec.mp3`

## Runtime Behavior

- Foreground iOS/Android receive path uses `expo-av` and plays the complete 18-second MP3 while the app process is alive.
- iOS background/terminated delivery is owned by the system notification sound facility and must use a CAF under 30 seconds.
- Android notification channels: `adhan-fajr-v4`, `adhan-regular-v4`
- Android channel sound file: `barakatullah_salim_18sec.mp3`
- Audible by default for: Fajr and Maghrib
- Silent reminders remain unchanged for Dhuhr/Asr/Isha unless user settings change.

## Expo Notifications Plugin

`app.json` must include:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "sounds": [
            "./assets/audio/adhan/barakatullah_salim_18sec.mp3",
            "./assets/audio/adhan/barakatullah_salim_18sec.caf"
          ]
        }
      ]
    ]
  }
}
```

## Compliance Gate

Before store release, license proof for every bundled Adhan asset must be documented in:

- `/Users/ahmad/Desktop/EbadatApp/docs/adhan-audio-license-audit.md`
