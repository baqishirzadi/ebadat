# Adhan Audio Notes

This project now uses a single bundled adhan sound for audible prayer notifications.

## Active File

- `assets/audio/adhan/barakatullah_salim_18sec.mp3`

## Runtime Behavior

- Android notification channels: `adhan-fajr-v3`, `adhan-regular-v3`
- Sound file: `barakatullah_salim_18sec.mp3`
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
          "sounds": ["./assets/audio/adhan/barakatullah_salim_18sec.mp3"]
        }
      ]
    ]
  }
}
```

## Compliance Gate

Before store release, license proof for `assets/audio/adhan/barakatullah_salim_18sec.mp3` must be documented in:

- `/Users/ahmad/Desktop/EbadatApp/docs/adhan-audio-license-audit.md`
