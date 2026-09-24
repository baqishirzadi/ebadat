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
const { buildWidgetSnapshot, listWidgetTimelineBoundaries, parseWidgetSnapshot, refreshWidgetSnapshot } = require('../utils/widgetSnapshot.ts');
const { formatPrayerTime12h } = require('../utils/formatPrayerTime.ts');

const fixtures = [
  { name: 'Kabul', date: '2026-07-06', timezone: 'Asia/Kabul', latitude: 34.5553, longitude: 69.2075, altitude: 1791, offset: 5, fixedDhuhr: '12:30' },
  { name: 'Herat', date: '2026-12-25', timezone: 'Asia/Kabul', latitude: 34.3529, longitude: 62.2163, altitude: 920, offset: 5, fixedDhuhr: '12:30' },
  { name: 'New York DST', date: '2026-07-06', timezone: 'America/New_York', latitude: 40.7128, longitude: -74.006, altitude: 10, offset: 5, fixedDhuhr: null },
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
  assert(snapshot.version === 6, `${fixture.name}: expected schema version 6`);
  assert(snapshot.latitude === fixture.latitude && snapshot.longitude === fixture.longitude, `${fixture.name}: location was not persisted`);
  assert(snapshot.calculationMethod === 'Karachi' && snapshot.asrMethod === 'Hanafi', `${fixture.name}: policy was not persisted`);
  assert(!('hadithText' in snapshot) && !('hadithSource' in snapshot), `${fixture.name}: new widget snapshot retained Hadith fields`);
  assert(snapshot.gregorianDisplay.endsWith(fixture.date.slice(5, 7) === '07' ? 'JUL 2026' : 'DEC 2026'), `${fixture.name}: widget Gregorian date must use compact uppercase month codes`);
  const entries = entryMap(snapshot);
  assert(entries.maghrib.atMs - calculated.maghrib.getTime() === 300000, `${fixture.name}: widget must use raw + 300 seconds`);
  for (const key of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    assert(Number.isFinite(entries[key]?.atMs), `${fixture.name}: missing ${key}`);
  }
  if (fixture.fixedDhuhr) {
    const local = new Intl.DateTimeFormat('en-GB', { timeZone: fixture.timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(entries.dhuhr.atMs));
    assert(local === fixture.fixedDhuhr, `${fixture.name}: fixed Dhuhr is ${local}, expected ${fixture.fixedDhuhr}`);
  }
  const maghribLabel = entries.maghrib?.labelDari || '';
  assert(!maghribLabel.includes('+۳') && !maghribLabel.includes('+3'), `${fixture.name}: widget prayer label must not expose offset metadata`);

  const roundTrip = parseWidgetSnapshot(JSON.stringify(snapshot));
  assert(roundTrip?.version === 6 && roundTrip.latitude === fixture.latitude, `${fixture.name}: snapshot round-trip failed`);
  assert(!JSON.stringify(roundTrip).includes('hadithText'), `${fixture.name}: Hadith reappeared after snapshot round-trip`);
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
  gregorianDisplay: '6 JUL 2026',
  hadithText: 'legacy daily hadith',
  hadithSource: 'legacy source',
  prayers: [{ key: 'fajr', labelDari: 'صبح', time12h: '۴:۳۰', atMs: 1783336200000 }],
  nextRefreshAtMs: 1783336200000,
}));
assert(legacy?.version === 6 && legacy.latitude === 34.5553 && legacy.asrMethod === 'Hanafi', 'legacy snapshot migration failed');
assert(!JSON.stringify(legacy).includes('hadithText') && !JSON.stringify(legacy).includes('hadithSource'), 'legacy widget Hadith fields were not discarded');
assert(legacy?.gregorianDisplay === '6 JUL 2026', 'legacy widget snapshot did not migrate to compact Gregorian month codes');

const staleCalendarDisplaySnapshot = refreshWidgetSnapshot({
  ...legacy,
  days: [{
    ...legacy.days[0],
    dateKey: '2026-09-23',
    hijriDisplay: '۱۱ ربیع‌الثانی ۱۴۴۸',
    gregorianDisplay: '23 September 2026',
  }],
}, new Date('2026-09-23T12:00:00+04:30'));
assert(staleCalendarDisplaySnapshot.hijriDisplay === '١٠ ربیع‌الثانی ١٤٤٨', 'Android widget did not refresh its cached Afghanistan Hijri date');
assert(staleCalendarDisplaySnapshot.gregorianDisplay === '23 SEP 2026', 'Android widget did not refresh its cached Gregorian date');

