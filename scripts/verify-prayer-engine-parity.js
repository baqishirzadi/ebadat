/**
 * Generates parity fixtures from the JS adhan library for native PrayerTimeEngine tests.
 * Run: node scripts/verify-prayer-engine-parity.js
 */

const { Coordinates, CalculationMethod, PrayerTimes, Madhab } = require('adhan');

const FIXTURES = [
  { cityKey: 'afghanistan_kabul', lat: 34.5553, lon: 69.2075, date: '2026-07-06' },
  { cityKey: 'afghanistan_herat', lat: 34.3482, lon: 62.1997, date: '2026-07-06' },
  { cityKey: 'afghanistan_kandahar', lat: 31.6289, lon: 65.7372, date: '2026-12-25' },
];

function computeJsTimes(lat, lon, dateKey, cityKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const coordinates = new Coordinates(lat, lon);
  const params = CalculationMethod.Karachi();
  params.madhab = Madhab.Hanafi;
  const times = new PrayerTimes(coordinates, new Date(year, month - 1, day), params);
  let maghrib = times.maghrib;
  if (cityKey.startsWith('afghanistan_')) {
    maghrib = new Date(maghrib.getTime() + 4 * 60 * 1000);
  }
  const weekday = new Date(year, month - 1, day).getDay();
  let dhuhr = times.dhuhr;
  if (weekday === 5) {
    dhuhr = new Date(year, month - 1, day, 13, 0, 0, 0);
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
  expectedMs: computeJsTimes(fixture.lat, fixture.lon, fixture.date, fixture.cityKey),
}));

console.log(JSON.stringify(output, null, 2));
