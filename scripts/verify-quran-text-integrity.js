#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SURAH_DIR = path.join(ROOT, 'data', 'surahs');
const METADATA_PATH = path.join(ROOT, 'data', 'metadata.json');

const QURANIC_MARKS_REGEX = /[\u06D6-\u06DE]/g;
const BISMILLAH_REGEX = /^بِسْمِ(?:\s+[^\s]+){3}\s+(.+)/;

function stripQuranicMarks(text) {
  return text.replace(QURANIC_MARKS_REGEX, '');
}

function stripBismillah(text, surahNumber, ayahNumber) {
  if (ayahNumber !== 1 || surahNumber === 1 || surahNumber === 9) {
    return text;
  }

  const match = text.match(BISMILLAH_REGEX);
  if (match && match[1]) {
    return match[1].trim();
  }
  return text;
}

function failWith(errors) {
  console.error('\n[verify:quran-text] FAILED');
  errors.slice(0, 100).forEach((error) => console.error(`- ${error}`));
  if (errors.length > 100) {
    console.error(`... ${errors.length - 100} more errors`);
  }
  process.exit(1);
}

function main() {
  if (!fs.existsSync(METADATA_PATH)) {
    failWith([`metadata file not found: ${METADATA_PATH}`]);
  }

  const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
  const expectedSurahCount = 114;
  const expectedAyahTotal = Number(metadata.totalAyahs);
  const errors = [];

  let actualAyahTotal = 0;

  for (let surahNumber = 1; surahNumber <= expectedSurahCount; surahNumber += 1) {
    const fileName = `${String(surahNumber).padStart(3, '0')}.json`;
    const filePath = path.join(SURAH_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      errors.push(`missing surah file: ${fileName}`);
      continue;
    }

    const surah = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const ayahs = Array.isArray(surah.ayahs) ? surah.ayahs : [];
    const metadataSurah = Array.isArray(metadata.surahs)
      ? metadata.surahs.find((item) => item.number === surahNumber)
      : null;

    if (!metadataSurah) {
      errors.push(`metadata missing surah ${surahNumber}`);
    } else if (ayahs.length !== metadataSurah.numberOfAyahs) {
      errors.push(
        `ayah count mismatch in surah ${surahNumber}: file=${ayahs.length}, metadata=${metadataSurah.numberOfAyahs}`
      );
    }

    actualAyahTotal += ayahs.length;

    ayahs.forEach((ayah, index) => {
      const ayahNumber = index + 1;
      const text = typeof ayah.text === 'string' ? ayah.text : '';
      if (!text.trim()) {
        errors.push(`empty text at ${surahNumber}:${ayahNumber}`);
        return;
      }

      const normalizedInput = stripQuranicMarks(text);
      const pipelineOutput = stripBismillah(normalizedInput, surahNumber, ayahNumber);

      const bismillahCandidate = ayahNumber === 1 && surahNumber !== 1 && surahNumber !== 9;
      const bismillahMatched = bismillahCandidate && BISMILLAH_REGEX.test(normalizedInput);

      if (!bismillahMatched && pipelineOutput !== normalizedInput) {
        errors.push(
          `unexpected text mutation at ${surahNumber}:${ayahNumber}`
        );
      }

      if (bismillahMatched && !pipelineOutput.trim()) {
        errors.push(`bismillah strip produced empty text at ${surahNumber}:${ayahNumber}`);
      }
    });
  }

  if (!Number.isFinite(expectedAyahTotal)) {
    errors.push('metadata.totalAyahs is invalid');
  } else if (actualAyahTotal !== expectedAyahTotal) {
    errors.push(`total ayah mismatch: file=${actualAyahTotal}, metadata=${expectedAyahTotal}`);
  }

  if (errors.length > 0) {
    failWith(errors);
  }

  console.log('[verify:quran-text] PASS');
  console.log(`- Surahs checked: ${expectedSurahCount}`);
  console.log(`- Ayahs checked: ${actualAyahTotal}`);
}

main();