const oldWorldMaghrib = buildDateFromLocalTimeInTimezone('2026-07-06', '19:02', 'America/New_York').getTime();
const staleWorldSnapshot = parseWidgetSnapshot(JSON.stringify({
  version: 3,
  updatedAt: '2026-07-06T12:00:00.000Z',
  cityName: 'New York',
  timezone: 'America/New_York',
  policyVersion: 4,
  latitude: 40.7128,
  longitude: -74.006,
  altitude: 10,
  calculationMethod: 'NorthAmerica',
  asrMethod: 'Standard',
  maghribOffsetMinutes: 0,
  days: [{
    dateKey: '2026-07-06', weekdayDari: '', shamsiDisplay: '', hijriDisplay: '',
    gregorianDisplay: '', sunriseDisplay: '', hadithText: 'h', hadithSource: 's',
    prayers: [{ key: 'maghrib', labelDari: 'شام', time12h: '7:02', atMs: oldWorldMaghrib }],
  }],
  prayers: [{ key: 'maghrib', labelDari: 'شام', time12h: '7:02', atMs: oldWorldMaghrib }],
  nextRefreshAtMs: oldWorldMaghrib,
}));
assert(staleWorldSnapshot?.prayers[0].atMs === oldWorldMaghrib + 300000, 'old non-Afghan widget snapshot was not migrated to global +5');
assert(staleWorldSnapshot?.days[0].prayers[0].atMs === oldWorldMaghrib + 300000, 'old widget day was not migrated to global +5');

const oldThreeMinuteSnapshot = parseWidgetSnapshot(JSON.stringify({
  version: 3,
  updatedAt: '2026-07-06T12:00:00.000Z',
  cityName: 'Kabul',
  timezone: 'Asia/Kabul',
  policyVersion: 5,
  latitude: 34.5553,
  longitude: 69.2075,
  altitude: 1791,
  calculationMethod: 'Karachi',
  asrMethod: 'Hanafi',
  maghribOffsetMinutes: 3,
  fixedDhuhrLocalTime: '12:30',
  days: [{
    dateKey: '2026-07-06', weekdayDari: '', shamsiDisplay: '', hijriDisplay: '',
    gregorianDisplay: '', sunriseDisplay: '', hadithText: 'h', hadithSource: 's',
    prayers: [{ key: 'maghrib', labelDari: 'شام', time12h: '7:05', atMs: oldWorldMaghrib + 180000 }],
  }],
  prayers: [{ key: 'maghrib', labelDari: 'شام', time12h: '7:05', atMs: oldWorldMaghrib + 180000 }],
  nextRefreshAtMs: oldWorldMaghrib + 180000,
}));
assert(oldThreeMinuteSnapshot?.prayers[0].atMs === oldWorldMaghrib + 300000, 'old +3 widget snapshot must receive only the missing two minutes');

const expiredHorizon = refreshWidgetSnapshot(
  parseWidgetSnapshot(JSON.stringify({ ...legacy, days: [legacy.days[0]] })) || legacy,
  new Date('2026-08-15T08:00:00.000Z'),
);
assert(!JSON.stringify(expiredHorizon).includes('hadithText'), 'widget refresh restored removed Hadith content');

const rolloverTimes = { fajr: '04:05', dhuhr: '12:30', asr: '16:05', maghrib: '19:02', isha: '20:32' };
const makeRolloverDay = (dateKey) => ({
  ...legacy.days[0],
  dateKey,
  prayers: Object.entries(rolloverTimes).map(([key, time]) => ({
    key,
    labelDari: key,
    time12h: time,
    atMs: buildDateFromLocalTimeInTimezone(dateKey, time, 'Asia/Kabul').getTime(),
  })),
});
const rolloverSnapshot = refreshWidgetSnapshot({
  ...legacy,
  version: 3,
  timezone: 'Asia/Kabul',
  days: [makeRolloverDay('2026-07-18'), makeRolloverDay('2026-07-19')],
}, buildDateFromLocalTimeInTimezone('2026-07-19', '00:30', 'Asia/Kabul'));
assert(rolloverSnapshot.currentPrayer === 'isha', 'Android widget lost previous-day Isha after midnight');
const fajrSnapshot = refreshWidgetSnapshot(
  rolloverSnapshot,
  buildDateFromLocalTimeInTimezone('2026-07-19', '04:05', 'Asia/Kabul'),
);
assert(fajrSnapshot.currentPrayer === 'fajr', 'Android widget did not switch highlight at Fajr');

