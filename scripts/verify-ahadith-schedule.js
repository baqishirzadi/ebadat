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
const { getCalendarTruth } = require('../utils/calendarTruth.ts');

const start = new Date('2026-05-23T12:00:00+04:30');
const seen = new Set();

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function assertSpecial(offset, key, label) {
  const selection = selectDailyHadith(hadiths, addDays(start, offset));
  assert(selection.hadith.special_days?.includes(key), `${label}: expected ${key}, got hadith ${selection.hadith.id}`);
}

for (let offset = 0; offset < 60; offset += 1) {
  const date = addDays(start, offset);
  const selection = selectDailyHadith(hadiths, date);
  const truth = getCalendarTruth(date);

  assert(selection.hadith, `${truth.dateKey}: daily selection is empty`);
  assert(!seen.has(selection.hadith.id), `${truth.dateKey}: duplicate hadith ${selection.hadith.id} in 60-day schedule`);
  seen.add(selection.hadith.id);
}

assert(seen.size === 60, `expected 60 unique daily hadiths, got ${seen.size}`);
assertSpecial(3, 'arafah', 'Arafah 2026-05-26');
assertSpecial(4, 'eid_al_adha', 'Eid al-Adha 2026-05-27');
assertSpecial(5, 'tashreeq', 'Tashreeq day 1 2026-05-28');
assertSpecial(6, 'tashreeq', 'Tashreeq day 2 2026-05-29');
assertSpecial(7, 'tashreeq', 'Tashreeq day 3 2026-05-30');
assertSpecial(24, 'hijri_new_year', 'Hijri new year');
assertSpecial(33, 'ashura', 'Ashura');

console.log('[verify:ahadith-schedule] OK');
