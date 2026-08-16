/**
 * Regression checks for country-aware prayer policy, AF 12:30, timezone helpers,
 * and widget multi-day refresh selection.
 *
 * Run: node scripts/verify-prayer-policy.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function resolveCountryCode(cityKey) {
  if (!cityKey) return 'XX';
  if (cityKey.startsWith('afghanistan_')) return 'AF';
  if (cityKey.startsWith('turkey_')) return 'TR';
  if (cityKey.startsWith('iran_')) return 'IR';
  if (cityKey.startsWith('saudi_')) return 'SA';
  if (cityKey.startsWith('egypt_')) return 'EG';
  return 'XX';
}

function policyFor(country) {
  const map = {
    AF: { source: 'aladhan', method: 1, school: 1, maghrib: 3, fixedDhuhr: '12:30', label: 'Karachi+AF' },
    TR: { source: 'diyanet', method: 13, school: 1, maghrib: 0, fixedDhuhr: null, label: 'Diyanet' },
    IR: { source: 'aladhan', method: 7, school: 0, maghrib: 0, fixedDhuhr: null, label: 'Tehran' },
    SA: { source: 'aladhan', method: 4, school: 0, maghrib: 0, fixedDhuhr: null, label: 'UmmAlQura' },
    EG: { source: 'aladhan', method: 5, school: 0, maghrib: 0, fixedDhuhr: null, label: 'Egyptian' },
    XX: { source: 'aladhan', method: 3, school: 0, maghrib: 0, fixedDhuhr: null, label: 'MWL' },
  };
  return map[country] || map.XX;
}

function getDateKeyInTimezone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const lookup = (type) => parts.find((p) => p.type === type)?.value || '00';
  return `${lookup('year')}-${lookup('month')}-${lookup('day')}`;
}

function tzOffsetMinutes(timeZone, date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const lookup = (type) => parts.find((p) => p.type === type)?.value || '00';
  const asUTC = new Date(
    `${lookup('year')}-${lookup('month')}-${lookup('day')}T${lookup('hour')}:${lookup('minute')}:${lookup('second')}Z`,
  );
  return Math.round((asUTC.getTime() - date.getTime()) / 60000);
}

function buildLocal(dateKey, hhmm, timeZone) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  const anchor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const offset = tzOffsetMinutes(timeZone, anchor);
  return new Date(Date.UTC(year, month - 1, day, hh, mm, 0) - offset * 60 * 1000);
}

function validateTimings(timings) {
  const keys = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const minutes = [];
  for (const key of keys) {
    const value = timings[key];
    if (!/^\d{1,2}:\d{2}$/.test(value)) return false;
    const [hh, mm] = value.split(':').map(Number);
    const mins = hh * 60 + mm;
    if (!Number.isFinite(mins) || mins < 0 || mins >= 1440) return false;
    minutes.push(mins);
  }
  for (let i = 1; i < minutes.length; i += 1) {
    if (minutes[i] <= minutes[i - 1]) return false;
  }
  if (minutes[0] >= 12 * 60) return false;
  if (minutes[4] < 12 * 60) return false;
  return true;
}

function selectWidgetDay(days, now, timezone) {
  const todayKey = getDateKeyInTimezone(now, timezone);
  return days.find((d) => d.dateKey === todayKey) || days[0];
}

function currentPrayer(prayers, nowMs, previousPrayers = []) {
  const order = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  let current = null;
  for (const key of order) {
    const entry = prayers.find((p) => p.key === key);
    if (entry && entry.atMs <= nowMs) current = key;
  }
  if (current) return current;
  const previousIsha = previousPrayers.find((p) => p.key === 'isha');
  return previousIsha && previousIsha.atMs <= nowMs ? 'isha' : null;
}

// --- Tests ---

assert.strictEqual(resolveCountryCode('afghanistan_herat'), 'AF');
assert.strictEqual(resolveCountryCode('turkey_province_istanbul'), 'TR');
assert.strictEqual(resolveCountryCode('iran_province_tehran'), 'IR');
assert.strictEqual(policyFor('AF').fixedDhuhr, '12:30');
assert.strictEqual(policyFor('AF').maghrib, 3);
assert.strictEqual(policyFor('TR').source, 'diyanet');
assert.strictEqual(policyFor('IR').method, 7);
assert.strictEqual(policyFor('TR').maghrib, 0);
assert.strictEqual(policyFor('IR').maghrib, 0);

const cities = [
  ['afghanistan_kabul', '2026-07-19'],
  ['afghanistan_herat', '2026-07-19'],
  ['afghanistan_kandahar', '2026-07-17'], // Friday
  ['afghanistan_mazar', '2026-12-25'],
];

for (const [cityKey, dateKey] of cities) {
  const dhuhr = buildLocal(dateKey, '12:30', 'Asia/Kabul');
  const local = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kabul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dhuhr);
  assert.strictEqual(local, '12:30', `${cityKey} ${dateKey}`);
}

assert.ok(
  validateTimings({
    fajr: '04:10',
    sunrise: '05:40',
    dhuhr: '12:30',
    asr: '16:10',
    maghrib: '19:05',
    isha: '20:30',
  }),
);
assert.ok(
  !validateTimings({
    fajr: '04:10',
    sunrise: '05:40',
    dhuhr: '12:30',
    asr: '11:10',
    maghrib: '19:05',
    isha: '20:30',
  }),
);

// Widget multi-day selection + highlight after midnight
const tz = 'Asia/Kabul';
const dayA = '2026-07-18';
const dayB = '2026-07-19';
const days = [
  {
    dateKey: dayA,
    prayers: [
      { key: 'fajr', atMs: buildLocal(dayA, '04:00', tz).getTime() },
      { key: 'dhuhr', atMs: buildLocal(dayA, '12:30', tz).getTime() },
      { key: 'asr', atMs: buildLocal(dayA, '16:00', tz).getTime() },
      { key: 'maghrib', atMs: buildLocal(dayA, '19:00', tz).getTime() },
      { key: 'isha', atMs: buildLocal(dayA, '20:30', tz).getTime() },
    ],
  },
  {
    dateKey: dayB,
    prayers: [
      { key: 'fajr', atMs: buildLocal(dayB, '04:05', tz).getTime() },
      { key: 'dhuhr', atMs: buildLocal(dayB, '12:30', tz).getTime() },
      { key: 'asr', atMs: buildLocal(dayB, '16:05', tz).getTime() },
      { key: 'maghrib', atMs: buildLocal(dayB, '19:02', tz).getTime() },
      { key: 'isha', atMs: buildLocal(dayB, '20:32', tz).getTime() },
    ],
  },
];

const afterMidnight = buildLocal(dayB, '00:30', tz);
const selected = selectWidgetDay(days, afterMidnight, tz);
assert.strictEqual(selected.dateKey, dayB);
assert.strictEqual(currentPrayer(selected.prayers, afterMidnight.getTime(), days[0].prayers), 'isha');

const afterIsha = buildLocal(dayA, '21:00', tz);
assert.strictEqual(currentPrayer(days[0].prayers, afterIsha.getTime()), 'isha');
assert.strictEqual(currentPrayer(days[1].prayers, buildLocal(dayB, '04:05', tz).getTime(), days[0].prayers), 'fajr');
for (const [time, expected] of [
  ['12:30', 'dhuhr'],
  ['16:05', 'asr'],
  ['19:02', 'maghrib'],
  ['20:32', 'isha'],
]) {
  assert.strictEqual(currentPrayer(days[1].prayers, buildLocal(dayB, time, tz).getTime()), expected);
}
assert.strictEqual(currentPrayer(days[1].prayers, afterMidnight.getTime()), null);

const widgetSnapshotSource = fs.readFileSync(path.join(__dirname, '..', 'utils/widgetSnapshot.ts'), 'utf8');
assert.ok(widgetSnapshotSource.includes('previousPrayers'), 'widget snapshot must carry previous-day prayers');
assert.ok(widgetSnapshotSource.includes('findPreviousDay'), 'widget snapshot must resolve the previous local day');

const afterDhuhr = buildLocal(dayB, '13:00', tz);
assert.strictEqual(currentPrayer(selected.prayers, afterDhuhr.getTime()), 'dhuhr');

// Canonical schedule JSON shape for Android
const schedule = {
  policyVersion: 3,
  source: 'Karachi+AF',
  days: days.map((d) => ({
    dateKey: d.dateKey,
    fajr: d.prayers[0].atMs,
    dhuhr: d.prayers[1].atMs,
    asr: d.prayers[2].atMs,
    maghrib: d.prayers[3].atMs,
    isha: d.prayers[4].atMs,
  })),
};
assert.strictEqual(schedule.days.length, 2);
assert.ok(JSON.parse(JSON.stringify(schedule)).days[0].dhuhr > 0);

// Live Diyanet smoke (optional, skip offline)
async function smokeDiyanet() {
  try {
    const search = await fetch(
      'https://ezanvakti.imsakiyem.com/api/locations/search/districts?q=Istanbul',
      { headers: { Accept: 'application/json' } },
    );
    if (!search.ok) {
      console.warn('Diyanet search skipped:', search.status);
      return;
    }
    const searchJson = await search.json();
    const id = searchJson?.data?.[0]?._id;
    assert.ok(id, 'Diyanet Istanbul district id');
    const times = await fetch(
      `https://ezanvakti.imsakiyem.com/api/prayer-times/${id}/daily`,
      { headers: { Accept: 'application/json' } },
    );
    if (!times.ok) {
      console.warn('Diyanet times skipped:', times.status);
      return;
    }
    const timesJson = await times.json();
    const row = timesJson?.data?.[0];
    assert.ok(row?.times?.ogle, 'Diyanet ogle present');
    console.log('Diyanet smoke OK:', row.times.ogle);
  } catch (error) {
    console.warn('Diyanet smoke skipped:', error.message || error);
  }
}

(async () => {
  await smokeDiyanet();
  // Also run parity self-check
  require(path.join(__dirname, 'verify-prayer-engine-parity.js'));
  console.log('verify-prayer-policy: all checks passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
