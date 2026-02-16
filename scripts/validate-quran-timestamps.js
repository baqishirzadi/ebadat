#!/usr/bin/env node
/* global __dirname */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data', 'quran-audio', 'surah-manifest.json');
const INDEX_PATH = path.join(ROOT, 'data', 'quran-timestamps', 'index.json');

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
    warnings.forEach((msg) => console.warn(`- ${msg}`));
  }

  console.log(`✅ Quran timestamp validation passed (manifest entries: ${entries.length}).`);
}

validate();
