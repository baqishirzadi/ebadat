# Quran Audio - Method A (Gapless Playback)

## Overview

- **Surah 1**: Bundled in the APK. Offline from install.
- **Surahs 2–114**: Hosted online. Stream on first play, then cached locally for offline use.
- **Each surah**: One MP3 file. Ayah sync uses timestamps. No jamming between ayahs.

## Hosting Setup (Surahs 2–114)

### 1. Build full surah audio and timestamps

```bash
# Build all 114 surahs (takes 1–2 hours; downloads from everyayah.com)
npm run build:full-surah
```

Output:
- `data/quran-audio/full/{reciter}_{surah}.mp3` (228 files)
- `data/quran-timestamps/{reciter}/{surah}.json`

### 2. Update timestamp index

```bash
npm run build:quran-timestamps
```

Run coverage check:

```bash
npm run check:quran-audio
```

Strict full-rollout check (must be 228/228):

```bash
node scripts/check-quran-audio-coverage.js --strict
```

### 3. Upload MP3s to Supabase Storage

Set environment variables:

```bash
export SUPABASE_URL=https://<project-ref>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
export SUPABASE_QURAN_BUCKET=quran-audio
```

Upload:

```bash
npm run upload:quran-audio
```

### 4. Expected public URL structure

```
https://your-cdn.com/quran-audio/ghamidi_001.mp3
https://your-cdn.com/quran-audio/ghamidi_002.mp3
...
https://your-cdn.com/quran-audio/muaiqly_114.mp3
```

### 5. Generate manifest with BASE_URL

**Option A – environment variable:**
```bash
BASE_URL=https://your-cdn.com/quran-audio node scripts/generate-manifest.js
```

**Option B – config file:** Copy `config.json.example` to `config.json`, set `baseUrl`, then run:
```bash
node scripts/generate-manifest.js
```

This updates `surah-manifest.json` with URIs for all surahs. Surah 1 is bundled and takes precedence; manifest entries for 2–114 enable streaming and caching.

If rollout is progressive, keep `data/quran-audio/hosted-files.json` with uploaded filenames.
`generate-manifest.js` will include only hosted files and legacy fallback will cover the rest.

## Caching

When a user plays any surah (2–114) for the first time, the app streams from the URL and caches the full surah MP3 locally. All subsequent plays use the cached file (offline).

## Reciters

- **ghamidi**: Saad Al-Ghamidi (everyayah Ghamadi_40kbps)
- **muaiqly**: Maher Al-Muaiqly (everyayah Maher_AlMuaiqly_64kbps)

Do not change reciters or audio sources.
