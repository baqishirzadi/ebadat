/**
 * Static/astronomical regression checks for the global Maghrib delay policy.
 * Run with: node scripts/verify-afghanistan-adhan-policy.js
 */

const assert = require('assert');
const fs = require('fs');
const Module = require('module');
const path = require('path');
const ts = require('typescript');
const { Coordinates, CalculationMethod, Madhab, PrayerTimes } = require('adhan');

const root = path.resolve(__dirname, '..');

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    return originalResolveFilename.call(this, path.join(root, request.slice(2)), parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions['.ts'] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const { applyPrayerTimeOffsets } = require('../utils/prayerOffsets.ts');
const { resolvePrayerCalculationPolicy } = require('../utils/prayerCalculationPolicy.ts');
const { canReuseRawPrayerCache } = require('../utils/prayerCalculationPolicy.ts');
const { displayPrayerLabel } = require('../utils/prayerCalculationPolicy.ts');
const { formatPrayerTime12h } = require('../utils/formatPrayerTime.ts');
const policySource = fs.readFileSync(path.join(root, 'utils/prayerCalculationPolicy.ts'), 'utf8');
const scheduleSource = fs.readFileSync(path.join(root, 'utils/adhanSchedulePolicy.ts'), 'utf8');

assert.match(policySource, /PRAYER_POLICY_VERSION\s*=\s*6/);
assert.match(policySource, /maghribOffsetMinutes:\s*MAGHRIB_OFFSET_MINUTES/);
assert.match(scheduleSource, /ANDROID_ADHAN_ROLLING_DAYS\s*=\s*7/);
assert.match(scheduleSource, /ADHAN_SCHEDULE_POLICY_VERSION\s*=\s*3/);
assert.match(scheduleSource, /MAGHRIB_OFFSET_MINUTES\s*=\s*5/);
assert.match(scheduleSource, /MAGHRIB_OFFSET_MS/);
assert.strictEqual(canReuseRawPrayerCache('p5_AF_Karachi+AF', 'p6_AF_Karachi+AF'), true, 'raw API cache should survive an offset-only policy version bump');
assert.strictEqual(canReuseRawPrayerCache('p4_AF_Karachi+AF', 'p5_US_ISNA'), false, 'raw API cache must not survive country/source changes');

const fixtures = [
  ['afghanistan_kabul', 34.5553, 69.2075, '2026-09-22', 'AF', 'Asia/Kabul'],
  ['afghanistan_herat', 34.3482, 62.1997, '2026-09-30', 'AF', 'Asia/Kabul'],
  ['pakistan_karachi', 24.8607, 67.0011, '2026-10-01', 'PK', 'Asia/Karachi'],
  ['usa_new_york', 40.7128, -74.006, '2026-12-31', 'US', 'America/New_York'],
  ['custom_unknown_gps', 35.6762, 139.6503, '2027-01-01', 'ZZ', 'Asia/Tokyo'],
  ['custom_gps_no_country', -33.8688, 151.2093, '2027-01-02', undefined, 'Australia/Sydney'],
];

function rawMaghrib(lat, lon, dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const params = CalculationMethod.Karachi();
  params.madhab = Madhab.Hanafi;
  return new PrayerTimes(new Coordinates(lat, lon), new Date(year, month - 1, day, 12), params)
    .maghrib.getTime();
}

for (const [name, lat, lon, dateKey, countryCode, timezone] of fixtures) {
  const raw = rawMaghrib(lat, lon, dateKey);
  const location = {
    latitude: lat,
    longitude: lon,
    timezone,
    countryCode,
  };
  const rawTimes = {
    fajr: new Date(raw - 7 * 60 * 60 * 1000),
    sunrise: new Date(raw - 5 * 60 * 60 * 1000),
    dhuhr: new Date(raw - 2 * 60 * 60 * 1000),
    asr: new Date(raw - 60 * 60 * 1000),
    maghrib: new Date(raw),
    isha: new Date(raw + 2 * 60 * 60 * 1000),
    midnight: new Date(raw + 7 * 60 * 60 * 1000),
    qiyam: new Date(raw + 8 * 60 * 60 * 1000),
  };
  const adjusted = applyPrayerTimeOffsets(rawTimes, name, location);
  const scheduled = adjusted.maghrib.getTime();
  assert.strictEqual(scheduled - raw, 300000, `${name} must use exactly +5 minutes`);
  for (const key of ['fajr', 'sunrise', 'asr', 'isha', 'midnight', 'qiyam']) {
    assert.strictEqual(adjusted[key].getTime(), rawTimes[key].getTime(), `${name} must not adjust ${key}`);
  }
  if (countryCode !== 'AF') {
    assert.strictEqual(adjusted.dhuhr.getTime(), rawTimes.dhuhr.getTime(), `${name} must preserve non-Afghan Dhuhr`);
  }
  assert.strictEqual(resolvePrayerCalculationPolicy(name, location).maghribOffsetMinutes, 5, `${name} policy must be global`);
}

const alreadyAdjusted = new Date(rawMaghrib(34.5553, 69.2075, '2026-09-22') + 300000);
const canonicalPolicy = resolvePrayerCalculationPolicy('afghanistan_kabul', {
  latitude: 34.5553,
  longitude: 69.2075,
  timezone: 'Asia/Kabul',
  countryCode: 'AF',
});
assert.strictEqual(canonicalPolicy.maghribOffsetMinutes, 5, 'global policy must be +5 minutes');
assert.strictEqual(alreadyAdjusted.getTime() - rawMaghrib(34.5553, 69.2075, '2026-09-22'), 300000);
assert.strictEqual(displayPrayerLabel('maghrib', 'شام', 'afghanistan_kabul', canonicalPolicy), 'شام');
const apiTime = new Date('2026-09-23T13:22:00.000Z'); // 5:52 PM in Kabul.
const adjustedApiTimes = applyPrayerTimeOffsets({
  fajr: new Date(apiTime.getTime() - 12 * 60 * 60 * 1000),
  sunrise: new Date(apiTime.getTime() - 10 * 60 * 60 * 1000),
  dhuhr: new Date(apiTime.getTime() - 5 * 60 * 60 * 1000),
  asr: new Date(apiTime.getTime() - 2 * 60 * 60 * 1000),
  maghrib: apiTime,
  isha: new Date(apiTime.getTime() + 2 * 60 * 60 * 1000),
  midnight: new Date(apiTime.getTime() + 6 * 60 * 60 * 1000),
  qiyam: new Date(apiTime.getTime() + 7 * 60 * 60 * 1000),
}, 'afghanistan_kabul', {
  latitude: 34.5553,
  longitude: 69.2075,
  timezone: 'Asia/Kabul',
  countryCode: 'AF',
});
const displayTime = adjustedApiTimes.maghrib;
assert.strictEqual(formatPrayerTime12h(apiTime, 'Asia/Kabul'), '٥:٥٢');
assert.strictEqual(formatPrayerTime12h(displayTime, 'Asia/Kabul'), '٥:٥٧');

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

for (const start of ['2026-09-29', '2026-12-30', '2027-12-30']) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  assert.strictEqual(days.length, 7);
  assert.strictEqual(new Set(days).size, 7);
}

console.log(`PASS global Maghrib policy: ${fixtures.length} worldwide fixtures, exact +300000ms offset, unaffected other prayers`);
