#!/usr/bin/env node
/**
 * Build the Indo-Pak 16-line (Taj Company) hifz page map for Ebadat.
 *
 * Source: QUL / Taj Company layout as published in quranPages16.json
 * (umerfarooq41/quran-app, derived from https://qul.tarteel.ai/resources/mushaf-layout/11).
 *
 * Verification gates (script exits non-zero on failure):
 * - exactly 548 pages
 * - every page has exactly 16 lines
 * - all 6236 ayahs appear at least once
 * - Baqarah starts on page 2
 * - Ayat al-Kursi (2:255) is on page 38
 * - page 548 ends with 114:6
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'data', 'hifz16-pages.json');
const META_PATH = path.join(ROOT, 'data', 'hifz16-meta.json');
const SOURCE_URL =
  'https://raw.githubusercontent.com/umerfarooq41/quran-app/main/src/data/quranPages16.json';
const WORDS_URL =
  'https://raw.githubusercontent.com/umerfarooq41/quran-app/main/src/data/quranWords.json';
const CACHE_PATH = path.join(ROOT, 'data', '.cache', 'quranPages16.source.json');
const WORDS_CACHE_PATH = path.join(ROOT, 'data', '.cache', 'quranWords.source.json');
const BISMILLAH = 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِیْمِ';
const PUA_RE = /[\uE000-\uF8FF]/g;
const MARKS_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0610-\u061A]/g;
const MULTISPACE_RE = /[ \t\u00A0]{2,}/g;

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchUrl(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      })
      .on('error', reject);
  });
}

function loadSurahArabicNames() {
  const names = {};
  for (let i = 1; i <= 114; i += 1) {
    const file = path.join(ROOT, 'data', 'surahs', `${String(i).padStart(3, '0')}.json`);
    const surah = JSON.parse(fs.readFileSync(file, 'utf8'));
    names[i] = surah.name || surah.arabic || `سورة ${i}`;
  }
  return names;
}

function loadAyahJuz() {
  /** @type {Map<string, number>} */
  const map = new Map();
  for (let i = 1; i <= 114; i += 1) {
    const file = path.join(ROOT, 'data', 'surahs', `${String(i).padStart(3, '0')}.json`);
    const surah = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const ayah of surah.ayahs || []) {
      map.set(`${i}:${ayah.number}`, ayah.juz);
    }
  }
  return map;
}

function cleanText(text) {
  return String(text || '')
    .replace(PUA_RE, '')
    .replace(MULTISPACE_RE, ' ')
    .trim();
}

function toArabicNumerals(value) {
  return String(value).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);
}

function isAyahEndToken(text) {
  const bare = String(text || '').replace(PUA_RE, '').replace(MARKS_RE, '').replace(/\s/g, '');
  return bare.length === 0;
}

async function loadCachedJson(cachePath, url) {
  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  console.log(`[build-hifz16] Downloading ${url}`);
  const raw = await fetchUrl(url);
  fs.writeFileSync(cachePath, raw);
  return JSON.parse(raw);
}

function loadWordsById(ayahRecords) {
  const byId = new Map();
  for (const ayah of ayahRecords) {
    for (const word of ayah.words || []) {
      byId.set(Number(word.id), {
        text: word.text,
        surah: ayah.surahNumber,
        ayah: ayah.ayahNumber,
        end: isAyahEndToken(word.text),
      });
    }
  }
  return byId;
}

function lineTextFromWords(wordsById, firstWordId, lastWordId) {
  if (firstWordId == null || lastWordId == null) return '';
  const parts = [];
  for (let id = Number(firstWordId); id <= Number(lastWordId); id += 1) {
    const word = wordsById.get(id);
    if (!word) continue;
    if (word.end) {
      parts.push(`﴿${toArabicNumerals(word.ayah)}﴾`);
    } else {
      const text = cleanText(word.text);
      if (text) parts.push(text);
    }
  }
  return parts.join(' ').replace(MULTISPACE_RE, ' ').trim();
}

function fail(message) {
  console.error(`[build-hifz16] FAIL: ${message}`);
  process.exit(1);
}

async function loadSource() {
  return loadCachedJson(CACHE_PATH, SOURCE_URL);
}

