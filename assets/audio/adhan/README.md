# Adhan Audio Files

This directory contains Adhan (Islamic call to prayer) audio files for the app.

## Required Files

| Filename | Description | Usage |
|----------|-------------|-------|
| `fajr_adhan.mp3` | **Special Fajr Adhan** | Automatically used for Fajr prayer |
| `barakatullah_salim.mp3` | **Barakatullah Salim (Normal Adhan)** | Used for Dhuhr, Asr, Maghrib, Isha |
| `mohamed_tarek.mp3` | Turkish reciter (optional) | Alternative voice option |
| `default_adhan.mp3` | Default calm Hanafi-style (fallback) | Used if other files missing |

## Audio Requirements

- **Format**: MP3 (recommended) or WAV
- **Quality**: 128-320 kbps
- **Duration**: Full Adhan (2-4 minutes)
- **Volume**: Normalized to -14 LUFS
- **Intro**: 0.5s silence before audio starts
- **NO background music**

## Recommended Sources

### 1. Archive.org (Free, Public Domain)
- Search: "Adhan" or "Azan" 
- URL: https://archive.org/search?query=adhan
- Look for recordings labeled "Traditional" or "Hanafi"

### 2. Quranic Audio
- URL: https://quranicaudio.com
- May have Adhan recordings in their collection

### 3. Islamic Network
- URL: https://islamic.network
- Open-source Islamic audio resources

### 4. Zikrullah.com
- Islamic audio library
- Various Adhan styles

### 5. YouTube (with permission)
- Search: "Adhan Traditional Afghan"
- Search: "Mohamed Tarek Adhan"
- **Note**: Only download if audio is licensed for reuse

## How to Add Audio Files

1. **Place your Fajr MP3 file** as `fajr_adhan.mp3` in this directory
2. **Place your Barakatullah Salim MP3 file** as `barakatullah_salim.mp3` in this directory
3. Ensure files are MP3 format
4. Normalize volume using Audacity or similar tool
5. Add 0.5s silence at the beginning (optional but recommended)
6. Files are automatically detected - no code changes needed!

## File Structure

The app automatically:
- Uses `fajr_adhan.mp3` for Fajr prayer
- Uses `barakatullah_salim.mp3` for other prayers (Dhuhr, Asr, Maghrib, Isha)
- Falls back to `default_adhan.mp3` if files are missing

**Code is already configured** - just add your MP3 files!

## Important Notes

- **DO NOT use** Abdul Basit or Sudais recordings (per requirements)
- Prefer calm, traditional Hanafi-style recordings
- Ensure you have rights to use any audio commercially
- Test audio on both iOS and Android before release

## For Expo Notifications

The notification sound file should also be referenced in `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "sounds": ["./assets/audio/adhan/default_adhan.mp3"]
        }
      ]
    ]
  }
}
```

---

**TODO**: Add actual Adhan audio files before App Store release.
