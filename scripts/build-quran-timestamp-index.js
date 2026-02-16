#!/usr/bin/env node
/* global __dirname */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TIMESTAMP_ROOT = path.join(ROOT, 'data', 'quran-timestamps');
const RECITERS = ['ghamidi', 'muaiqly'];
const SURAH_FILE_REGEX = /^(\d{3})\.json$/;

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

function build() {
  const reciters = {
    ghamidi: {},
    muaiqly: {},
  };

  const errors = [];

  for (const reciter of RECITERS) {
    const reciterDir = path.join(TIMESTAMP_ROOT, reciter);
    if (!fs.existsSync(reciterDir)) {
      continue;
    }

    const files = fs
      .readdirSync(reciterDir)
      .filter((name) => SURAH_FILE_REGEX.test(name))
      .sort();

    for (const fileName of files) {
      const filePath = path.join(reciterDir, fileName);
      const surah = Number(fileName.replace('.json', ''));

      let payload;
      try {
        payload = readJson(filePath);
      } catch (error) {
        errors.push(`${reciter}/${fileName}: invalid JSON (${error.message})`);
        continue;
      }

      if (payload.reciter !== reciter) {
        errors.push(`${reciter}/${fileName}: reciter mismatch (${payload.reciter})`);
        continue;
      }

      if (!Number.isInteger(payload.surah) || payload.surah !== surah) {
        errors.push(`${reciter}/${fileName}: surah field mismatch (${payload.surah})`);
        continue;
      }

      const segmentsError = validateSegments(payload.segments);
      if (segmentsError) {
        errors.push(`${reciter}/${fileName}: ${segmentsError}`);
        continue;
      }

      reciters[reciter][String(surah)] = payload.segments;
    }
  }

  if (errors.length > 0) {
    console.error('❌ Failed to build timestamp index:');
    errors.forEach((entry) => console.error(`- ${entry}`));
    process.exit(1);
  }

  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    reciters,
  };

  const outputPath = path.join(TIMESTAMP_ROOT, 'index.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  const counts = RECITERS.map((reciter) =>
    Object.keys(output.reciters[reciter]).length
  );

  console.log(
    `✅ Quran timestamp index built: ghamidi=${counts[0]} surah(s), muaiqly=${counts[1]} surah(s)`
  );
}

build();
