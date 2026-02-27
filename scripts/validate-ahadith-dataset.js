#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DATASET_PATH = path.join(__dirname, '..', 'data', 'ahadith', 'hadiths.curated.v1.json');
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
  console.error(`[verify:ahadith-data] ${message}`);
  process.exit(1);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

let hadiths;
try {
  hadiths = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));
} catch (error) {
  fail(`Cannot read dataset: ${String(error?.message || error)}`);
}

assert(Array.isArray(hadiths), 'Dataset root must be an array');
assert(hadiths.length > 0, 'Dataset must not be empty');

const ids = new Set();
const dailyIndexes = new Set();
let muttafaqCount = 0;

for (const item of hadiths) {
  assert(item && typeof item === 'object', 'Every hadith item must be an object');
  assert(Number.isInteger(item.id) && item.id > 0, `Invalid id: ${item?.id}`);
  assert(!ids.has(item.id), `Duplicate id: ${item.id}`);
  ids.add(item.id);

  assert(isNonEmptyString(item.arabic_text), `Hadith ${item.id}: arabic_text is required`);
  assert(isNonEmptyString(item.dari_translation), `Hadith ${item.id}: dari_translation is required`);
  assert(isNonEmptyString(item.pashto_translation), `Hadith ${item.id}: pashto_translation is required`);

  assert(ALLOWED_BOOKS.has(item.source_book), `Hadith ${item.id}: source_book must be Bukhari or Muslim`);
  assert(isNonEmptyString(item.source_number), `Hadith ${item.id}: source_number is required`);

  assert(typeof item.is_muttafaq === 'boolean', `Hadith ${item.id}: is_muttafaq must be boolean`);
  if (item.is_muttafaq) {
    muttafaqCount += 1;
  }

  assert(Array.isArray(item.topics), `Hadith ${item.id}: topics must be an array`);
  assert(item.topics.length > 0, `Hadith ${item.id}: topics must not be empty`);
  for (const topic of item.topics) {
    assert(isNonEmptyString(topic), `Hadith ${item.id}: each topic must be non-empty string`);
  }

  if (item.special_days !== undefined) {
    assert(Array.isArray(item.special_days), `Hadith ${item.id}: special_days must be an array when provided`);
    for (const key of item.special_days) {
      assert(ALLOWED_SPECIAL_DAYS.has(key), `Hadith ${item.id}: invalid special_days value ${String(key)}`);
    }
  }

  if (item.hijri_range !== undefined) {
    const range = item.hijri_range;
    assert(range && typeof range === 'object', `Hadith ${item.id}: hijri_range must be object`);
    assert(Number.isInteger(range.month) && range.month >= 1 && range.month <= 12, `Hadith ${item.id}: invalid hijri_range.month`);
    assert(Number.isInteger(range.day_start) && range.day_start >= 1 && range.day_start <= 30, `Hadith ${item.id}: invalid hijri_range.day_start`);
    assert(Number.isInteger(range.day_end) && range.day_end >= 1 && range.day_end <= 30, `Hadith ${item.id}: invalid hijri_range.day_end`);
    assert(range.day_start <= range.day_end, `Hadith ${item.id}: hijri_range day_start must be <= day_end`);
  }

  if (item.weekday_only !== undefined) {
    assert(item.weekday_only === 'friday', `Hadith ${item.id}: weekday_only must be 'friday' when provided`);
  }

  assert(Number.isInteger(item.daily_index) && item.daily_index > 0, `Hadith ${item.id}: daily_index must be positive integer`);
  assert(!dailyIndexes.has(item.daily_index), `Duplicate daily_index: ${item.daily_index}`);
  dailyIndexes.add(item.daily_index);
}

console.log('[verify:ahadith-data] OK');
console.log(`[verify:ahadith-data] total=${hadiths.length} muttafaq=${muttafaqCount}`);
