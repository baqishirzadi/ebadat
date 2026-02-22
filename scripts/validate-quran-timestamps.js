#!/usr/bin/env node
/* global __dirname */

const fs = require('fs');
const path = require('path');
const getMp3Duration = require('get-mp3-duration');

const ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data', 'quran-audio', 'surah-manifest.json');
const INDEX_PATH = path.join(ROOT, 'data', 'quran-timestamps', 'index.json');
const METADATA_PATH = path.join(ROOT, 'data', 'metadata.json');
const AUDIO_ROOT = path.join(ROOT, 'data', 'quran-audio', 'full');
const DRIFT_TOLERANCE_SECONDS = 0.3;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validateSegments(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return 'segments must be a non-empty array';
  }

  let prevEnd = -1;
  let prevAyah = 0;

  for (const segment of segments) {
    if (
      !segment ||
      !Number.isFinite(segment.ayah) ||
      !Number.isFinite(segment.start) ||
      !Number.isFinite(segment.end)
    ) {
      return 'segment fields must be numeric';
    }

    if (segment.ayah <= 0 || segment.start < 0 || segment.end <= segment.start) {
      return 'segment ayah/start/end has invalid bounds';
    }

    if (segment.start < prevEnd) {
      return 'segments overlap or are not monotonic';
    }

    if (prevAyah > 0 && segment.ayah !== prevAyah + 1) {
      return 'ayah sequence must be continuous';
    }

    prevEnd = segment.end;
    prevAyah = segment.ayah;
  }

  return null;
}

function validate() {
  const errors = [];
  const warnings = [];
  const metadata = readJson(METADATA_PATH);
  const ayahCountMap = (Array.isArray(metadata.surahs) ? metadata.surahs : []).reduce(
    (acc, surah) => {
      if (Number.isInteger(surah.number) && Number.isInteger(surah.numberOfAyahs)) {
        acc[surah.number] = surah.numberOfAyahs;
      }
      return acc;
    },
    {}
  );

  if (!fs.existsSync(MANIFEST_PATH)) {
    errors.push('Missing manifest file: data/quran-audio/surah-manifest.json');
  }
  if (!fs.existsSync(INDEX_PATH)) {
    errors.push('Missing timestamp index: data/quran-timestamps/index.json');
  }
  if (errors.length > 0) {
    console.error('❌ Quran timestamp validation failed:');
    errors.forEach((msg) => console.error(`- ${msg}`));
    process.exit(1);
  }

  const manifest = readJson(MANIFEST_PATH);
  const index = readJson(INDEX_PATH);

  const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
  const reciters = index.reciters || {};

  const seenKeys = new Set();

  for (const entry of entries) {
    const { reciter, surah, uri } = entry || {};

    if (!['ghamidi', 'muaiqly'].includes(reciter)) {
      errors.push(`Invalid reciter in manifest entry: ${JSON.stringify(entry)}`);
      continue;
    }

    if (!Number.isInteger(surah) || surah < 1 || surah > 114) {
      errors.push(`Invalid surah in manifest entry: ${JSON.stringify(entry)}`);
      continue;
    }

    if (typeof uri !== 'string' || uri.trim().length === 0) {
      errors.push(`Missing/invalid uri in manifest entry: ${JSON.stringify(entry)}`);
      continue;
    }

    const key = `${reciter}:${surah}`;
    if (seenKeys.has(key)) {
      errors.push(`Duplicate manifest entry: ${key}`);
      continue;
    }
    seenKeys.add(key);

    const segments = reciters?.[reciter]?.[String(surah)];
    if (!segments) {
      errors.push(`Manifest has ${key} but timestamp segments are missing`);
      continue;
    }

    const segmentError = validateSegments(segments);
    if (segmentError) {
      errors.push(`Invalid segments for ${key}: ${segmentError}`);
    }

    const firstAyah = segments[0]?.ayah;
    const lastAyah = segments[segments.length - 1]?.ayah;
    const expectedAyahs = ayahCountMap[surah];
    if (firstAyah !== 1) {
      errors.push(`Invalid ayah start for ${key}: first ayah must be 1`);
    }
    if (Number.isInteger(expectedAyahs) && lastAyah !== expectedAyahs) {
      errors.push(`Ayah count mismatch for ${key}: expected ${expectedAyahs}, got ${lastAyah}`);
    }

    const localAudioPath = path.join(
      AUDIO_ROOT,
      `${reciter}_${String(surah).padStart(3, '0')}.mp3`
    );
    if (fs.existsSync(localAudioPath)) {
      try {
        const audioBuffer = fs.readFileSync(localAudioPath);
        const durationSeconds = getMp3Duration(audioBuffer) / 1000;
        const segmentEnd = Number(segments[segments.length - 1].end);
        const drift = Math.abs(durationSeconds - segmentEnd);
        if (drift > DRIFT_TOLERANCE_SECONDS) {
          errors.push(
            `Timestamp drift for ${key}: ${drift.toFixed(3)}s (audio=${durationSeconds.toFixed(
              3
            )}, segmentsEnd=${segmentEnd.toFixed(3)})`
          );
        }
      } catch (error) {
        errors.push(`Failed reading local audio for drift check ${key}: ${error.message}`);
      }
    } else {
      warnings.push(`Local audio missing for drift check: ${key}`);
    }
  }

  for (const reciter of ['ghamidi', 'muaiqly']) {
    const surahMap = reciters?.[reciter] || {};
    for (const [surah, segments] of Object.entries(surahMap)) {
      const key = `${reciter}:${surah}`;
      const segmentError = validateSegments(segments);
      if (segmentError) {
        errors.push(`Invalid segments in index for ${key}: ${segmentError}`);
        continue;
      }

      if (!seenKeys.has(key)) {
        warnings.push(`Timestamp exists without manifest entry: ${key}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('❌ Quran timestamp validation failed:');
    errors.forEach((msg) => console.error(`- ${msg}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('⚠️ Quran timestamp validation warnings:');
    const previewLimit = 20;
    warnings.slice(0, previewLimit).forEach((msg) => console.warn(`- ${msg}`));
    if (warnings.length > previewLimit) {
      console.warn(`- ... ${warnings.length - previewLimit} more warning(s)`);
    }
  }

  console.log(`✅ Quran timestamp validation passed (manifest entries: ${entries.length}).`);
}

validate();
