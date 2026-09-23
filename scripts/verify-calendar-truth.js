#!/usr/bin/env node

const fs = require('fs');
const Module = require('module');
const path = require('path');
const ts = require('typescript');

const PROJECT_ROOT = path.join(__dirname, '..');

function fail(message) {
  console.error(`[verify:calendar-truth] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function resolveAlias(request) {
  if (!request.startsWith('@/')) return null;
  return path.join(PROJECT_ROOT, request.slice(2));
}

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  const aliased = resolveAlias(request);
  if (aliased) {
    return originalResolveFilename.call(this, aliased, parent, isMain, options);
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

const { getCalendarTruth } = require('../utils/calendarTruth.ts');
const { getSpecialDayInfo, hijriToGregorian } = require('../utils/islamicCalendar.ts');
const { getAhadithCalendarContext } = require('../utils/ahadith/calendarContext.ts');
const { getVerifiedAfghanistanHijriDate } = require('../utils/ahadith/officialAfghanistanCalendar.ts');
const { formatGregorianDateCompact, GREG_MONTHS_EN } = require('../utils/calendarDisplay.ts');

const expectedHijri = [
  // Verified Afghan dates take precedence over the Umm al-Qura fallback.
  ['2026-05-23T12:00:00+04:30', 6],
  ['2026-05-24T12:00:00+04:30', 7],
  ['2026-05-25T12:00:00+04:30', 8],
  ['2026-05-26T12:00:00+04:30', 9],
  ['2026-05-27T12:00:00+04:30', 10],
];

for (const [iso, day] of expectedHijri) {
  const truth = getCalendarTruth(new Date(iso));
  assert(truth.hijri.year === 1447, `${iso}: expected Hijri year 1447, got ${truth.hijri.year}`);
  assert(truth.hijri.month === 12, `${iso}: expected Dhul Hijjah, got month ${truth.hijri.month}`);
  assert(truth.hijri.day === day, `${iso}: expected Hijri day ${day}, got ${truth.hijri.day}`);
}

const today = getCalendarTruth(new Date('2026-05-23T12:00:00+04:30'));
assert(today.dateKey === '2026-05-23', `expected Kabul date key 2026-05-23, got ${today.dateKey}`);
assert(today.weekday === 6, `expected Saturday weekday index 6, got ${today.weekday}`);
assert(today.shamsi.year === 1405, `expected Shamsi year 1405, got ${today.shamsi.year}`);
assert(today.shamsi.month === 3, `expected Shamsi month 3 (Jawza), got ${today.shamsi.month}`);
assert(today.shamsi.day === 2, `expected Shamsi day 2, got ${today.shamsi.day}`);

const eid = getCalendarTruth(new Date('2026-05-27T12:00:00+04:30'));
const eidInfo = getSpecialDayInfo(eid.hijri);
assert(eid.weekday === 3, `expected Eid weekday Wednesday index 3, got ${eid.weekday}`);
assert(eidInfo?.isEid === true, 'expected 10 Dhul Hijjah to be marked as Eid');
assert(eidInfo?.nameDari === 'عید قربان', `expected Eid al-Adha Dari label, got ${eidInfo?.nameDari}`);

for (const [dateKey, day] of [
  ['2026-09-22', 9],
  ['2026-09-23', 10],
  ['2026-09-24', 11],
]) {
  const truth = getCalendarTruth(new Date(`${dateKey}T12:00:00+04:30`));
  assert(truth.hijri.year === 1448 && truth.hijri.month === 4 && truth.hijri.day === day,
    `${dateKey}: expected ${day} Rabi al-Thani 1448, got ${truth.hijri.day}/${truth.hijri.month}/${truth.hijri.year}`);
}

for (const [dateKey, year, month, day] of [
  ['2026-02-17', 1447, 8, 29],
  ['2026-02-18', 1447, 9, 1],
  ['2026-04-17', 1447, 10, 30],
  ['2026-04-18', 1447, 11, 1],
  ['2026-05-17', 1447, 11, 30],
  ['2026-05-18', 1447, 12, 1],
  ['2026-06-26', 1448, 1, 10],
  ['2026-06-27', 1448, 1, 11],
  ['2026-09-12', 1448, 3, 29],
  ['2026-09-13', 1448, 3, 30],
  ['2026-09-14', 1448, 4, 1],
]) {
  const hijri = getCalendarTruth(new Date(`${dateKey}T12:00:00+04:30`)).hijri;
  assert(hijri.year === year && hijri.month === month && hijri.day === day,
    `${dateKey}: expected continuous ${year}/${month}/${day}, got ${hijri.year}/${hijri.month}/${hijri.day}`);
}

const sep23Context = getAhadithCalendarContext(new Date('2026-09-23T12:00:00+04:30'));
assert(sep23Context.hijri.day === 10 && sep23Context.hijri.month === 4, 'Hadith context diverged from the Kabul Hijri resolver');
assert(!sep23Context.hijriVerified && sep23Context.specialDayKeys.length === 0,
  'unverified Rabi al-Thani date must not invent an occasion-specific Hadith');
const eidContext = getAhadithCalendarContext(new Date('2026-05-27T12:00:00+04:30'));
assert(eidContext.hijri.day === 10 && eidContext.hijriVerified && eidContext.specialDayKeys.includes('eid_al_adha'),
  'verified Afghan Eid date was not shared with the Hadith selector');

const verifiedEidDate = hijriToGregorian(1447, 12, 10);
assert(verifiedEidDate && getCalendarTruth(verifiedEidDate).dateKey === '2026-05-27',
  'Hijri-to-Gregorian conversion did not honor the verified Afghan Eid date');
const verifiedMuharramDate = hijriToGregorian(1448, 1, 10);
assert(verifiedMuharramDate && getCalendarTruth(verifiedMuharramDate).dateKey === '2026-06-26',
  'Hijri-to-Gregorian conversion did not honor the verified Afghan Muharram date');
const correctedRabiDate = hijriToGregorian(1448, 3, 30);
assert(correctedRabiDate && getCalendarTruth(correctedRabiDate).dateKey === '2026-09-13',
  'Hijri-to-Gregorian conversion did not honor the Afghan continuity correction');
assert(getVerifiedAfghanistanHijriDate('2026-06-26')?.hijri.day === 10,
  'verified Afghanistan calendar lookup returned the wrong date');

const expectedMonthCodes = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
assert(JSON.stringify(GREG_MONTHS_EN) === JSON.stringify(expectedMonthCodes), 'Gregorian month codes are not the compact uppercase set');
for (let month = 1; month <= 12; month += 1) {
  const date = new Date(`2026-${String(month).padStart(2, '0')}-15T12:00:00+04:30`);
  assert(formatGregorianDateCompact(date) === `15 ${expectedMonthCodes[month - 1]} 2026`,
    `Gregorian date formatter produced the wrong label for month ${month}`);
}

console.log('[verify:calendar-truth] OK');
