#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const INPUT_PATH = path.join(__dirname, '..', 'data', 'ahadith', 'import', 'hadiths_verified.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'ahadith', 'hadiths.curated.v1.json');

const ALLOWED_BOOKS = new Set(['Bukhari', 'Muslim']);
const ALLOWED_SPECIAL_DAYS = new Set([
  'ramadan',
  'laylat_al_qadr',
  'eid_al_fitr',
  'eid_al_adha',
  'first_10_dhul_hijjah',
  'ashura',
]);

function fail(message) {
  console.error(`[import:ahadith] ${message}`);
  process.exit(1);
}

function normalizeString(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTopics(value) {
  if (!Array.isArray(value)) return [];
  const unique = new Set();
  for (const topic of value) {
    const clean = normalizeString(topic).toLowerCase();
    if (clean) unique.add(clean);
  }
  return Array.from(unique);
}

function normalizeSpecialDays(value, id) {
  if (value == null) return undefined;
  if (!Array.isArray(value)) {
    fail(`Hadith ${id}: special_days must be an array`);
  }

  const unique = [];
  for (const day of value) {
    const clean = normalizeString(day).toLowerCase();
    if (!ALLOWED_SPECIAL_DAYS.has(clean)) {
      fail(`Hadith ${id}: invalid special_days value ${day}`);
    }
    if (!unique.includes(clean)) {
      unique.push(clean);
    }
  }

  return unique.length ? unique : undefined;
}

function normalizeHijriRange(value, id) {
  if (value == null) return undefined;
  const month = Number(value.month);
  const dayStart = Number(value.day_start);
  const dayEnd = Number(value.day_end);

  if (![month, dayStart, dayEnd].every(Number.isInteger)) {
    fail(`Hadith ${id}: hijri_range values must be integers`);
  }

  if (month < 1 || month > 12) fail(`Hadith ${id}: hijri_range.month out of range`);
  if (dayStart < 1 || dayStart > 30) fail(`Hadith ${id}: hijri_range.day_start out of range`);
  if (dayEnd < 1 || dayEnd > 30) fail(`Hadith ${id}: hijri_range.day_end out of range`);
  if (dayStart > dayEnd) fail(`Hadith ${id}: hijri_range.day_start must be <= day_end`);

  return {
    month,
    day_start: dayStart,
    day_end: dayEnd,
  };
}

function stableHash(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

function parseSourceNumber(value) {
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

if (!fs.existsSync(INPUT_PATH)) {
  fail(`Missing input file: ${INPUT_PATH}`);
}

let input;
try {
  input = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
} catch (error) {
  fail(`Cannot parse input JSON: ${error.message || error}`);
}

if (!Array.isArray(input)) {
  fail('Input JSON must be an array of hadith objects');
}

const normalized = [];
for (const raw of input) {
  if (!raw || typeof raw !== 'object') {
    fail('Each input item must be an object');
  }

  const sourceId = Number(raw.id);
  if (!Number.isInteger(sourceId) || sourceId <= 0) {
    fail(`Invalid id in input: ${raw.id}`);
  }

  const sourceBook = normalizeString(raw.source_book);
  if (!ALLOWED_BOOKS.has(sourceBook)) {
    fail(`Hadith ${sourceId}: source_book must be Bukhari or Muslim`);
  }

  const arabicText = normalizeString(raw.arabic_text);
  const dari = normalizeString(raw.dari_translation);
  const pashto = normalizeString(raw.pashto_translation);

  if (!arabicText || !dari || !pashto) {
    fail(`Hadith ${sourceId}: arabic_text, dari_translation, and pashto_translation are required`);
  }

  const sourceNumber = normalizeString(raw.source_number);
  if (!sourceNumber) {
    fail(`Hadith ${sourceId}: source_number is required`);
  }

  const topics = normalizeTopics(raw.topics);
  if (!topics.length) {
    fail(`Hadith ${sourceId}: topics must contain at least one value`);
  }

  const weekdayOnly = raw.weekday_only == null ? undefined : normalizeString(raw.weekday_only).toLowerCase();
  if (weekdayOnly && weekdayOnly !== 'friday') {
    fail(`Hadith ${sourceId}: weekday_only must be 'friday' when provided`);
  }

  const record = {
    id: sourceId,
    arabic_text: arabicText,
    dari_translation: dari,
    pashto_translation: pashto,
    source_book: sourceBook,
    source_number: sourceNumber,
    is_muttafaq: Boolean(raw.is_muttafaq),
    topics,
    special_days: normalizeSpecialDays(raw.special_days, sourceId),
    hijri_range: normalizeHijriRange(raw.hijri_range, sourceId),
    weekday_only: weekdayOnly,
    daily_index: 0,
  };

  const dedupeKey = `${record.source_book}|${record.source_number}|${stableHash(record.arabic_text)}`;
  normalized.push({ dedupeKey, record });
}

const dedupedMap = new Map();
for (const item of normalized) {
  if (!dedupedMap.has(item.dedupeKey)) {
    dedupedMap.set(item.dedupeKey, item.record);
  }
}

const deduped = Array.from(dedupedMap.values());

// Deterministic order for daily rotation.
deduped.sort((a, b) => {
  if (a.source_book !== b.source_book) return a.source_book.localeCompare(b.source_book);
  const sourceDiff = parseSourceNumber(a.source_number) - parseSourceNumber(b.source_number);
  if (sourceDiff !== 0) return sourceDiff;
  if (a.source_number !== b.source_number) return a.source_number.localeCompare(b.source_number);
  if (a.id !== b.id) return a.id - b.id;
  return a.arabic_text.localeCompare(b.arabic_text, 'ar');
});

for (let i = 0; i < deduped.length; i += 1) {
  deduped[i].id = i + 1;
  deduped[i].daily_index = i + 1;
}

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(deduped, null, 2)}\n`, 'utf8');
console.log(`[import:ahadith] imported=${input.length} deduped=${deduped.length} written=${OUTPUT_PATH}`);
