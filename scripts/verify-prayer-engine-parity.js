/**
 * Generates parity fixtures from the JS adhan library for native PrayerTimeEngine tests.
 * Afghanistan: Maghrib +3, Dhuhr fixed 12:30 (including Friday). No global Friday 13:00.
 * Run: node scripts/verify-prayer-engine-parity.js
 */

const { Coordinates, CalculationMethod, PrayerTimes, Madhab } = require('adhan');

const FIXTURES = [
  { cityKey: 'afghanistan_kabul', lat: 34.5553, lon: 69.2075, tz: 'Asia/Kabul', date: '2026-07-06', country: 'AF' },
  { cityKey: 'afghanistan_herat', lat: 34.3482, lon: 62.1997, tz: 'Asia/Kabul', date: '2026-07-06', country: 'AF' },
  { cityKey: 'afghanistan_kandahar', lat: 31.6289, lon: 65.7372, tz: 'Asia/Kabul', date: '2026-12-25', country: 'AF' },
  { cityKey: 'afghanistan_kabul', lat: 34.5553, lon: 69.2075, tz: 'Asia/Kabul', date: '2026-07-17', country: 'AF' }, // Friday
  { cityKey: 'pakistan_karachi', lat: 24.8607, lon: 67.0011, tz: 'Asia/Karachi', date: '2026-07-06', country: 'PK' },
];

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

function computeJsTimes(fixture) {
  const [year, month, day] = fixture.date.split('-').map(Number);
  const coordinates = new Coordinates(fixture.lat, fixture.lon);
  const params = CalculationMethod.Karachi();
  params.madhab = Madhab.Hanafi;
  const times = new PrayerTimes(coordinates, new Date(year, month - 1, day, 12), params);

  let maghrib = times.maghrib;
  let dhuhr = times.dhuhr;

  if (fixture.country === 'AF') {
    maghrib = new Date(maghrib.getTime() + 3 * 60 * 1000);
    dhuhr = buildLocal(fixture.date, '12:30', fixture.tz);
  }

  return {
    fajr: times.fajr.getTime(),
    dhuhr: dhuhr.getTime(),
    asr: times.asr.getTime(),
    maghrib: maghrib.getTime(),
    isha: times.isha.getTime(),
  };
}

const output = FIXTURES.map((fixture) => ({
  ...fixture,
  expectedMs: computeJsTimes(fixture),
}));

console.log(JSON.stringify(output, null, 2));

// Self-check: Afghan Dhuhr must be 12:30 local.
for (const row of output) {
  if (row.country !== 'AF') continue;
  const local = new Intl.DateTimeFormat('en-GB', {
    timeZone: row.tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(row.expectedMs.dhuhr));
  if (local !== '12:30') {
    console.error(`FAIL ${row.cityKey} ${row.date}: dhuhr=${local}`);
    process.exitCode = 1;
  }
}
