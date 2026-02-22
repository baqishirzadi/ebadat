#!/usr/bin/env node
/**
 * Generate surah-manifest.json for Method A (gapless playback)
 *
 * Set BASE_URL to where your full surah MP3s are hosted.
 * Example: https://your-cdn.com/quran-audio
 *          or file:///path/to/data/quran-audio/full (for local dev)
 *
 * Usage:
 *   BASE_URL=https://example.com/audio node scripts/generate-manifest.js
 *   node scripts/generate-manifest.js  # uses default from env or placeholder
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data', 'quran-audio', 'surah-manifest.json');
const CONFIG_PATH = path.join(ROOT, 'data', 'quran-audio', 'config.json');
const HOSTED_FILES_PATH = path.join(ROOT, 'data', 'quran-audio', 'hosted-files.json');
const TIMESTAMP_DIR = path.join(ROOT, 'data', 'quran-timestamps');
const AUDIO_DIR = path.join(ROOT, 'data', 'quran-audio', 'full');

const RECITERS = ['ghamidi', 'muaiqly'];

function pad3(n) {
  return String(n).padStart(3, '0');
}

function getBaseUrl() {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return config.baseUrl || '';
  } catch {
    return '';
  }
}

function generate() {
  const baseUrl = getBaseUrl();
  const entries = [];
  const missingAudio = [];
  const hostedFiles = loadHostedFilesAllowList();

  for (const reciter of RECITERS) {
    const reciterDir = path.join(TIMESTAMP_DIR, reciter);
    if (!fs.existsSync(reciterDir)) continue;

    const files = fs.readdirSync(reciterDir).filter((f) => /^\d{3}\.json$/.test(f));
    for (const file of files.sort()) {
      const surah = parseInt(file.replace('.json', ''), 10);
      const filename = `${reciter}_${pad3(surah)}.mp3`;
      const localAudioPath = path.join(AUDIO_DIR, filename);
      if (!fs.existsSync(localAudioPath)) {
        missingAudio.push(`${reciter}:${surah}`);
        continue;
      }
      if (hostedFiles && !hostedFiles.has(filename)) {
        continue;
      }
      const uri = baseUrl ? `${baseUrl.replace(/\/$/, '')}/${filename}` : '';
      if (uri) {
        entries.push({ reciter, surah, uri });
      }
    }
  }

  const manifest = {
    version: 1,
    entries,
  };

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`✅ Generated surah-manifest.json with ${entries.length} entries`);
  const byReciter = RECITERS.reduce((acc, reciter) => {
    acc[reciter] = entries.filter((entry) => entry.reciter === reciter).length;
    return acc;
  }, {});
  console.log(`   Coverage: ghamidi=${byReciter.ghamidi}, muaiqly=${byReciter.muaiqly}`);
  if (missingAudio.length > 0) {
    console.log(`⚠️ Missing local audio for ${missingAudio.length} timestamped surah(s).`);
  }
  if (!baseUrl) {
    console.log('⚠️  BASE_URL not set - manifest has 0 entries. Set BASE_URL to enable Method A.');
  } else if (entries.length !== 228) {
    console.log('⚠️  Manifest is not complete (expected 228 entries).');
  }
  if (hostedFiles) {
    console.log(`ℹ️  Hosted allow-list active: ${hostedFiles.size} file(s).`);
  }
}

function loadHostedFilesAllowList() {
  if (!fs.existsSync(HOSTED_FILES_PATH)) {
    return null;
  }

  try {
    const payload = JSON.parse(fs.readFileSync(HOSTED_FILES_PATH, 'utf8'));
    if (!Array.isArray(payload)) {
      return null;
    }
    const names = payload
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
    return new Set(names);
  } catch {
    return null;
  }
}

generate();
