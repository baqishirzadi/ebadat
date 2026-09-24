import type { AppLanguage } from '@/types/quran';
import { KABUL_TIME_ZONE, getKabulNoon, getKabulDateParts } from '@/utils/afghanistanCalendar';
import { getLanguage } from '@/utils/i18n/languages';

/**
 * Afghan Solar Hijri (Shamsi) Calendar Utilities
 * Afghan calendar uses traditional month names (حمل، ثور، جوزا...)
 * Different from Iranian calendar month names
 */

export interface AfghanSolarHijriDate {
  year: number;
  month: number;
  day: number;
  monthNameDari: string;
  monthNamePashto: string;
  monthNameEnglish: string;
}

// Afghan Solar Hijri month names (traditional astronomical names)
export const AFGHAN_SOLAR_MONTHS = [
  { dari: 'حمل', pashto: 'وری', english: 'Hamal' }, // March 21 - April 20
  { dari: 'ثور', pashto: 'غویی', english: 'Sawr' }, // April 21 - May 21
  { dari: 'جوزا', pashto: 'غبرګولی', english: 'Jawza' }, // May 22 - June 21
  { dari: 'سرطان', pashto: 'چنګاښ', english: 'Saratan' }, // June 22 - July 22
  { dari: 'اسد', pashto: 'زمری', english: 'Asad' }, // July 23 - August 22
  { dari: 'سنبله', pashto: 'وږی', english: 'Sonbola' }, // August 23 - September 22
  { dari: 'میزان', pashto: 'تله', english: 'Mizan' }, // September 23 - October 22
  { dari: 'عقرب', pashto: 'لړم', english: 'Aqrab' }, // October 23 - November 21
  { dari: 'قوس', pashto: 'ليندۍ', english: 'Qaws' }, // November 22 - December 21
  { dari: 'جدی', pashto: 'مرغومی', english: 'Jadi' }, // December 22 - January 20
  { dari: 'دلو', pashto: 'سلواغه', english: 'Dalw' }, // January 21 - February 19
  { dari: 'حوت', pashto: 'كب', english: 'Hut' }, // February 20 - March 20
];

/** Solar Hijri leap years in the 33-year cycle. */
const SHAMSI_LEAP_CYCLE = new Set([1, 5, 9, 13, 17, 22, 26, 30]);

/** Persian calendar epoch (approx JD of 1 Farvardin 1). */
const PERSIAN_EPOCH_JD = 1948320.5;

const SHAMSI_FROM_GREGORIAN_CACHE = new Map<string, AfghanSolarHijriDate>();
const SHAMSI_TO_GREGORIAN_CACHE = new Map<string, number | null>();

let persianFormatter: Intl.DateTimeFormat | null = null;

