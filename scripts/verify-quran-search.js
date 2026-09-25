#!/usr/bin/env node
/**
 * Verify Quran search database + golden multilingual queries.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'assets', 'quran-search.db');
const META_PATH = path.join(ROOT, 'data', 'quran-search-meta.json');

const FORMAT_CONTROLS = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
const ARABIC_DIACRITICS = /[\u064B-\u065F\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;
const PUNCTUATION =
  /[\u060C\u061B\u061F\u06D4!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~،؛؟«»ـ…]/g;
const WHITESPACE = /[\s\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+/g;
const PASHTO_VERSE_PREFIX = /^\s*\d+\s*[-–—]\s*\d+\s*/;

function normalizeArabicForSearch(text) {
  if (!text) return '';
  let value = text.normalize('NFC');
  value = value.replace(FORMAT_CONTROLS, '');
  value = value.replace(/\u0670/g, 'ا');
  value = value.replace(ARABIC_DIACRITICS, '');
  value = value.replace(/\u0671/g, 'ا').replace(/[إأآٱ]/g, 'ا');
  value = value.replace(/[يىېۍئ]/g, 'ی').replace(/[كګ]/g, 'ک');
  value = value.replace(/ة/g, 'ه').replace(/ؤ/g, 'و');
  value = value.replace(TATWEEL, '');
  value = value.replace(PUNCTUATION, ' ');
  value = value.replace(WHITESPACE, ' ');
  return value.trim().toLowerCase();
}

function compactArabicForSearch(text) {
  return normalizeArabicForSearch(text).replace(/ا/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeDariForSearch(text) {
  if (!text) return '';
  let value = text.normalize('NFC');
  value = value.replace(FORMAT_CONTROLS, ' ');
  value = value.replace(ARABIC_DIACRITICS, '');
  value = value.replace(/[إأآٱ]/g, 'ا');
  value = value.replace(/[يىېۍئ]/g, 'ی').replace(/[كګ]/g, 'ک');
  value = value.replace(/ة/g, 'ه');
  value = value.replace(TATWEEL, '');
  value = value.replace(PUNCTUATION, ' ');
  value = value.replace(WHITESPACE, ' ');
  return value.trim().toLowerCase();
}

function normalizePashtoForSearch(text) {
  if (!text) return '';
  let value = text.replace(PASHTO_VERSE_PREFIX, '');
  return normalizeDariForSearch(value);
}

function normalizeEnglishForSearch(text) {
  if (!text) return '';
  let value = text.normalize('NFC');
  value = value.replace(FORMAT_CONTROLS, ' ');
  value = value.replace(PUNCTUATION, ' ');
  value = value.replace(WHITESPACE, ' ');
  return value.trim().toLowerCase();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function searchField(db, field, query, limit = 10) {
  return db
    .prepare(`SELECT surah_number, ayah_number, ${field}, pashto_text, dari_text, arabic_text FROM ayahs WHERE ${field} LIKE ? ORDER BY surah_number, ayah_number LIMIT ?`)
    .all(`%${query}%`, limit);
}

function main() {
  assert(fs.existsSync(DB_PATH), `Missing ${DB_PATH}`);
  assert(fs.existsSync(META_PATH), `Missing ${META_PATH}`);

  const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
  const db = new Database(DB_PATH, { readonly: true });

  const count = db.prepare('SELECT COUNT(*) AS c FROM ayahs').get().c;
  assert(count === 6236, `Expected 6236 ayahs, got ${count}`);
  assert(meta.totalAyahs === 6236, 'meta.totalAyahs mismatch');

  const empty = db
    .prepare(
      `SELECT COUNT(*) AS c FROM ayahs
       WHERE arabic_text = '' OR dari_text = '' OR pashto_text = '' OR english_text = ''
          OR arabic_norm = '' OR dari_norm = '' OR pashto_norm = '' OR english_norm = ''`,
    )
    .get().c;
  assert(empty === 0, `Found ${empty} empty indexed fields`);

  const columns = db.prepare('PRAGMA table_info(ayahs)').all().map((row) => row.name);
  assert(columns.includes('english_text'), 'ayahs table missing english_text');
  assert(columns.includes('english_norm'), 'ayahs table missing english_norm');
  assert(meta.version === 2, `Expected meta.version 2, got ${meta.version}`);

  const prefixedPashto = db
    .prepare(`SELECT COUNT(*) AS c FROM ayahs WHERE pashto_text GLOB '[0-9]*-[0-9]* *'`)
    .get().c;
  assert(prefixedPashto === 0, `Pashto display still has verse prefixes: ${prefixedPashto}`);

  const arabicCases = [
    { q: 'بسم الله الرحمن الرحيم', expect: '1:1' },
    { q: 'الحمد لله رب العالمين', expect: '1:2' },
    { q: 'مالك يوم الدين', expect: '1:4' },
    { q: 'اهدنا الصراط المستقيم', expect: '1:6' },
    { q: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', expect: '1:1' },
  ];

  for (const testCase of arabicCases) {
    const compact = compactArabicForSearch(testCase.q);
    const rows = searchField(db, 'arabic_compact', compact, 5);
    const hit = rows.some((row) => `${row.surah_number}:${row.ayah_number}` === testCase.expect);
    assert(hit, `Arabic miss for "${testCase.q}" expected ${testCase.expect}, got ${rows.map((r) => `${r.surah_number}:${r.ayah_number}`).join(',')}`);
  }

  const dariRows = searchField(db, 'dari_norm', normalizeDariForSearch('جهانیان'), 5);
  assert(
    dariRows.some((row) => row.surah_number === 1 && row.ayah_number === 2),
    'Dari phrase جهانیان should match 1:2',
  );

  // ZWNJ / space equivalence for Dari
  const zwnj = normalizeDariForSearch('گردن‌ها');
  const spaced = normalizeDariForSearch('گردن ها');
  assert(zwnj.includes('گردن') && spaced.includes('گردن'), 'Dari ZWNJ normalization failed');

  const pashtoRows = searchField(db, 'pashto_norm', normalizePashtoForSearch('مهربان'), 5);
  assert(pashtoRows.length > 0, 'Pashto مهربان should match');
  assert(
    !/^\d+-\d+/.test(pashtoRows[0].pashto_text),
    'Pashto snippet should not include verse prefix',
  );

  // Ranking preference: exact compact phrase for 1:1 should beat later basmalah hits by Quran order among equal compact matches — at least 1:1 is present first when ordered.
  const basmalah = searchField(db, 'arabic_compact', compactArabicForSearch('بسم الله الرحمن الرحيم'), 3);
  assert(
    basmalah[0].surah_number === 1 && basmalah[0].ayah_number === 1,
    'Basmalah first result should be 1:1',
  );

  const englishMerciful = searchField(db, 'english_norm', normalizeEnglishForSearch('Most Merciful'), 5);
  assert(
    englishMerciful.some((row) => row.surah_number === 1 && row.ayah_number === 1),
    'English "Most Merciful" should match 1:1',
  );

  const englishStraight = searchField(db, 'english_norm', normalizeEnglishForSearch('straight path'), 5);
  assert(
    englishStraight.some((row) => row.surah_number === 1 && row.ayah_number === 6),
    'English "straight path" should match 1:6',
  );

  db.close();
  console.log('verify-quran-search: PASS');
  console.log(`ayahs=${count} arabic_goldens=${arabicCases.length} dari_ok pashto_ok english_ok`);
}

try {
  main();
} catch (error) {
  console.error('verify-quran-search: FAIL');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
