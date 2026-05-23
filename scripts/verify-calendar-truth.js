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
const { getSpecialDayInfo } = require('../utils/islamicCalendar.ts');

const expectedHijri = [
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

console.log('[verify:calendar-truth] OK');
