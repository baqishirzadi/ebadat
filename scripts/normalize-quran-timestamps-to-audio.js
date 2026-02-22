#!/usr/bin/env node
/* global __dirname */

const fs = require('fs');
const path = require('path');
const getMp3Duration = require('get-mp3-duration');

const ROOT = path.join(__dirname, '..');
const TIMESTAMP_ROOT = path.join(ROOT, 'data', 'quran-timestamps');
const AUDIO_ROOT = path.join(ROOT, 'data', 'quran-audio', 'full');
const RECITERS = ['ghamidi', 'muaiqly'];
const SURAH_FILE_REGEX = /^(\d{3})\.json$/;
const MIN_DRIFT_SECONDS = Number(process.env.MIN_DRIFT_SECONDS || 0.05);

function roundToMillis(value) {
  return Math.round(value * 1000) / 1000;
}

function normalizeSegments(segments, actualDurationSec) {
  const expectedEnd = Number(segments[segments.length - 1]?.end || 0);
  if (expectedEnd <= 0) {
    return { segments, changed: false, drift: 0 };
  }

  const drift = actualDurationSec - expectedEnd;
  if (Math.abs(drift) < MIN_DRIFT_SECONDS) {
    return { segments, changed: false, drift };
  }

  const scale = actualDurationSec / expectedEnd;
  let previousEnd = 0;
  const normalized = segments.map((segment, index) => {
    const start = Math.max(previousEnd, roundToMillis(index === 0 ? 0 : segment.start * scale));
    const end = Math.max(start + 0.001, roundToMillis(segment.end * scale));
    previousEnd = end;
    return {
      ayah: segment.ayah,
      start,
      end,
    };
  });

  return {
    segments: normalized,
    changed: true,
    drift,
  };
}

function main() {
  let updated = 0;
  let skipped = 0;

  for (const reciter of RECITERS) {
    const reciterDir = path.join(TIMESTAMP_ROOT, reciter);
    if (!fs.existsSync(reciterDir)) continue;

    const files = fs
      .readdirSync(reciterDir)
      .filter((name) => SURAH_FILE_REGEX.test(name))
      .sort();

    for (const fileName of files) {
      const surah = fileName.replace('.json', '');
      const timestampPath = path.join(reciterDir, fileName);
      const audioPath = path.join(AUDIO_ROOT, `${reciter}_${surah}.mp3`);

      if (!fs.existsSync(audioPath)) {
        skipped += 1;
        continue;
      }

      const payload = JSON.parse(fs.readFileSync(timestampPath, 'utf8'));
      if (!Array.isArray(payload.segments) || payload.segments.length === 0) {
        skipped += 1;
        continue;
      }

      const actualDurationSec = getMp3Duration(fs.readFileSync(audioPath)) / 1000;
      const result = normalizeSegments(payload.segments, actualDurationSec);
      if (!result.changed) {
        continue;
      }

      payload.segments = result.segments;
      fs.writeFileSync(timestampPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      updated += 1;

      console.log(
        `updated ${reciter}:${Number(surah)} drift=${result.drift.toFixed(3)}s actual=${actualDurationSec.toFixed(3)}s`
      );
    }
  }

  console.log(`done: updated=${updated} skipped=${skipped}`);
}

main();
