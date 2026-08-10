#!/usr/bin/env node

/**
 * Deterministic widget gate. This validates the JS snapshot contract and
 * executes the same Foundation calculator compiled into the WidgetKit target.
 * It intentionally uses only fixed fixtures; no app launch or network is
 * required.
 */
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const fail = (message) => {
  console.error(`[verify:ios-widget] ${message}`);
  process.exit(1);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    return originalResolve.call(this, path.join(root, request.slice(2)), parent, isMain, options);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const { calculatePrayerTimes } = require('../utils/prayerTimes.ts');
const { buildDateFromLocalTimeInTimezone, getHoursMinutesInTimeZone } = require('../utils/prayerTimezone.ts');
const { buildWidgetSnapshot, listWidgetTimelineBoundaries, parseWidgetSnapshot } = require('../utils/widgetSnapshot.ts');
const { formatPrayerTime12h } = require('../utils/formatPrayerTime.ts');

const fixtures = [
  { name: 'Kabul', date: '2026-07-06', timezone: 'Asia/Kabul', latitude: 34.5553, longitude: 69.2075, altitude: 1791, offset: 3, fixedDhuhr: '12:30' },
  { name: 'Herat', date: '2026-12-25', timezone: 'Asia/Kabul', latitude: 34.3529, longitude: 62.2163, altitude: 920, offset: 3, fixedDhuhr: '12:30' },
  { name: 'New York DST', date: '2026-07-06', timezone: 'America/New_York', latitude: 40.7128, longitude: -74.006, altitude: 10, offset: 0, fixedDhuhr: null },
];

function localAnchor(dateKey, timezone) {
  return buildDateFromLocalTimeInTimezone(dateKey, '12:00', timezone);
}

function entryMap(snapshot) {
  return Object.fromEntries(snapshot.prayers.map((entry) => [entry.key, entry]));
}

for (const fixture of fixtures) {
  const anchor = localAnchor(fixture.date, fixture.timezone);
  const calculated = calculatePrayerTimes(anchor, fixture, 'Karachi', 'Hanafi');
  const times = {
    ...calculated,
    dhuhr: fixture.fixedDhuhr ? buildDateFromLocalTimeInTimezone(fixture.date, fixture.fixedDhuhr, fixture.timezone) : calculated.dhuhr,
    maghrib: new Date(calculated.maghrib.getTime() + fixture.offset * 60 * 1000),
  };
  const snapshot = buildWidgetSnapshot(times, fixture.name, anchor, {
    timezone: fixture.timezone,
    location: fixture,
    calculationMethod: 'Karachi',
    asrMethod: 'Hanafi',
    maghribOffsetMinutes: fixture.offset,
    fixedDhuhrLocalTime: fixture.fixedDhuhr,
  });
  assert(snapshot.version === 3, `${fixture.name}: expected schema version 3`);
  assert(snapshot.latitude === fixture.latitude && snapshot.longitude === fixture.longitude, `${fixture.name}: location was not persisted`);
  assert(snapshot.calculationMethod === 'Karachi' && snapshot.asrMethod === 'Hanafi', `${fixture.name}: policy was not persisted`);

  const entries = entryMap(snapshot);
  for (const key of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    assert(Number.isFinite(entries[key]?.atMs), `${fixture.name}: missing ${key}`);
  }
  if (fixture.fixedDhuhr) {
    const local = new Intl.DateTimeFormat('en-GB', { timeZone: fixture.timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(entries.dhuhr.atMs));
    assert(local === fixture.fixedDhuhr, `${fixture.name}: fixed Dhuhr is ${local}, expected ${fixture.fixedDhuhr}`);
  }

  const roundTrip = parseWidgetSnapshot(JSON.stringify(snapshot));
  assert(roundTrip?.version === 3 && roundTrip.latitude === fixture.latitude, `${fixture.name}: snapshot round-trip failed`);
  const boundaries = listWidgetTimelineBoundaries(snapshot, anchor);
  const hasPrayerBoundary = Object.values(entries).some((entry) => boundaries.includes(entry.atMs));
  assert(hasPrayerBoundary, `${fixture.name}: prayer boundary missing from timeline (${boundaries.join(',')} vs ${Object.values(entries).map((entry) => entry.atMs).join(',')})`);
  assert(boundaries.some((value) => value > anchor.getTime()), `${fixture.name}: future timeline boundary missing`);
}

const legacy = parseWidgetSnapshot(JSON.stringify({
  version: 1,
  updatedAt: '2026-07-06T08:00:00.000Z',
  cityName: 'کابل',
  weekdayDari: 'دوشنبه',
  shamsiDisplay: '۱۵ سرطان ۱۴۰۵',
  hijriDisplay: '۲۱ محرم ۱۴۴۸',
  gregorianDisplay: '6 July 2026',
  prayers: [{ key: 'fajr', labelDari: 'صبح', time12h: '۴:۳۰', atMs: 1783336200000 }],
  nextRefreshAtMs: 1783336200000,
}));
assert(legacy?.version === 3 && legacy.latitude === 34.5553 && legacy.asrMethod === 'Hanafi', 'legacy snapshot migration failed');

const sharedPath = path.join(root, 'ios', 'EbadatPrayerWidget', 'WidgetShared.swift');
const calculatorPath = path.join(root, 'ios', 'EbadatPrayerWidget', 'WidgetPrayerCalculator.swift');
const sharedSource = fs.readFileSync(sharedPath, 'utf8');
const calculatorSource = fs.readFileSync(calculatorPath, 'utf8');
assert(sharedSource.includes('WidgetPrayerCalculator.daySnapshot'), 'WidgetShared does not calculate entries independently');
assert(sharedSource.includes('for offset in 0...14'), 'Widget timeline horizon is not bounded');
assert(calculatorSource.includes('islamicUmmAlQura') && calculatorSource.includes('Calendar(identifier: .persian)'), 'native calendar conversion is incomplete');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ebadat-widget-'));
const mainPath = path.join(tempDir, 'main.swift');
const binaryPath = path.join(tempDir, 'widget-harness');
fs.writeFileSync(mainPath, `import Foundation
let snapshot = WidgetSnapshot(version: 3, updatedAt: "2026-07-06T08:00:00Z", cityName: "Kabul", timezone: "Asia/Kabul", policyVersion: 3, sourceLabel: "Karachi+AF", latitude: 34.5553, longitude: 69.2075, altitude: 1791, calculationMethod: "Karachi", asrMethod: "Hanafi", maghribOffsetMinutes: 3, fixedDhuhrLocalTime: "12:30", weekdayDari: "", shamsiDisplay: "", hijriDisplay: "", gregorianDisplay: "", currentPrayer: nil, prayers: [], nextRefreshAtMs: 0)
let formatter = ISO8601DateFormatter()
let date = formatter.date(from: "2026-07-06T07:30:00Z")!
let day = WidgetPrayerCalculator.daySnapshot(snapshot: snapshot, date: date)
let output = ["dateKey": day.dateKey, "dhuhr": day.prayers.first(where: { $0.key == "dhuhr" })!.atMs] as [String: Any]
print(String(data: try! JSONSerialization.data(withJSONObject: output), encoding: .utf8)!)
`);
try {
  childProcess.execFileSync('swiftc', [sharedPath, calculatorPath, mainPath, '-o', binaryPath], { cwd: root, stdio: 'pipe' });
  const output = JSON.parse(childProcess.execFileSync(binaryPath, { encoding: 'utf8' }));
  const dhuhrLocal = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kabul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(output.dhuhr));
  assert(output.dateKey === '2026-07-06' && dhuhrLocal === '12:30', `native harness returned ${output.dateKey}/${dhuhrLocal}`);
} catch (error) {
  fail(`native calculator harness failed: ${error.stderr?.toString() || error.message}`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('[verify:ios-widget] OK (schema migration, Kabul/Herat/DST fixtures, boundaries, native harness)');
