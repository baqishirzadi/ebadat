#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SURAH_DIR = path.join(ROOT, 'data', 'surahs');
const METADATA_PATH = path.join(ROOT, 'data', 'metadata.json');
const METRICS_PATH = path.join(ROOT, 'config', 'quran-render-metrics.json');
const AYAH_ROW_PATH = path.join(ROOT, 'components', 'quran', 'AyahRow.tsx');
const MUSHAF_VIEW_PATH = path.join(ROOT, 'components', 'quran', 'MushafView.tsx');
const QURAN_ARABIC_TEXT_PATH = path.join(ROOT, 'components', 'quran', 'QuranArabicText.tsx');

const BISMILLAH_REGEX = /^بِسْمِ(?:\s+[^\s]+){3}\s+(.+)/;

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fail(errors) {
  console.error('[verify:quran-render] FAILED');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

function stripBismillah(text, surahNumber, ayahNumber) {
  if (ayahNumber !== 1 || surahNumber === 1 || surahNumber === 9) {
    return text;
  }
  const match = text.match(BISMILLAH_REGEX);
  return match && match[1] ? match[1].trim() : text;
}

function countDisplayCodePoints(text) {
  return Array.from(text).length;
}

function main() {
  const errors = [];
  const metrics = loadJson(METRICS_PATH);
  const metadata = loadJson(METADATA_PATH);
  const ayahRowSource = fs.readFileSync(AYAH_ROW_PATH, 'utf8');
  const mushafViewSource = fs.readFileSync(MUSHAF_VIEW_PATH, 'utf8');
  const quranArabicTextSource = fs.readFileSync(QURAN_ARABIC_TEXT_PATH, 'utf8');

  if (!ayahRowSource.includes('QuranArabicText')) {
    errors.push('AyahRow is not using QuranArabicText.');
  }
  if (!mushafViewSource.includes('QuranArabicText')) {
    errors.push('MushafView is not using QuranArabicText.');
  }
  if (/marginBottom:\s*-\d+/.test(ayahRowSource) || /marginBottom:\s*-\d+/.test(mushafViewSource)) {
    errors.push('Negative bottom margin clipping hack still exists in Quran reader files.');
  }
  if (/paddingBottom:\s*68/.test(ayahRowSource) || /paddingBottom:\s*62/.test(mushafViewSource)) {
    errors.push('Legacy fixed Arabic bottom padding hack still exists in Quran reader files.');
  }
  if (!quranArabicTextSource.includes("writingDirection: 'rtl'")) {
    errors.push('QuranArabicText is missing explicit RTL writing direction.');
  }
  if (!quranArabicTextSource.includes("direction: 'rtl'")) {
    errors.push('QuranArabicText is missing explicit RTL paragraph direction.');
  }
  if (!quranArabicTextSource.includes("textAlign: 'center'")) {
    errors.push('QuranArabicText is missing the centered Arabic layout path.');
  }
  if (!quranArabicTextSource.includes("width: '100%'")) {
    errors.push('QuranArabicText does not stretch centered/right-aligned text across the safe container width.');
  }

  const scheherazadeScroll = metrics?.fonts?.scheherazade?.scroll;
  if (!scheherazadeScroll) {
    errors.push('Scheherazade scroll metrics are missing.');
  } else {
    if (!(scheherazadeScroll.fontScale < 1)) {
      errors.push('Scheherazade reader fontScale is not reduced.');
    }
    if (!['center', 'right'].includes(scheherazadeScroll.textAlign)) {
      errors.push('Scheherazade reader textAlign must stay in a safe RTL-friendly mode (center or right).');
    }
  }

  let ayahCount = 0;
  const longestAyahs = [];

  for (const surahMeta of metadata.surahs || []) {
    const fileName = `${String(surahMeta.number).padStart(3, '0')}.json`;
    const surahPath = path.join(SURAH_DIR, fileName);
    if (!fs.existsSync(surahPath)) {
      errors.push(`Missing surah file ${fileName}`);
      continue;
    }

    const surah = loadJson(surahPath);
    for (const ayah of surah.ayahs || []) {
      const displayText = stripBismillah(ayah.text, surah.number, ayah.number);
      if (!displayText || !displayText.trim()) {
        errors.push(`Empty display text at ${surah.number}:${ayah.number}`);
        continue;
      }
      ayahCount += 1;
      longestAyahs.push({
        key: `${surah.number}:${ayah.number}`,
        codePoints: countDisplayCodePoints(displayText),
      });
    }
  }

  for (const check of metrics.audit?.longAyahChecks || []) {
    if (!longestAyahs.some((entry) => entry.key === `${check.surah}:${check.ayah}`)) {
      errors.push(`Mandatory long-ayah spot check missing from bundled data: ${check.surah}:${check.ayah}`);
    }
  }

  if (ayahCount !== 6236) {
    errors.push(`Expected 6236 ayahs in render audit, got ${ayahCount}`);
  }

  if (errors.length > 0) {
    fail(errors);
  }

  longestAyahs.sort((a, b) => b.codePoints - a.codePoints);

  console.log('[verify:quran-render] PASS');
  console.log(`- Ayahs checked: ${ayahCount}`);
  console.log(`- Shared renderer: ${path.relative(ROOT, QURAN_ARABIC_TEXT_PATH)}`);
  console.log('- Top long ayahs for device spot-check:');
  longestAyahs.slice(0, 8).forEach((entry) => {
    console.log(`  • ${entry.key} (${entry.codePoints} code points)`);
  });
}

main();