async function main() {
  const source = await loadCachedJson(CACHE_PATH, SOURCE_URL);
  const wordRecords = await loadCachedJson(WORDS_CACHE_PATH, WORDS_URL);
  const wordsById = loadWordsById(wordRecords);
  if (!Array.isArray(source) || source.length !== 548) {
    fail(`expected 548 pages, got ${Array.isArray(source) ? source.length : typeof source}`);
  }

  const arabicNames = loadSurahArabicNames();
  const ayahJuz = loadAyahJuz();
  const covered = new Set();
  const surahFirstPage = {};
  const pages = [];

  for (const page of source) {
    if (!page || page.page !== pages.length + 1) {
      fail(`page order broken at index ${pages.length}`);
    }
    if (!Array.isArray(page.lines) || page.lines.length !== 16) {
      fail(`page ${page.page} has ${page.lines?.length} lines`);
    }

    let pageJuz = null;
    const lines = page.lines.map((line) => {
      const type = line.type || 'ayah';
      let text = cleanText(line.text);
      const surahNumber = line.surahNumber ?? null;
      const ayahStart = line.ayahStart ?? null;
      const ayahEnd = line.ayahEnd ?? null;

      if (type === 'surah_name' && surahNumber) {
        text = `سُورَةُ ${arabicNames[surahNumber] || surahNumber}`;
        if (!surahFirstPage[surahNumber]) {
          surahFirstPage[surahNumber] = page.page;
        }
      } else if (type === 'basmallah') {
        text = BISMILLAH;
      } else if (type === 'ayah' && surahNumber && ayahStart != null && ayahEnd != null) {
        const fromWords = lineTextFromWords(wordsById, line.firstWordId, line.lastWordId);
        if (fromWords) text = fromWords;
        for (let a = ayahStart; a <= ayahEnd; a += 1) {
          covered.add(`${surahNumber}:${a}`);
          if (pageJuz == null) {
            pageJuz = ayahJuz.get(`${surahNumber}:${a}`) ?? null;
          }
        }
      }

      return {
        line: line.line,
        type,
        text,
        centered: Boolean(line.isCentered) || type === 'surah_name' || type === 'basmallah',
        surahNumber: surahNumber || undefined,
        ayahStart: ayahStart ?? undefined,
        ayahEnd: ayahEnd ?? undefined,
      };
    });

    if (pageJuz == null) {
      // spacer-only pages should not exist; fall back from previous
      pageJuz = pages.length ? pages[pages.length - 1].juz : 1;
    }

    pages.push({
      page: page.page,
      juz: pageJuz,
      lines,
    });
  }

  if (covered.size !== 6236) {
    fail(`expected 6236 ayahs covered, got ${covered.size}`);
  }
  if (surahFirstPage[2] !== 2) {
    fail(`Baqarah should start on page 2, got ${surahFirstPage[2]}`);
  }
  const fatihaLine = pages[0].lines.find((line) => line.line === 3);
  if (!fatihaLine || !fatihaLine.text.includes('﴿٢﴾')) {
    fail(`expected ayah number ﴿٢﴾ on page 1 line 3, got ${fatihaLine?.text}`);
  }
  const kursiyPages = pages
    .filter((p) =>
      p.lines.some(
        (l) =>
          l.type === 'ayah' &&
          l.surahNumber === 2 &&
          l.ayahStart != null &&
          l.ayahEnd != null &&
          l.ayahStart <= 255 &&
          l.ayahEnd >= 255
      )
    )
    .map((p) => p.page);
  if (!kursiyPages.includes(38)) {
    fail(`Ayat al-Kursi should be on page 38, found on ${kursiyPages.join(',')}`);
  }
  const lastAyahLines = pages[547].lines.filter((l) => l.type === 'ayah');
  const last = lastAyahLines[lastAyahLines.length - 1];
  if (!last || last.surahNumber !== 114 || last.ayahEnd !== 6) {
    fail(`page 548 should end at 114:6, got ${last?.surahNumber}:${last?.ayahEnd}`);
  }
  if (Object.keys(surahFirstPage).length !== 114) {
    fail(`expected first-page map for 114 surahs, got ${Object.keys(surahFirstPage).length}`);
  }

  const payload = {
    version: 1,
    mushaf: 'indopak-16-taj',
    pageCount: 548,
    linesPerPage: 16,
    pages,
  };
  const meta = {
    version: 1,
    mushaf: 'indopak-16-taj',
    pageCount: 548,
    linesPerPage: 16,
    surahFirstPage,
    checks: {
      ayahCoverage: 6236,
      baqarahStartPage: 2,
      ayatAlKursiPage: 38,
      lastAyah: '114:6',
    },
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(payload));
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
  console.log(`[build-hifz16] wrote ${path.relative(ROOT, OUT_PATH)} (${(fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`[build-hifz16] wrote ${path.relative(ROOT, META_PATH)}`);
  console.log('[build-hifz16] OK');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
