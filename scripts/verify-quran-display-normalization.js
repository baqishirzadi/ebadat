#!/usr/bin/env node

/**
 * Verify Quran display normalization removes annotation symbols safely.
 * This checks display-layer normalization only; source data is not changed.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SURAH_DIR = path.join(ROOT, 'data', 'surahs');
const METADATA_PATH = path.join(ROOT, 'data', 'metadata.json');

const STRIP_MARKS_REGEX = /[\u06D6-\u06ED]/g;
const HAS_MARKS_REGEX = /[\u06D6-\u06ED]/;

function fail(message) {
  console.error(`[FAIL] ${message}`);
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeDisplayText(text) {
  return text.replace(STRIP_MARKS_REGEX, '');
}

function main() {
  const errors = [];
  let totalSurahs = 0;
  let totalAyahs = 0;
  let removedSymbols = 0;

  const metadata = loadJson(METADATA_PATH);
  const surahMeta = new Map(
    (metadata.surahs || []).map((surah) => [surah.number, surah.numberOfAyahs])
  );

  for (let surahNumber = 1; surahNumber <= 114; surahNumber += 1) {
    const fileName = `${String(surahNumber).padStart(3, '0')}.json`;
    const filePath = path.join(SURAH_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      errors.push(`Missing surah file: ${fileName}`);
      continue;
    }

    const surah = loadJson(filePath);
    const ayahs = Array.isArray(surah.ayahs) ? surah.ayahs : [];

    totalSurahs += 1;
    totalAyahs += ayahs.length;

    const expectedAyahCount = surahMeta.get(surahNumber);
    if (typeof expectedAyahCount === 'number' && expectedAyahCount !== ayahs.length) {
      errors.push(
        `Ayah count mismatch in surah ${surahNumber}: expected ${expectedAyahCount}, got ${ayahs.length}`
      );
    }

    for (const ayah of ayahs) {
      const ayahNumber = ayah?.number;
      const rawText = ayah?.text;

      if (typeof rawText !== 'string' || rawText.trim() === '') {
        errors.push(`Empty/invalid text at surah ${surahNumber}, ayah ${ayahNumber ?? '?'}`);
        continue;
      }

      const normalized = normalizeDisplayText(rawText);
      const removedCount = rawText.length - normalized.length;
      if (removedCount > 0) {
        removedSymbols += removedCount;
      }

      if (HAS_MARKS_REGEX.test(normalized)) {
        errors.push(`Normalization leak at surah ${surahNumber}, ayah ${ayahNumber}`);
      }

      if (normalized.trim() === '') {
        errors.push(`Normalization emptied text at surah ${surahNumber}, ayah ${ayahNumber}`);
      }
    }
  }

  if (errors.length > 0) {
    fail(`Found ${errors.length} normalization issue(s).`);
    errors.slice(0, 50).forEach((message) => fail(message));
    if (errors.length > 50) {
      fail(`...and ${errors.length - 50} more`);
    }
    process.exit(1);
  }

  console.log('[PASS] Quran display normalization is clean.');
  console.log(
    `[PASS] Surahs checked: ${totalSurahs}, Ayahs checked: ${totalAyahs}, symbols removed in normalized output: ${removedSymbols}`
  );
}

main();
