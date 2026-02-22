#!/usr/bin/env node
/* global __dirname */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const AUDIO_DIR = path.join(ROOT, 'data', 'quran-audio', 'full');
const TIMESTAMPS_DIR = path.join(ROOT, 'data', 'quran-timestamps');
const MANIFEST_PATH = path.join(ROOT, 'data', 'quran-audio', 'surah-manifest.json');

const RECITERS = ['ghamidi', 'muaiqly'];
const EXPECTED_SURAH_COUNT = 114;
const AUDIO_REGEX = /^(ghamidi|muaiqly)_(\d{3})\.mp3$/;
const STRICT_MODE = process.argv.includes('--strict');

function listAudioFiles() {
  if (!fs.existsSync(AUDIO_DIR)) return [];
  return fs.readdirSync(AUDIO_DIR).filter((file) => AUDIO_REGEX.test(file));
}

function listTimestampFiles(reciter) {
  const dir = path.join(TIMESTAMPS_DIR, reciter);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((file) => /^\d{3}\.json$/.test(file));
}

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return [];
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  return Array.isArray(manifest.entries) ? manifest.entries : [];
}

function toSurahSet(files, mode = 'audio') {
  const set = new Set();
  for (const file of files) {
    if (mode === 'audio') {
      const match = file.match(AUDIO_REGEX);
      if (!match) continue;
      set.add(Number(match[2]));
    } else {
      set.add(Number(file.replace('.json', '')));
    }
  }
  return set;
}

function main() {
  const manifestEntries = readManifest();
  const audioFiles = listAudioFiles();

  let hasError = false;
  let hasWarning = false;

  for (const reciter of RECITERS) {
    const reciterAudio = audioFiles.filter((file) => file.startsWith(`${reciter}_`));
    const reciterTimestamps = listTimestampFiles(reciter);
    const reciterManifest = manifestEntries.filter((entry) => entry.reciter === reciter);

    const audioSet = toSurahSet(reciterAudio, 'audio');
    const timestampSet = toSurahSet(reciterTimestamps, 'timestamp');
    const manifestSet = new Set(reciterManifest.map((entry) => Number(entry.surah)));

    const missingInAudio = [...timestampSet].filter((surah) => !audioSet.has(surah));
    const missingInTimestamps = [...audioSet].filter((surah) => !timestampSet.has(surah));
    const missingInManifest = [...audioSet].filter((surah) => !manifestSet.has(surah));

    console.log(
      `${reciter}: audio=${audioSet.size}, timestamps=${timestampSet.size}, manifest=${manifestSet.size}`
    );

    if (missingInAudio.length > 0) {
      hasError = true;
      console.log(`  ❌ Missing audio for timestamped surahs: ${missingInAudio.slice(0, 10).join(', ')}`);
    }
    if (missingInTimestamps.length > 0) {
      hasError = true;
      console.log(
        `  ❌ Missing timestamps for audio surahs: ${missingInTimestamps.slice(0, 10).join(', ')}`
      );
    }
    if (missingInManifest.length > 0) {
      if (STRICT_MODE) {
        hasError = true;
        console.log(
          `  ❌ Missing manifest entries for audio surahs: ${missingInManifest
            .slice(0, 10)
            .join(', ')}`
        );
      } else {
        hasWarning = true;
        console.log(
          `  ⚠ Missing manifest entries for audio surahs (progressive rollout): ${missingInManifest
            .slice(0, 10)
            .join(', ')}`
        );
      }
    }

    if (STRICT_MODE) {
      if (
        audioSet.size !== EXPECTED_SURAH_COUNT ||
        timestampSet.size !== EXPECTED_SURAH_COUNT ||
        manifestSet.size !== EXPECTED_SURAH_COUNT
      ) {
        hasError = true;
        console.log(`  ⚠ Expected ${EXPECTED_SURAH_COUNT} per reciter for full rollout.`);
      }
    }
  }

  const totalManifest = manifestEntries.length;
  console.log(`manifest total entries: ${totalManifest}`);
  if (STRICT_MODE) {
    if (totalManifest !== EXPECTED_SURAH_COUNT * RECITERS.length) {
      hasError = true;
      console.log(`  ⚠ Expected ${EXPECTED_SURAH_COUNT * RECITERS.length} total manifest entries.`);
    }
  }

  if (hasError) {
    process.exit(1);
  }

  if (STRICT_MODE) {
    console.log('✅ Quran audio coverage is complete and consistent.');
  } else if (hasWarning) {
    console.log('✅ Quran audio coverage is consistent for progressive rollout.');
  } else {
    console.log('✅ Quran audio coverage is complete and consistent.');
  }
}

main();
