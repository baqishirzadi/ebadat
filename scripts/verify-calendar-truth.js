#!/usr/bin/env node

const KABUL_TIME_ZONE = 'Asia/Kabul';

const AFGHAN_HIJRI_CORRECTIONS = [
  {
    startGregorian: '2026-03-19',
    shiftDays: 1,
  },
];

function pad(value) {
  return String(value).padStart(2, '0');
}

function getKabulDateParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KABUL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(date);

  const lookup = (type) => parts.find((part) => part.type === type)?.value;
  const weekdayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const year = Number.parseInt(lookup('year') || '', 10);
  const month = Number.parseInt(lookup('month') || '', 10);
  const day = Number.parseInt(lookup('day') || '', 10);
  const weekday = weekdayMap[lookup('weekday') || ''];

  return {
    year,
    month,
    day,
    weekday,
    dateKey: `${year}-${pad(month)}-${pad(day)}`,
  };
}

function getKabulNoon(date) {
  const { year, month, day } = getKabulDateParts(date);
  return new Date(`${year}-${pad(month)}-${pad(day)}T12:00:00+04:30`);
}

function addDaysToKabulDate(date, days) {
  const shifted = new Date(getKabulNoon(date));
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

function compareDateKeys(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function getHijriCorrectionShift(date) {
  const dateKey = getKabulDateParts(date).dateKey;
  const range = AFGHAN_HIJRI_CORRECTIONS.find((entry) => {
    if (compareDateKeys(dateKey, entry.startGregorian) < 0) return false;
    if (!entry.endGregorian) return true;
    return compareDateKeys(dateKey, entry.endGregorian) <= 0;
  });

  return range?.shiftDays ?? 0;
}

function gregorianToBaseHijri(date) {
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
    timeZone: KABUL_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const lookup = (type) => parts.find((part) => part.type === type)?.value;

  return {
    year: Number.parseInt(lookup('year') || '', 10),
    month: Number.parseInt(lookup('month') || '', 10),
    day: Number.parseInt(lookup('day') || '', 10),
  };
}

function gregorianToHijri(date) {
  const kabulDate = getKabulNoon(date);
  const shiftDays = getHijriCorrectionShift(kabulDate);
  const sourceDate = shiftDays === 0 ? kabulDate : addDaysToKabulDate(kabulDate, shiftDays);
  return gregorianToBaseHijri(sourceDate);
}

function gregorianToShamsi(date) {
  const parts = new Intl.DateTimeFormat('en-u-ca-persian', {
    timeZone: KABUL_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const lookup = (type) => parts.find((part) => part.type === type)?.value;

  return {
    year: Number.parseInt(lookup('year') || '', 10),
    month: Number.parseInt(lookup('month') || '', 10),
    day: Number.parseInt(lookup('day') || '', 10),
  };
}

function hijriToGregorian(targetYear, targetMonth, targetDay) {
  const center = getKabulNoon(new Date('2026-04-16T12:00:00+04:30'));
  for (let offset = -500; offset <= 500; offset += 1) {
    const candidate = addDaysToKabulDate(center, offset);
    const hijri = gregorianToHijri(candidate);
    if (
      hijri.year === targetYear &&
      hijri.month === targetMonth &&
      hijri.day === targetDay
    ) {
      return candidate;
    }
  }

  return null;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const targetDate = getKabulNoon(new Date('2026-04-16T12:00:00+04:30'));
  const hijri = gregorianToHijri(targetDate);
  const shamsi = gregorianToShamsi(targetDate);
  const weekday = getKabulDateParts(targetDate).weekday;

  assert(weekday === 4, `Expected weekday index 4 (Thursday), received ${weekday}`);
  assert(hijri.year === 1447 && hijri.month === 10 && hijri.day === 29,
    `Expected Hijri 1447/10/29, received ${hijri.year}/${hijri.month}/${hijri.day}`);
  assert(shamsi.year === 1405 && shamsi.month === 1 && shamsi.day === 27,
    `Expected Shamsi 1405/01/27, received ${shamsi.year}/${shamsi.month}/${shamsi.day}`);

  const shawwal29 = hijriToGregorian(1447, 10, 29);
  assert(shawwal29, 'Could not resolve Gregorian date for 1447/10/29');
  assert(getKabulDateParts(shawwal29).dateKey === '2026-04-16',
    `Expected 1447/10/29 -> 2026-04-16, received ${getKabulDateParts(shawwal29).dateKey}`);

  const shawwal1 = hijriToGregorian(1447, 10, 1);
  assert(shawwal1, 'Could not resolve Gregorian date for 1447/10/1');
  const firstDayOffset = (getKabulDateParts(shawwal1).weekday + 1) % 7;
  const day29Column = (firstDayOffset + 28) % 7;
  assert(day29Column === 5, `Expected Shawwal day 29 to land in Thursday column (5), received ${day29Column}`);

  console.log('Calendar truth verified: 2026-04-16 => Thursday / 29 Shawwal 1447 / 27 Hamal 1405');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
