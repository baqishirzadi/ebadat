#!/usr/bin/env node

const fs = require('fs');
const Module = require('module');
const path = require('path');
const ts = require('typescript');

const PROJECT_ROOT = path.join(__dirname, '..');

function fail(message) {
  console.error(`[verify:ahadith-schedule] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    return originalResolveFilename.call(this, path.join(PROJECT_ROOT, request.slice(2)), parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions['.ts'] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const hadiths = require('../data/ahadith/hadiths.curated.v1.json');
const { selectDailyHadith } = require('../utils/ahadith/selector.ts');
const { resolveCanonicalDailyHadith } = require('../utils/ahadith/daily.ts');
const { getCalendarTruth } = require('../utils/calendarTruth.ts');
const { getAhadithCalendarContext } = require('../utils/ahadith/calendarContext.ts');
const notificationSource = fs.readFileSync(path.join(PROJECT_ROOT, 'utils/ahadith/notifications.ts'), 'utf8');

assert(
  /const selection = resolveCanonicalDailyHadith\(dateKey, language\)/.test(notificationSource),
  'Daily Hadith notifications must keep using the canonical date selector',
);

const start = new Date('2026-01-01T12:00:00+04:30');
const eventStart = new Date('2026-05-23T12:00:00+04:30');

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function assertSpecial(offset, key, label) {
  const selection = selectDailyHadith(hadiths, addDays(eventStart, offset));
  assert(selection.hadith.special_days?.includes(key), `${label}: expected ${key}, got hadith ${selection.hadith.id}`);
}

for (let offset = 0; offset < 730; offset += 1) {
  const date = addDays(start, offset);
  const selection = selectDailyHadith(hadiths, date);
  const truth = getCalendarTruth(date);

  assert(selection.hadith, `${truth.dateKey}: daily selection is empty`);
  const repeat = selectDailyHadith(hadiths, date);
  assert(selection.hadith.id === repeat.hadith.id, `${truth.dateKey}: selection is not deterministic`);

  const context = getAhadithCalendarContext(date);
  if (context.specialDayKeys.includes('ramadan')) {
    assert(
      selection.hadith.special_days?.includes('ramadan'),
      `${truth.dateKey}: Ramadan expected, got hadith ${selection.hadith.id}`,
    );
  } else if (context.isFriday) {
    assert(
      selection.hadith.weekday_only === 'friday' ||
        selection.reason === 'hijri_range' ||
        selection.reason === 'special_days',
      `${truth.dateKey}: Friday hadith expected, got hadith ${selection.hadith.id}`,
    );
  }
}

assert(hadiths.length === 130, `expected 130 hadiths, got ${hadiths.length}`);

// The reviewed collection is intentionally smaller than 365 distinct records,
// but the calendar resolver must still deliver one stable, non-empty Hadith on
// every Kabul day of a full year. The same resolver powers the screen and
// notification scheduler; Hadith is intentionally no longer part of widgets.
for (let offset = 0; offset < 365; offset += 1) {
  const date = addDays(start, offset);
  const dateKey = getCalendarTruth(date).dateKey;
  const canonical = resolveCanonicalDailyHadith(dateKey);
  assert(canonical.dateKey === dateKey, `${dateKey}: canonical Kabul date changed`);
  assert(canonical.text.length > 0, `${dateKey}: daily Hadith text is empty`);
}
assertSpecial(3, 'arafah', 'Official Afghanistan Arafah 2026-05-26');
assertSpecial(4, 'eid_al_adha', 'Official Afghanistan Eid al-Adha 2026-05-27');
assertSpecial(5, 'tashreeq', 'Official Afghanistan Tashreeq day 1 2026-05-28');
assertSpecial(6, 'tashreeq', 'Official Afghanistan Tashreeq day 2 2026-05-29');
assertSpecial(7, 'tashreeq', 'Official Afghanistan Tashreeq day 3 2026-05-30');
assertSpecial(25, 'hijri_new_year', 'Official Afghanistan Hijri new year 2026-06-17');
assertSpecial(34, 'ashura', 'Official Afghanistan Ashura 2026-06-26');

const reportedDate = getAhadithCalendarContext(new Date('2026-09-23T12:00:00+04:30'));
assert(!reportedDate.specialDayKeys.includes('arafah'), '2026-09-23 must not be labelled Arafah');
assert(!reportedDate.hijriVerified, 'unannounced Afghanistan date should not be treated as official');
const unverifiedSelection = selectDailyHadith(hadiths, new Date('2026-09-23T12:00:00+04:30'));
assert(!unverifiedSelection.hadith.special_days?.length, 'unverified date must not select a special-occasion Hadith');

console.log('[verify:ahadith-schedule] OK (365 Kabul days: screen and notification selector agree)');
