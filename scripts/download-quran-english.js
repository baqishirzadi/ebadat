/**
 * Add English translations to the existing Quran surah files.
 *
 * Source: QuranEnc.com — Ruwwad Center (english_rwwad), the same provider
 * already used for Dari (dari_badkhashani) and Pashto (pashto_zakaria).
 *
 * This script is additive and idempotent: it only writes `translation_english`
 * onto each ayah and never touches Arabic, Dari, or Pashto fields.
 *
 * Run: node scripts/download-quran-english.js [--force]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SURAHS_DIR = path.join(__dirname, '../data/surahs');
const METADATA_PATH = path.join(__dirname, '../data/metadata.json');
const API = 'https://quranenc.com/api/v1/translation/sura/english_rwwad';
const FORCE = process.argv.includes('--force');

function fetchJSON(url, attempt = 1) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { timeout: 30000 }, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('timeout', () => request.destroy(new Error('timeout')));
    request.on('error', reject);
  }).catch(async (error) => {
    if (attempt >= 4) throw error;
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    return fetchJSON(url, attempt + 1);
  });
}

/**
 * Ruwwad embeds footnote references as bracketed numbers inside the prose
 * (e.g. "All praise be to Allah[1]"). The reader has no footnote surface, so
 * the markers are removed rather than shown as stray digits.
 */
function cleanTranslation(text) {
  return String(text || '')
    .replace(/\[\d+\]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

async function fetchSurahEnglish(surahNumber) {
  const response = await fetchJSON(`${API}/${surahNumber}`);
  const rows = Array.isArray(response?.result) ? response.result : [];
  const byAyah = new Map();
  for (const row of rows) {
    const ayahNumber = parseInt(row.aya, 10);
    if (!Number.isFinite(ayahNumber)) continue;
    byAyah.set(ayahNumber, cleanTranslation(row.translation));
  }
  return byAyah;
}

async function run() {
  console.log('Adding English (QuranEnc — Ruwwad Center) to data/surahs/*.json\n');

  let updatedSurahs = 0;
  let skippedSurahs = 0;
  let totalAyahs = 0;
  let translatedAyahs = 0;
  const problems = [];

  for (let surahNumber = 1; surahNumber <= 114; surahNumber += 1) {
    const filename = `${String(surahNumber).padStart(3, '0')}.json`;
    const filepath = path.join(SURAHS_DIR, filename);

    if (!fs.existsSync(filepath)) {
      problems.push(`${filename}: file missing`);
      continue;
    }

    const surah = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const ayahs = Array.isArray(surah.ayahs) ? surah.ayahs : [];
    totalAyahs += ayahs.length;

    const alreadyComplete = ayahs.length > 0 &&
      ayahs.every((ayah) => typeof ayah.translation_english === 'string' && ayah.translation_english.trim());

    if (alreadyComplete && !FORCE) {
      skippedSurahs += 1;
      translatedAyahs += ayahs.length;
      continue;
    }

    let english;
    try {
      english = await fetchSurahEnglish(surahNumber);
    } catch (error) {
      problems.push(`${filename}: fetch failed (${error.message})`);
      continue;
    }

    let missing = 0;
    for (const ayah of ayahs) {
      const text = english.get(ayah.number) || '';
      if (!text) missing += 1;
      else translatedAyahs += 1;
      ayah.translation_english = text;
    }

    if (missing > 0) problems.push(`${filename}: ${missing} ayah(s) without English`);

    fs.writeFileSync(filepath, `${JSON.stringify(surah, null, 2)}\n`, 'utf8');
    updatedSurahs += 1;
    console.log(`  ${filename}  ${surah.name}  ${ayahs.length - missing}/${ayahs.length}`);

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  if (fs.existsSync(METADATA_PATH)) {
    const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
    metadata.sources = {
      ...(metadata.sources || {}),
      english: 'QuranEnc.com - Ruwwad Center',
    };
    fs.writeFileSync(METADATA_PATH, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  }

  console.log(`\nUpdated ${updatedSurahs} surah(s), skipped ${skippedSurahs} already complete.`);
  console.log(`English coverage: ${translatedAyahs}/${totalAyahs} ayahs.`);
  if (problems.length > 0) {
    console.log('\nProblems:');
    for (const problem of problems) console.log(`  - ${problem}`);
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