function getPersianFormatter(): Intl.DateTimeFormat | null {
  if (persianFormatter) return persianFormatter;
  try {
    persianFormatter = new Intl.DateTimeFormat('en-u-ca-persian', {
      timeZone: KABUL_TIME_ZONE,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    return persianFormatter;
  } catch {
    return null;
  }
}

function isShamsiLeapYear(year: number): boolean {
  return SHAMSI_LEAP_CYCLE.has((year - 1) % 33);
}

function getShamsiMonthLengths(year: number): number[] {
  return [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, isShamsiLeapYear(year) ? 30 : 29];
}

function julianDayFromGregorian(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function gregorianFromJulianDay(jd: number): { year: number; month: number; day: number } {
  const z = Math.floor(jd + 0.5);
  const a = Math.floor((z - 1867216.25) / 36524.25);
  const aa = z + 1 + a - Math.floor(a / 4);
  const b = aa + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  return { year, month, day };
}

/**
 * Convert Gregorian date to Afghan Solar Hijri (Shamsi)
 * Uses the standard Solar Hijri (Persian calendar) conversion algorithm
 */
function gregorianToAfghanSolarHijriFallback(date: Date): AfghanSolarHijriDate {
  const gregorianYear = date.getFullYear();
  const gregorianMonth = date.getMonth() + 1; // 1-12
  const gregorianDay = date.getDate();

  const jd = julianDayFromGregorian(gregorianYear, gregorianMonth, gregorianDay);
  let daysSinceEpoch = jd - PERSIAN_EPOCH_JD;

  let solarHijriYear = Math.floor((daysSinceEpoch - 0.5) / 365.2424) + 1;
  let dayOfYear = daysSinceEpoch - (solarHijriYear - 1) * 365.2424;

  const monthLengths = getShamsiMonthLengths(solarHijriYear);
  const yearLength = isShamsiLeapYear(solarHijriYear) ? 366 : 365;

  let month = 1;
  let day = Math.floor(dayOfYear);

  if (day > yearLength) day = yearLength;
  if (day < 1) day = 1;

  for (let i = 0; i < 12; i++) {
    if (day <= monthLengths[i]) {
      month = i + 1;
      break;
    }
    day -= monthLengths[i];
  }

  if (month < 1) month = 1;
  if (month > 12) month = 12;
  if (day < 1) day = 1;
  if (day > monthLengths[month - 1]) day = monthLengths[month - 1];

  const monthInfo = AFGHAN_SOLAR_MONTHS[month - 1];

  return {
    year: solarHijriYear,
    month,
    day,
    monthNameDari: monthInfo.dari,
    monthNamePashto: monthInfo.pashto,
    monthNameEnglish: monthInfo.english,
  };
}

export function gregorianToAfghanSolarHijri(date: Date): AfghanSolarHijriDate {
  const kabulDate = getKabulNoon(date);
  const cacheKey = getKabulDateParts(kabulDate).dateKey;
  const cached = SHAMSI_FROM_GREGORIAN_CACHE.get(cacheKey);
  if (cached) return cached;

  const formatter = getPersianFormatter();
  if (formatter) {
    try {
      const parts = formatter.formatToParts(kabulDate);
      const lookup = (type: string) => parts.find((part) => part.type === type)?.value;
      const year = Number.parseInt(lookup('year') || '', 10);
      const month = Number.parseInt(lookup('month') || '', 10);
      const day = Number.parseInt(lookup('day') || '', 10);

      if (
        Number.isFinite(year) &&
        Number.isFinite(month) &&
        Number.isFinite(day) &&
        month >= 1 &&
        month <= 12
      ) {
        const monthInfo = AFGHAN_SOLAR_MONTHS[month - 1];
        const resolved: AfghanSolarHijriDate = {
          year,
          month,
          day,
          monthNameDari: monthInfo.dari,
          monthNamePashto: monthInfo.pashto,
          monthNameEnglish: monthInfo.english,
        };
        SHAMSI_FROM_GREGORIAN_CACHE.set(cacheKey, resolved);
        return resolved;
      }
    } catch {
      // Fall through to the bundled arithmetic fallback for older Intl runtimes.
    }
  }

  const fallback = gregorianToAfghanSolarHijriFallback(kabulDate);
  SHAMSI_FROM_GREGORIAN_CACHE.set(cacheKey, fallback);
  return fallback;
}

/**
 * Get number of days in a Solar Hijri month (1-12)
 */
export function getShamsiMonthLength(year: number, month: number): number {
  return getShamsiMonthLengths(year)[month - 1] ?? 30;
}

/**
 * Format Afghan Solar Hijri date for display
 */
export function solarMonthName(date: AfghanSolarHijriDate, language: AppLanguage): string {
  if (language === 'pashto') return date.monthNamePashto;
  if (language === 'english') return date.monthNameEnglish || AFGHAN_SOLAR_MONTHS[date.month - 1]?.english || '';
  return date.monthNameDari;
}

export function formatAfghanSolarHijriDate(
  date: AfghanSolarHijriDate,
  language: AppLanguage = 'dari',
): string {
  return `${date.day} ${solarMonthName(date, language)} ${date.year}`;
}

/**
 * Convert Arabic numerals to Persian/Dari numerals
 */
function toPersianNumerals(num: number): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num
    .toString()
    .split('')
    .map((d) => persianDigits[parseInt(d, 10)])
    .join('');
}

/**
 * Estimate Julian day for a Shamsi Y/M/D, then refine with a tiny local search.
 * Avoids the previous ±400-day scan that rebuilt Intl formatters on every step.
 */
function estimateJulianDayForShamsi(shamsiYear: number, shamsiMonth: number, shamsiDay: number): number {
  const lengths = getShamsiMonthLengths(shamsiYear);
  let dayOfYear = shamsiDay;
  for (let i = 0; i < shamsiMonth - 1; i++) {
    dayOfYear += lengths[i];
  }
  return PERSIAN_EPOCH_JD + (shamsiYear - 1) * 365.24219858 + (dayOfYear - 1);
}

/**
 * Convert Afghan Solar Hijri (Shamsi) date to Gregorian.
 */
export function shamsiToGregorian(
  shamsiYear: number,
  shamsiMonth: number,
  shamsiDay: number,
): Date | null {
  const cacheKey = `${shamsiYear}-${shamsiMonth}-${shamsiDay}`;
  if (SHAMSI_TO_GREGORIAN_CACHE.has(cacheKey)) {
    const cached = SHAMSI_TO_GREGORIAN_CACHE.get(cacheKey);
    return typeof cached === 'number' ? new Date(cached) : null;
  }

  const estimate = gregorianFromJulianDay(
    estimateJulianDayForShamsi(shamsiYear, shamsiMonth, shamsiDay),
  );
  const base = getKabulNoon(new Date(Date.UTC(estimate.year, estimate.month - 1, estimate.day, 12)));

  // Refine within a small window; cached G→S makes each step cheap.
  for (let offset = -3; offset <= 3; offset++) {
    const candidate = new Date(base);
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    const resolved = gregorianToAfghanSolarHijri(candidate);
    if (
      resolved.year === shamsiYear &&
      resolved.month === shamsiMonth &&
      resolved.day === shamsiDay
    ) {
      const noon = getKabulNoon(candidate);
      SHAMSI_TO_GREGORIAN_CACHE.set(cacheKey, noon.getTime());
      return noon;
    }
  }

  SHAMSI_TO_GREGORIAN_CACHE.set(cacheKey, null);
  return null;
}

/**
 * Format date with Persian numerals
 */
export function formatAfghanSolarHijriDateWithPersianNumerals(
  date: AfghanSolarHijriDate,
  language: AppLanguage = 'dari',
): string {
  const digits = getLanguage(language).digits === 'latin' ? String : toPersianNumerals;
  return `${digits(date.day)} ${solarMonthName(date, language)} ${digits(date.year)}`;
}
