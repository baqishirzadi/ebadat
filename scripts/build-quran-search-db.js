#!/usr/bin/env node
/**
 * Build a bundled SQLite FTS search database from data/surahs/*.json
 *
 * Outputs:
 *   - assets/quran-search.db
 *   - data/quran-search-meta.json (row counts / checksum for verification)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const ROOT = path.resolve(__dirname, '..');
const SURAHS_DIR = path.join(ROOT, 'data', 'surahs');
const OUT_DB = path.join(ROOT, 'assets', 'quran-search.db');
const OUT_META = path.join(ROOT, 'data', 'quran-search-meta.json');

const FORMAT_CONTROLS = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
const ARABIC_DIACRITICS = /[\u064B-\u065F\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;
const PUNCTUATION =
  /[\u060C\u061B\u061F\u06D4!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~،؛؟«»ـ…]/g;
const WHITESPACE = /[\s\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+/g;
const PASHTO_VERSE_PREFIX = /^\s*\d+\s*[-–—]\s*\d+\s*/;

function foldDaggerAlif(text) {
  return text.replace(/\u0670/g, 'ا');
}

function foldAlifVariants(text) {
  return text.replace(/\u0671/g, 'ا').replace(/[إأآٱ]/g, 'ا');
}

function foldYeKaf(text) {
  return text.replace(/[يىېۍئ]/g, 'ی').replace(/[كګ]/g, 'ک');
}

function foldTehMarbuta(text) {
  return text.replace(/ة/g, 'ه').replace(/ؤ/g, 'و');
}

function normalizeArabicForSearch(text) {
  if (!text) return '';
  let value = text.normalize('NFC');
  value = value.replace(FORMAT_CONTROLS, '');
  value = foldDaggerAlif(value);
  value = value.replace(ARABIC_DIACRITICS, '');
  value = foldAlifVariants(value);
  value = foldYeKaf(value);
  value = foldTehMarbuta(value);
  value = value.replace(TATWEEL, '');
  value = value.replace(PUNCTUATION, ' ');
  value = value.replace(WHITESPACE, ' ');
  return value.trim().toLowerCase();
}

function compactArabicForSearch(text) {
  const normalized = normalizeArabicForSearch(text);
  if (!normalized) return '';
  return normalized.replace(/ا/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeDariForSearch(text) {
  if (!text) return '';
  let value = text.normalize('NFC');
  value = value.replace(FORMAT_CONTROLS, ' ');
  value = value.replace(ARABIC_DIACRITICS, '');
  value = foldAlifVariants(value);
  value = foldYeKaf(value);
  value = foldTehMarbuta(value);
  value = value.replace(TATWEEL, '');
  value = value.replace(PUNCTUATION, ' ');
  value = value.replace(WHITESPACE, ' ');
  return value.trim().toLowerCase();
}

function normalizePashtoForSearch(text) {
  if (!text) return '';
  let value = text.replace(PASHTO_VERSE_PREFIX, '');
  value = value.normalize('NFC');
  value = value.replace(FORMAT_CONTROLS, ' ');
  value = value.replace(ARABIC_DIACRITICS, '');
  value = foldAlifVariants(value);
  value = foldYeKaf(value);
  value = foldTehMarbuta(value);
  value = value.replace(TATWEEL, '');
  value = value.replace(PUNCTUATION, ' ');
  value = value.replace(WHITESPACE, ' ');
  return value.trim().toLowerCase();
}

function cleanPashtoDisplay(text) {
  if (!text) return '';
  return text.replace(PASHTO_VERSE_PREFIX, '').replace(WHITESPACE, ' ').trim();
}

function padSurah(n) {
  return String(n).padStart(3, '0');
}

function loadAllAyahs() {
  const rows = [];
  for (let surahNumber = 1; surahNumber <= 114; surahNumber += 1) {
    const filePath = path.join(SURAHS_DIR, `${padSurah(surahNumber)}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing surah file: ${filePath}`);
    }
    const surah = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(surah.ayahs) || surah.ayahs.length === 0) {
      throw new Error(`Surah ${surahNumber} has no ayahs`);
    }
    for (const ayah of surah.ayahs) {
      const arabic = String(ayah.text || '');
      const dari = String(ayah.translation_dari || '');
      const pashtoRaw = String(ayah.translation_pashto || '');
      const pashto = cleanPashtoDisplay(pashtoRaw);

      if (!arabic.trim() || !dari.trim() || !pashto.trim()) {
        throw new Error(`Empty text at ${surahNumber}:${ayah.number}`);
      }

      rows.push({
        id: surahNumber * 1000 + ayah.number,
        surah_number: surahNumber,
        ayah_number: ayah.number,
        surah_name: String(surah.name || ''),
        arabic_text: arabic.replace(/^\uFEFF/, ''),
        dari_text: dari,
        pashto_text: pashto,
        arabic_norm: normalizeArabicForSearch(arabic),
        arabic_compact: compactArabicForSearch(arabic),
        dari_norm: normalizeDariForSearch(dari),
        pashto_norm: normalizePashtoForSearch(pashtoRaw),
      });
    }
  }
  return rows;
}