const androidWidgetSource = fs.readFileSync(path.join(root, 'widgets', 'PrayerTimesWidget.tsx'), 'utf8');
assert(!androidWidgetSource.includes('snapshot.hadithText') && !androidWidgetSource.includes('حدیث روز'), 'Android widget still renders the daily Hadith strip');
assert(androidWidgetSource.includes('prayer.labelDari'), 'Android widget does not render the policy-labelled Maghrib entry');
assert(!androidWidgetSource.includes("justifyContent: 'space-between'"), 'Android widget still distributes a large sunrise/prayer gap');

const sharedPath = path.join(root, 'ios', 'EbadatPrayerWidget', 'WidgetShared.swift');
const calculatorPath = path.join(root, 'ios', 'EbadatPrayerWidget', 'WidgetPrayerCalculator.swift');
const sharedSource = fs.readFileSync(sharedPath, 'utf8');
const calculatorSource = fs.readFileSync(calculatorPath, 'utf8');
const widgetViewSource = fs.readFileSync(path.join(root, 'ios', 'EbadatPrayerWidget', 'PrayerTimesWidgetView.swift'), 'utf8');
assert(!widgetViewSource.includes('hadithText') && !widgetViewSource.includes('حدیث روز'), 'iOS widget still renders daily Hadith');
assert(!sharedSource.includes('hadithText') && !sharedSource.includes('hadithSource'), 'iOS widget snapshot still stores Hadith fields');
assert(sharedSource.includes('WidgetPrayerCalculator.daySnapshot'), 'WidgetShared does not calculate entries independently');
assert(sharedSource.includes('for offset in 0...14'), 'Widget timeline horizon is not bounded');
assert(calculatorSource.includes('islamicUmmAlQura') && calculatorSource.includes('Calendar(identifier: .persian)'), 'native calendar conversion is incomplete');
assert(!calculatorSource.includes(' +۳'), 'iOS fallback widget must not expose offset metadata in prayer labels');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ebadat-widget-'));
const mainPath = path.join(tempDir, 'main.swift');
const binaryPath = path.join(tempDir, 'widget-harness');
const moduleCachePath = path.join(tempDir, 'swift-module-cache');
fs.mkdirSync(moduleCachePath, { recursive: true });
fs.writeFileSync(mainPath, `import Foundation
let snapshot = WidgetSnapshot(version: 6, appLanguage: "pashto", updatedAt: "2026-07-06T08:00:00Z", cityName: "Kabul", timezone: "Asia/Kabul", policyVersion: 6, sourceLabel: "Karachi+AF", latitude: 34.5553, longitude: 69.2075, altitude: 1791, calculationMethod: "Karachi", asrMethod: "Hanafi", maghribOffsetMinutes: 5, fixedDhuhrLocalTime: "12:30", weekdayDari: "", shamsiDisplay: "", hijriDisplay: "", gregorianDisplay: "", currentPrayer: nil, prayers: [], nextRefreshAtMs: 0)
let formatter = ISO8601DateFormatter()
let date = formatter.date(from: "2026-07-06T07:30:00Z")!
let day = WidgetPrayerCalculator.daySnapshot(snapshot: snapshot, date: date)
let calculated = WidgetPrayerCalculator.calculate(snapshot: snapshot, date: date)
var rawObject = try! JSONSerialization.jsonObject(with: JSONEncoder().encode(snapshot)) as! [String: Any]
rawObject["maghribOffsetMinutes"] = 0
rawObject["hadithText"] = "old widget hadith"
rawObject["hadithSource"] = "old widget source"
let rawSnapshot = try! JSONDecoder().decode(WidgetSnapshot.self, from: JSONSerialization.data(withJSONObject: rawObject))
let reencodedRawSnapshot = try! JSONSerialization.jsonObject(with: JSONEncoder().encode(rawSnapshot)) as! [String: Any]
let strippedLegacyHadith = reencodedRawSnapshot["hadithText"] == nil && reencodedRawSnapshot["hadithSource"] == nil
let rawDay = WidgetPrayerCalculator.daySnapshot(snapshot: rawSnapshot, date: date)
let staleDay = WidgetDaySnapshot(dateKey: day.dateKey, weekdayDari: day.weekdayDari, shamsiDisplay: day.shamsiDisplay, hijriDisplay: "stale Hijri", gregorianDisplay: "6 July 2026", sunriseDisplay: day.sunriseDisplay, prayers: day.prayers.map { entry in
  entry.key == "maghrib"
    ? WidgetPrayerEntry(key: entry.key, labelDari: entry.labelDari, time12h: entry.time12h, atMs: entry.atMs - 120000)
    : entry
})
let staleSnapshot = WidgetSnapshot(version: 3, updatedAt: snapshot.updatedAt, cityName: "New York", timezone: "America/New_York", policyVersion: 5, sourceLabel: "MWL", latitude: 40.7128, longitude: -74.006, altitude: 10, calculationMethod: "NorthAmerica", asrMethod: "Standard", maghribOffsetMinutes: 3, fixedDhuhrLocalTime: nil, days: [staleDay], weekdayDari: day.weekdayDari, shamsiDisplay: day.shamsiDisplay, hijriDisplay: day.hijriDisplay, gregorianDisplay: day.gregorianDisplay, sunriseDisplay: day.sunriseDisplay, currentPrayer: nil, prayers: staleDay.prayers, nextRefreshAtMs: 0)
let migrated = WidgetShared.derivedSnapshot(from: staleSnapshot, at: date)
let septemberDate = formatter.date(from: "2026-09-23T07:30:00Z")!
let septemberDay = WidgetPrayerCalculator.daySnapshot(snapshot: snapshot, date: septemberDate)
let verifiedDate = formatter.date(from: "2026-06-26T07:30:00Z")!
let verifiedDay = WidgetPrayerCalculator.daySnapshot(snapshot: snapshot, date: verifiedDate)
let june27Day = WidgetPrayerCalculator.daySnapshot(snapshot: snapshot, date: formatter.date(from: "2026-06-27T07:30:00Z")!)
let september13Day = WidgetPrayerCalculator.daySnapshot(snapshot: snapshot, date: formatter.date(from: "2026-09-13T07:30:00Z")!)
let february17Day = WidgetPrayerCalculator.daySnapshot(snapshot: snapshot, date: formatter.date(from: "2026-02-17T07:30:00Z")!)
let april18Day = WidgetPrayerCalculator.daySnapshot(snapshot: snapshot, date: formatter.date(from: "2026-04-18T07:30:00Z")!)
let monthLabels = (1...12).map { month -> String in
  var calendar = Calendar(identifier: .gregorian)
  calendar.timeZone = TimeZone(identifier: "Asia/Kabul")!
  let monthDate = calendar.date(from: DateComponents(year: 2026, month: month, day: 15, hour: 12))!
  return WidgetPrayerCalculator.daySnapshot(snapshot: snapshot, date: monthDate).gregorianDisplay
}
let output = ["dateKey": day.dateKey, "gregorianDisplay": day.gregorianDisplay, "shamsiDisplayPashto": day.shamsiDisplayPashto ?? "", "hijriDisplay": day.hijriDisplay, "migratedHijriDisplay": migrated.hijriDisplay, "migratedGregorianDisplay": migrated.gregorianDisplay, "septemberHijriDisplay": septemberDay.hijriDisplay, "septemberGregorianDisplay": septemberDay.gregorianDisplay, "verifiedHijriDisplay": verifiedDay.hijriDisplay, "june27HijriDisplay": june27Day.hijriDisplay, "september13HijriDisplay": september13Day.hijriDisplay, "february17HijriDisplay": february17Day.hijriDisplay, "april18HijriDisplay": april18Day.hijriDisplay, "monthLabels": monthLabels, "dhuhr": day.prayers.first(where: { $0.key == "dhuhr" })!.atMs, "maghrib": day.prayers.first(where: { $0.key == "maghrib" })!.atMs, "rawMaghrib": calculated.rawMaghrib.timeIntervalSince1970 * 1000, "zeroOffsetMaghrib": rawDay.prayers.first(where: { $0.key == "maghrib" })!.atMs, "migratedMaghrib": migrated.prayers.first(where: { $0.key == "maghrib" })!.atMs, "strippedLegacyHadith": strippedLegacyHadith, "maghribLabel": day.prayers.first(where: { $0.key == "maghrib" })!.labelDari] as [String: Any]
print(String(data: try! JSONSerialization.data(withJSONObject: output), encoding: .utf8)!)
`);
try {
  childProcess.execFileSync('swiftc', [sharedPath, calculatorPath, mainPath, '-module-cache-path', moduleCachePath, '-o', binaryPath], { cwd: root, stdio: 'pipe' });
  const output = JSON.parse(childProcess.execFileSync(binaryPath, { encoding: 'utf8' }));
  const dhuhrLocal = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kabul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(output.dhuhr));
  assert(output.dateKey === '2026-07-06' && dhuhrLocal === '12:30', `native harness returned ${output.dateKey}/${dhuhrLocal}`);
  assert(output.gregorianDisplay === '6 JUL 2026', `iOS fallback returned long Gregorian month ${output.gregorianDisplay}`);
  assert(output.shamsiDisplayPashto === '۱۵ چنګاښ ۱۴۰۵', `iOS widget did not render the Pashto Solar Hijri month: ${output.shamsiDisplayPashto}`);
  assert(output.migratedGregorianDisplay === '6 JUL 2026', 'iOS widget did not refresh a cached long Gregorian date');
  assert(output.migratedHijriDisplay === output.hijriDisplay, 'iOS widget did not refresh a cached Hijri date');
  assert(output.septemberGregorianDisplay === '23 SEP 2026', `iOS fallback returned ${output.septemberGregorianDisplay} for September 23`);
  assert(output.septemberHijriDisplay === '۱۰ ربیع‌الثانی ۱۴۴۸', `iOS fallback returned ${output.septemberHijriDisplay} for September 23`);
  assert(output.verifiedHijriDisplay === '۱۰ محرم ۱۴۴۸', `iOS widget did not honor the verified Afghan Hijri date: ${output.verifiedHijriDisplay}`);
  assert(output.june27HijriDisplay === '۱۱ محرم ۱۴۴۸', `iOS widget has a discontinuity after the verified Afghan date range: ${output.june27HijriDisplay}`);
  assert(output.september13HijriDisplay === '۳۰ ربیع‌الاول ۱۴۴۸', `iOS widget returned an unexpected Hijri boundary date: ${output.september13HijriDisplay}`);
  assert(output.february17HijriDisplay === '۲۹ شعبان ۱۴۴۷', `iOS widget has a discontinuity before Ramadan: ${output.february17HijriDisplay}`);
  assert(output.april18HijriDisplay === '۱ ذوالقعده ۱۴۴۷', `iOS widget has a discontinuity after Shawwal: ${output.april18HijriDisplay}`);
  assert(JSON.stringify(output.monthLabels) === JSON.stringify(['15 JAN 2026', '15 FEB 2026', '15 MAR 2026', '15 APR 2026', '15 MAY 2026', '15 JUN 2026', '15 JUL 2026', '15 AUG 2026', '15 SEP 2026', '15 OCT 2026', '15 NOV 2026', '15 DEC 2026']), 'iOS widget month-code coverage is incomplete');
  assert(output.strippedLegacyHadith, 'iOS widget snapshot did not discard legacy Hadith fields');
  assert(output.maghrib - output.rawMaghrib === 300000, 'iOS fallback widget must schedule Maghrib exactly 300 seconds after raw time');
  assert(output.maghrib === output.zeroOffsetMaghrib, 'iOS global fallback must not depend on the stored country offset');
  assert(output.migratedMaghrib === output.maghrib, 'iOS must migrate an old +3 canonical widget time by only the missing two minutes');
  assert(output.maghribLabel === 'شام', 'iOS fallback widget must show only the prayer name');
} catch (error) {
  fail(`native calculator harness failed: ${error.stderr?.toString() || error.message}`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('[verify:ios-widget] OK (schema migration, Kabul/Herat/DST fixtures, boundaries, native harness)');
