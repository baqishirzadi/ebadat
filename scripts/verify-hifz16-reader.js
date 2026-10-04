#!/usr/bin/env node

/** Static guard rails for the Android 16-line navigator and native renderer. */
const payload = require('../data/hifz16-pages.json');

const fail = (message) => {
  console.error(`[verify:hifz16] FAIL: ${message}`);
  process.exit(1);
};

if (payload.pageCount !== 548 || payload.pages.length !== 548) {
  fail(`expected 548 pages, got metadata=${payload.pageCount}, entries=${payload.pages.length}`);
}

const firstPageByJuz = new Map();
const ayahs = new Set();
for (const [index, page] of payload.pages.entries()) {
  if (page.page !== index + 1) fail(`page order breaks at index ${index}`);
  if (!Array.isArray(page.lines) || page.lines.length !== 16) {
    fail(`page ${page.page} has ${page.lines?.length ?? 0} rows`);
  }
  if (!Number.isInteger(page.juz) || page.juz < 1 || page.juz > 30) {
    fail(`page ${page.page} has invalid juz ${page.juz}`);
  }
  if (!firstPageByJuz.has(page.juz)) firstPageByJuz.set(page.juz, page.page);
  for (const line of page.lines) {
    if (line.type !== 'ayah') continue;
    if (!line.surahNumber || !line.ayahStart || !line.ayahEnd || line.ayahEnd < line.ayahStart) {
      fail(`page ${page.page}, row ${line.line} has invalid ayah range`);
    }
    for (let ayah = line.ayahStart; ayah <= line.ayahEnd; ayah += 1) {
      ayahs.add(`${line.surahNumber}:${ayah}`);
    }
  }
}

if (firstPageByJuz.size !== 30) fail(`expected 30 juz starts, got ${firstPageByJuz.size}`);
if (ayahs.size !== 6236) fail(`expected all 6236 ayahs, got ${ayahs.size}`);
if (firstPageByJuz.get(2) !== 20 || firstPageByJuz.get(30) !== 528) {
  fail(`unexpected juz starts: 2=${firstPageByJuz.get(2)}, 30=${firstPageByJuz.get(30)}`);
}

console.log(`[verify:hifz16] PASS: 548 pages, 30 juz starts, ${ayahs.size} ayahs, 16 rows per page.`);