function buildDatabase(rows) {
  fs.mkdirSync(path.dirname(OUT_DB), { recursive: true });
  if (fs.existsSync(OUT_DB)) {
    fs.unlinkSync(OUT_DB);
  }

  const db = new Database(OUT_DB);
  db.pragma('journal_mode = OFF');
  db.pragma('synchronous = OFF');

  db.exec(`
    CREATE TABLE ayahs (
      id INTEGER PRIMARY KEY,
      surah_number INTEGER NOT NULL,
      ayah_number INTEGER NOT NULL,
      surah_name TEXT NOT NULL,
      arabic_text TEXT NOT NULL,
      dari_text TEXT NOT NULL,
      pashto_text TEXT NOT NULL,
      arabic_norm TEXT NOT NULL,
      arabic_compact TEXT NOT NULL,
      dari_norm TEXT NOT NULL,
      pashto_norm TEXT NOT NULL
    );

    CREATE INDEX idx_ayahs_surah_ayah ON ayahs(surah_number, ayah_number);
    CREATE INDEX idx_ayahs_arabic_norm ON ayahs(arabic_norm);
    CREATE INDEX idx_ayahs_arabic_compact ON ayahs(arabic_compact);

    CREATE VIRTUAL TABLE ayahs_fts USING fts5(
      arabic_norm,
      arabic_compact,
      dari_norm,
      pashto_norm,
      content='ayahs',
      content_rowid='id',
      tokenize='unicode61 remove_diacritics 0'
    );
  `);

  const insert = db.prepare(`
    INSERT INTO ayahs (
      id, surah_number, ayah_number, surah_name,
      arabic_text, dari_text, pashto_text,
      arabic_norm, arabic_compact, dari_norm, pashto_norm
    ) VALUES (
      @id, @surah_number, @ayah_number, @surah_name,
      @arabic_text, @dari_text, @pashto_text,
      @arabic_norm, @arabic_compact, @dari_norm, @pashto_norm
    )
  `);

  const insertFts = db.prepare(`
    INSERT INTO ayahs_fts(rowid, arabic_norm, arabic_compact, dari_norm, pashto_norm)
    VALUES (@id, @arabic_norm, @arabic_compact, @dari_norm, @pashto_norm)
  `);

  const tx = db.transaction((items) => {
    for (const row of items) {
      insert.run(row);
      insertFts.run(row);
    }
  });
  tx(rows);

  db.exec('ANALYZE;');
  db.close();
}

function main() {
  console.log('Building Quran search database...');
  const rows = loadAllAyahs();
  if (rows.length !== 6236) {
    throw new Error(`Expected 6236 ayahs, got ${rows.length}`);
  }

  buildDatabase(rows);

  const hash = crypto.createHash('sha256').update(fs.readFileSync(OUT_DB)).digest('hex');
  const meta = {
    version: 1,
    totalAyahs: rows.length,
    totalSurahs: 114,
    generatedAt: new Date().toISOString(),
    dbPath: 'assets/quran-search.db',
    sha256: hash,
    sample: {
      fatiha1ArabicNorm: rows[0].arabic_norm,
      fatiha2ArabicNorm: rows[1].arabic_norm,
      fatiha4ArabicNorm: rows[3].arabic_norm,
      fatiha6ArabicNorm: rows[5].arabic_norm,
    },
  };
  fs.writeFileSync(OUT_META, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${OUT_DB}`);
  console.log(`Wrote ${OUT_META}`);
  console.log(`Ayahs: ${rows.length}`);
  console.log(`DB size: ${(fs.statSync(OUT_DB).size / 1024 / 1024).toFixed(2)} MB`);
  console.log('Sample norms:', meta.sample);
}

main();
