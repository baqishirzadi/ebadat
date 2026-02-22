#!/usr/bin/env node
/**
 * Build Full Surah Audio (Method A - Gapless Playback)
 *
 * Downloads ayah-by-ayah MP3s from everyayah.com, concatenates into full surah
 * files, and generates timestamp JSON for gapless ayah seeking.
 *
 * Prerequisites: ffmpeg required
 *   brew install ffmpeg  # macOS
 *
 * Usage:
 *   node scripts/build-full-surah-audio.js [--reciter=ghamidi|muaiqly] [--surahs=1,108,109]
 *   node scripts/build-full-surah-audio.js --missing-only --resume --concurrency=12
 *   node scripts/build-full-surah-audio.js  # builds all surahs for both reciters
 *
 * Output:
 *   - data/quran-audio/full/{reciter}_{surah}.mp3
 *   - data/quran-timestamps/{reciter}/{surah}.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const METADATA_PATH = path.join(ROOT, 'data', 'metadata.json');
const OUTPUT_AUDIO_DIR = path.join(ROOT, 'data', 'quran-audio', 'full');
const TIMESTAMP_DIR = path.join(ROOT, 'data', 'quran-timestamps');
const TMP_DIR = path.join(ROOT, '.tmp-ayah-downloads');
const FAILURE_LOG_PATH = path.join(TMP_DIR, 'failures.json');
const DEFAULT_DOWNLOAD_CONCURRENCY = Number(process.env.AYAH_DOWNLOAD_CONCURRENCY || 10);
const DEFAULT_REQUEST_TIMEOUT_MS = Number(process.env.AYAH_DOWNLOAD_TIMEOUT_MS || 30000);
const DEFAULT_DOWNLOAD_RETRIES = Number(process.env.AYAH_DOWNLOAD_RETRIES || 4);

const RECITERS = {
  ghamidi: {
    baseUrl: 'https://everyayah.com/data/Ghamadi_40kbps',
    id: 'ghamidi',
    bitrate: '40k',
  },
  muaiqly: {
    baseUrl: 'https://everyayah.com/data/Maher_AlMuaiqly_64kbps',
    id: 'muaiqly',
    bitrate: '64k',
  },
};

function pad3(n) {
  return String(n).padStart(3, '0');
}

function getAyahUrl(reciter, surah, ayah) {
  const { baseUrl } = RECITERS[reciter];
  const filename = `${pad3(surah)}${pad3(ayah)}.mp3`;
  return `${baseUrl}/${filename}`;
}

function downloadFile(url, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          res.resume();
          return downloadFile(res.headers.location, timeoutMs).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Timeout after ${timeoutMs}ms: ${url}`));
    });
  });
}

async function downloadAyahWithRetry(reciterId, surahNum, ayah, url) {
  let attempt = 0;
  let lastError = null;

  while (attempt < DEFAULT_DOWNLOAD_RETRIES) {
    attempt += 1;
    try {
      return await downloadFile(url);
    } catch (error) {
      lastError = error;
      if (attempt >= DEFAULT_DOWNLOAD_RETRIES) {
        break;
      }

      const waitMs = 300 * attempt;
      process.stdout.write(
        `\n   retry ${attempt}/${DEFAULT_DOWNLOAD_RETRIES - 1} for ${reciterId} ${surahNum}:${ayah} in ${waitMs}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  const wrapped = new Error(
    `download failed for ${reciterId} surah ${surahNum} ayah ${ayah}: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
  wrapped.ayah = ayah;
  wrapped.url = url;
  throw wrapped;
}

function getMp3DurationMs(filePath) {
  const output = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
    { stdio: 'pipe', encoding: 'utf8' }
  ).trim();
  const durationSeconds = Number.parseFloat(output);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error(`Unable to detect duration via ffprobe: ${filePath}`);
  }
  return Math.round(durationSeconds * 1000);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function roundToMillis(value) {
  return Math.round(value * 1000) / 1000;
}

function normalizeSegmentsToDuration(segments, expectedDurationSec, actualDurationSec) {
  if (
    !Array.isArray(segments) ||
    segments.length === 0 ||
    !Number.isFinite(expectedDurationSec) ||
    expectedDurationSec <= 0 ||
    !Number.isFinite(actualDurationSec) ||
    actualDurationSec <= 0
  ) {
    return segments;
  }

  const scale = actualDurationSec / expectedDurationSec;
  if (!Number.isFinite(scale) || scale <= 0) {
    return segments;
  }

  let previousEnd = 0;
  return segments.map((segment, index) => {
    const scaledStart = index === 0 ? 0 : segment.start * scale;
    const scaledEnd = segment.end * scale;
    const start = Math.max(previousEnd, roundToMillis(scaledStart));
    const end = Math.max(start + 0.001, roundToMillis(scaledEnd));
    previousEnd = end;

    return {
      ayah: segment.ayah,
      start,
      end,
    };
  });
}

function loadFailures() {
  try {
    if (!fs.existsSync(FAILURE_LOG_PATH)) {
      return [];
    }
    const parsed = JSON.parse(fs.readFileSync(FAILURE_LOG_PATH, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFailures(entries) {
  ensureDir(path.dirname(FAILURE_LOG_PATH));
  fs.writeFileSync(FAILURE_LOG_PATH, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
}

function appendFailure(failures, entry) {
  const updated = [...failures, entry].sort((a, b) => {
    if (a.reciter !== b.reciter) return a.reciter.localeCompare(b.reciter);
    if (a.surah !== b.surah) return a.surah - b.surah;
    if (a.ayah !== b.ayah) return a.ayah - b.ayah;
    return a.at.localeCompare(b.at);
  });
  writeFailures(updated);
  return updated;
}

function hasCompleteOutputs(reciterId, surahNum) {
  const outputMp3Path = path.join(OUTPUT_AUDIO_DIR, `${reciterId}_${pad3(surahNum)}.mp3`);
  const timestampPath = path.join(TIMESTAMP_DIR, reciterId, `${pad3(surahNum)}.json`);
  return fs.existsSync(outputMp3Path) && fs.existsSync(timestampPath);
}

async function downloadAyahsForSurah(reciterId, surahNum, ayahCount, reciterTmpDir, concurrency) {
  let completed = 0;
  let nextAyah = 1;
  const errors = [];
  const total = ayahCount;

  async function worker() {
    while (true) {
      const ayah = nextAyah++;
      if (ayah > ayahCount) {
        return;
      }

      const localPath = path.join(reciterTmpDir, `ayah_${pad3(ayah)}.mp3`);
      try {
        const existing = fs.existsSync(localPath) ? fs.statSync(localPath) : null;
        if (!existing || existing.size <= 0) {
          const url = getAyahUrl(reciterId, surahNum, ayah);
          const buf = await downloadAyahWithRetry(reciterId, surahNum, ayah, url);
          fs.writeFileSync(localPath, buf);
        }
      } catch (error) {
        errors.push(error);
      } finally {
        completed += 1;
        if (completed === total || completed % 10 === 0) {
          process.stdout.write(`\r  downloaded ${completed}/${total} ayah files`);
        }
      }
    }
  }

  const safeConcurrency = Number.isFinite(concurrency)
    ? Math.max(1, Math.min(20, Math.floor(concurrency)))
    : DEFAULT_DOWNLOAD_CONCURRENCY;
  const workers = Array.from({ length: safeConcurrency }, () => worker());
  await Promise.all(workers);
  process.stdout.write('\n');

  if (errors.length > 0) {
    throw errors[0];
  }
}

async function buildSurah(reciterId, surahNum, ayahCount, concurrency) {
  const reciter = RECITERS[reciterId];
  if (!reciter) throw new Error(`Unknown reciter: ${reciterId}`);

  const reciterTmpDir = path.join(TMP_DIR, reciterId, pad3(surahNum));
  ensureDir(reciterTmpDir);

  const segments = [];
  const concatListPath = path.join(reciterTmpDir, 'concat.txt');
  const concatLines = [];

  let cumulativeStart = 0;

  await downloadAyahsForSurah(reciterId, surahNum, ayahCount, reciterTmpDir, concurrency);

  for (let ayah = 1; ayah <= ayahCount; ayah++) {
    const localPath = path.join(reciterTmpDir, `ayah_${pad3(ayah)}.mp3`);
    const durationMs = getMp3DurationMs(localPath);
    const durationSec = durationMs / 1000;
    const endSec = cumulativeStart + durationSec;

    segments.push({
      ayah,
      start: roundToMillis(cumulativeStart),
      end: roundToMillis(endSec),
    });

    cumulativeStart = endSec;

    const absPath = path.resolve(localPath).replace(/\\/g, '/');
    concatLines.push(`file '${absPath}'`);

    if (ayah === ayahCount || ayah % 50 === 0) {
      process.stdout.write(
        `\r  mapped ${ayah}/${ayahCount} ayahs (${durationSec.toFixed(2)}s current)`
      );
    }
  }
  process.stdout.write('\n');

  const outputMp3Path = path.join(OUTPUT_AUDIO_DIR, `${reciterId}_${pad3(surahNum)}.mp3`);
  ensureDir(OUTPUT_AUDIO_DIR);

  fs.writeFileSync(concatListPath, concatLines.join('\n'), 'utf8');
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -vn -acodec libmp3lame -b:a ${reciter.bitrate} -ar 44100 -ac 2 "${outputMp3Path}"`,
    { stdio: 'pipe' }
  );

  const actualDurationSec = getMp3DurationMs(outputMp3Path) / 1000;
  const normalizedSegments = normalizeSegmentsToDuration(segments, cumulativeStart, actualDurationSec);

  const timestampPath = path.join(TIMESTAMP_DIR, reciterId, `${pad3(surahNum)}.json`);
  ensureDir(path.dirname(timestampPath));
  fs.writeFileSync(
    timestampPath,
    JSON.stringify(
      {
        surah: surahNum,
        reciter: reciterId,
        segments: normalizedSegments,
      },
      null,
      2
    ),
    'utf8'
  );

  return { segments, outputMp3Path };
}

function parseArgs() {
  const args = process.argv.slice(2);
  let reciters = ['ghamidi', 'muaiqly'];
  let surahs = null;
  let resume = false;
  let missingOnly = false;
  let concurrency = DEFAULT_DOWNLOAD_CONCURRENCY;

  for (const arg of args) {
    if (arg.startsWith('--reciter=')) {
      reciters = [arg.split('=')[1]];
    } else if (arg.startsWith('--surahs=')) {
      surahs = arg
        .split('=')[1]
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => n >= 1 && n <= 114);
    } else if (arg === '--resume') {
      resume = true;
    } else if (arg === '--missing-only') {
      missingOnly = true;
    } else if (arg.startsWith('--concurrency=')) {
      const parsed = parseInt(arg.split('=')[1], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        concurrency = parsed;
      }
    }
  }

  return { reciters, surahs, resume, missingOnly, concurrency };
}

function hasFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!hasFfmpeg()) {
    console.error('❌ ffmpeg is required for deterministic full-surah concat.');
    console.error('   Install ffmpeg first (macOS: brew install ffmpeg).');
    process.exit(1);
  }

  const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
  const surahMeta = (metadata.surahs || []).reduce((acc, s) => {
    acc[s.number] = s.numberOfAyahs;
    return acc;
  }, {});

  const { reciters, surahs, resume, missingOnly, concurrency } = parseArgs();
  const surahList = surahs || Object.keys(surahMeta).map(Number).sort((a, b) => a - b);

  ensureDir(TMP_DIR);
  let failures = loadFailures();

  console.log('🕌 Building full surah audio (Method A - gapless)\n');
  console.log(`Reciters: ${reciters.join(', ')}`);
  console.log(`Surahs: ${surahList.length} (${surahList.slice(0, 5).join(', ')}${surahList.length > 5 ? '...' : ''})\n`);
  console.log(`Mode: resume=${resume} missingOnly=${missingOnly}`);
  console.log(`Download concurrency: ${concurrency}\n`);

  for (const reciterId of reciters) {
    for (const surahNum of surahList) {
      const ayahCount = surahMeta[surahNum];
      if (!ayahCount) {
        console.warn(`⚠ Skipping surah ${surahNum}: no metadata`);
        continue;
      }

      const shouldSkipExisting = (resume || missingOnly) && hasCompleteOutputs(reciterId, surahNum);
      if (shouldSkipExisting) {
        console.log(`\n⏭ ${reciterId} / Surah ${surahNum} already complete, skipping`);
        continue;
      }

      console.log(`\n📖 ${reciterId} / Surah ${surahNum} (${ayahCount} ayahs)`);
      try {
        await buildSurah(reciterId, surahNum, ayahCount, concurrency);
        console.log(`   ✅ Done`);
      } catch (err) {
        console.error(`   ❌ ${err.message}`);
        failures = appendFailure(failures, {
          reciter: reciterId,
          surah: surahNum,
          ayah: Number.isInteger(err.ayah) ? err.ayah : null,
          at: new Date().toISOString(),
          url: err.url || null,
          error: err.message || String(err),
        });
      }
    }
  }

  console.log('\n✅ Run "npm run build:quran-timestamps" to update the timestamp index.');
  console.log('   Then set BASE_URL in scripts/generate-manifest.js and run it to generate surah-manifest.json');
  if (failures.length > 0) {
    console.log(`⚠ Failures logged: ${FAILURE_LOG_PATH}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
