#!/usr/bin/env node
/* global __dirname, fetch */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const AUDIO_DIR = path.join(ROOT, 'data', 'quran-audio', 'full');
const REPORT_PATH = path.join(ROOT, 'data', 'quran-audio', 'upload-report.json');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = process.env.SUPABASE_QURAN_BUCKET || 'quran-audio';
const CONCURRENCY = Number(process.env.UPLOAD_CONCURRENCY || 4);
const FORCE_UPLOAD = process.env.FORCE_UPLOAD === 'true';
const REQUEST_TIMEOUT_MS = Number(process.env.UPLOAD_TIMEOUT_MS || 120000);
const UPLOAD_RETRIES = Number(process.env.UPLOAD_RETRIES || 3);

const AUDIO_FILE_REGEX = /^(ghamidi|muaiqly)_\d{3}\.mp3$/;

function assertEnv() {
  if (!SUPABASE_URL) {
    throw new Error('Missing SUPABASE_URL');
  }
  if (!SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }
}

function getHeaders(extra = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureBucket() {
  const createRes = await fetchWithTimeout(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: null,
      allowed_mime_types: ['audio/mpeg', 'audio/mp3'],
    }),
  });

  if (createRes.status !== 200 && createRes.status !== 409) {
    const text = await createRes.text();
    let duplicate = false;
    try {
      const parsed = JSON.parse(text);
      duplicate =
        parsed?.statusCode === '409' ||
        parsed?.statusCode === 409 ||
        typeof parsed?.message === 'string' && parsed.message.toLowerCase().includes('already exists');
    } catch {
      duplicate = false;
    }

    if (!duplicate) {
      throw new Error(`Bucket create failed (${createRes.status}): ${text}`);
    }
  }

  const updateRes = await fetchWithTimeout(`${SUPABASE_URL}/storage/v1/bucket/${BUCKET}`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: null,
      allowed_mime_types: ['audio/mpeg', 'audio/mp3'],
    }),
  });

  if (!updateRes.ok) {
    const text = await updateRes.text();
    throw new Error(`Bucket update failed (${updateRes.status}): ${text}`);
  }
}

function getAudioFiles() {
  if (!fs.existsSync(AUDIO_DIR)) {
    return [];
  }
  return fs
    .readdirSync(AUDIO_DIR)
    .filter((name) => AUDIO_FILE_REGEX.test(name))
    .sort();
}

async function uploadOne(filename) {
  const filePath = path.join(AUDIO_DIR, filename);
  const stream = fs.readFileSync(filePath);
  const encodedPath = filename
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

  let attempt = 0;
  while (attempt < UPLOAD_RETRIES) {
    attempt += 1;
    try {
      const res = await fetchWithTimeout(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodedPath}`, {
        method: 'POST',
        headers: getHeaders({
          'Content-Type': 'audio/mpeg',
          'x-upsert': 'true',
        }),
        body: stream,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }

      return {
        filename,
        publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`,
      };
    } catch (error) {
      if (attempt >= UPLOAD_RETRIES) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
    }
  }

  throw new Error('Upload retry attempts exhausted');
}

async function listExistingObjects() {
  const res = await fetchWithTimeout(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      prefix: '',
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`List objects failed (${res.status}): ${text}`);
  }

  const rows = await res.json();
  if (!Array.isArray(rows)) return new Set();
  return new Set(rows.map((row) => row.name).filter(Boolean));
}

async function runWithConcurrency(items, worker, concurrency) {
  const results = [];
  let index = 0;
  let completed = 0;

  async function runner() {
    while (index < items.length) {
      const current = index++;
      const item = items[current];
      try {
        const result = await worker(item);
        results.push({ ok: true, item, result });
        completed += 1;
        console.log(`   ✅ ${completed}/${items.length}: ${item}`);
      } catch (error) {
        results.push({
          ok: false,
          item,
          error: error instanceof Error ? error.message : String(error),
        });
        completed += 1;
        console.log(`   ❌ ${completed}/${items.length}: ${item}`);
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => runner());
  await Promise.all(workers);
  return results;
}

async function main() {
  assertEnv();

  const files = getAudioFiles();
  if (files.length === 0) {
    throw new Error('No full-surah MP3 files found in data/quran-audio/full');
  }

  await ensureBucket();
  const existing = await listExistingObjects();
  const pendingFiles = FORCE_UPLOAD
    ? files
    : files.filter((filename) => !existing.has(filename));

  console.log(
    `📦 Uploading ${pendingFiles.length}/${files.length} file(s) to bucket: ${BUCKET}${
      FORCE_UPLOAD ? ' (force)' : ''
    }`
  );

  const startedAt = new Date().toISOString();
  const results = await runWithConcurrency(pendingFiles, uploadOne, CONCURRENCY);
  const uploaded = results.filter((entry) => entry.ok).map((entry) => entry.result.filename);
  const failed = results.filter((entry) => !entry.ok).map((entry) => ({
    filename: entry.item,
    error: entry.error,
  }));

  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    bucket: BUCKET,
    baseUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`,
    totalFiles: files.length,
    existingCount: existing.size,
    uploadedCount: uploaded.length,
    failedCount: failed.length,
    uploaded,
    failed,
  };

  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`✅ Uploaded: ${uploaded.length}/${files.length}`);
  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length}`);
    process.exitCode = 1;
  }
  console.log(`📝 Report: ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error(`❌ Upload failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
