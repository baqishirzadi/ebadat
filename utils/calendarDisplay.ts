import type { AppLanguage } from '@/types/quran';
import { getKabulDateParts } from '@/utils/afghanistanCalendar';
import { getIstanbulDateParts } from '@/utils/istanbulCalendar';
import { formatAfghanSolarHijriDateWithPersianNumerals, type AfghanSolarHijriDate } from '@/utils/afghanSolarHijri';
import type { HijriDate } from '@/utils/islamicCalendar';
import { toArabicNumerals } from '@/utils/numbers';
import { getDateKeyInTimezone, parseDateKey, weekdayInTimezone } from '@/utils/prayerTimezone';

export const WEEKDAYS_DARI = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
  'شنبه',
];

export const WEEKDAYS_PASHTO = [
  'یکشنبه',
  'دوشنبه',
  'درې‌شنبه',
  'څلورشنبه',
  'پینځشنبه',
  'جمعه',
  'شنبه',
];

export const WEEKDAYS_AR = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export const WEEKDAYS_ENGLISH = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const WEEKDAYS_TURKISH = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
];

const WEEKDAYS_ARABIC = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

const WEEKDAYS_BY_LANGUAGE: Record<AppLanguage, string[]> = {
  dari: WEEKDAYS_DARI,
  pashto: WEEKDAYS_PASHTO,
  english: WEEKDAYS_ENGLISH,
  turkish: WEEKDAYS_TURKISH,
  arabic: WEEKDAYS_ARABIC,
};

/** Weekday name for a Sunday-indexed weekday (0-6) in the active language. */
export function weekdayName(weekdayIndex: number, language: AppLanguage): string {
  const names = WEEKDAYS_BY_LANGUAGE[language] ?? WEEKDAYS_DARI;
  return names[weekdayIndex] ?? '';
}

/**
 * Column headers for the month grid, in Afghan calendar column order
 * (Saturday first through Friday last).
 */
const WEEKDAY_GRID_HEADERS: Record<AppLanguage, string[]> = {
  dari: ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'],
  pashto: ['ش', 'ی', 'د', 'س', 'څ', 'پ', 'ج'],
  arabic: ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'],
  turkish: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
  english: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

export function weekdayGridHeaders(language: AppLanguage): string[] {
  return WEEKDAY_GRID_HEADERS[language] ?? WEEKDAY_GRID_HEADERS.dari;
}

/** Compact Gregorian month labels used by widgets and non-English fallbacks. */
export const GREG_MONTHS_EN = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

/** Full English month names for the English app UI. Widgets keep the compact codes. */
export const GREG_MONTHS_EN_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const GREG_MONTHS_DARI = [
  'جنوری', 'فبروری', 'مارچ', 'اپریل', 'می', 'جون',
  'جولای', 'اگست', 'سپتمبر', 'اکتوبر', 'نومبر', 'دسمبر',
];

const GREG_MONTHS_PASHTO = [
  'جنوري', 'فبروري', 'مارچ', 'اپرېل', 'مۍ', 'جون',
  'جولای', 'اګست', 'سپتمبر', 'اکتوبر', 'نومبر', 'ډسمبر',
];

const GREG_MONTHS_TURKISH = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const GREG_MONTHS_ARABIC = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const GREG_MONTHS_BY_LANGUAGE: Record<AppLanguage, string[]> = {
  dari: GREG_MONTHS_DARI,
  pashto: GREG_MONTHS_PASHTO,
  arabic: GREG_MONTHS_ARABIC,
  turkish: GREG_MONTHS_TURKISH,
  english: GREG_MONTHS_EN,
};

export function formatGregorianDateCompact(
  gregorianDate: Date,
  formatNumber: (value: number) => string = String,
  language: AppLanguage = 'english',
): string {
  const parts = getKabulDateParts(gregorianDate);
  const month = (GREG_MONTHS_BY_LANGUAGE[language] ?? GREG_MONTHS_EN)[parts.month - 1];
  return `${formatNumber(parts.day)} ${month} ${formatNumber(parts.year)}`;
}

/** Miladi date for the Turkish UI, using the Istanbul civil day and full month names. */
export function formatTurkishMiladiDate(
  gregorianDate: Date = new Date(),
  formatNumber: (value: number) => string = String,
): string {
  const parts = getIstanbulDateParts(gregorianDate);
  const month = GREG_MONTHS_TURKISH[parts.month - 1] ?? '';
  return `${formatNumber(parts.day)} ${month} ${formatNumber(parts.year)}`;
}

export function turkishGregorianMonthName(month: number): string {
  return GREG_MONTHS_TURKISH[month - 1] ?? '';
}

export function englishGregorianMonthName(month: number): string {
  return GREG_MONTHS_EN_FULL[month - 1] ?? '';
}

export interface CivilDateParts {
  year: number;
  month: number;
  day: number;
  weekday: number;
  dateKey: string;
}

/** Civil day in the selected city timezone, or on the device when no timezone is set. */
export function getCivilDateParts(date: Date = new Date(), timeZone?: string): CivilDateParts {
  const dateKey = getDateKeyInTimezone(date, timeZone);
  const { year, month, day } = parseDateKey(dateKey);
  return {
    year,
    month,
    day,
    weekday: weekdayInTimezone(date, timeZone),
    dateKey,
  };
}

/** English civil date, for example "11 October 2026". */
export function formatEnglishCivilDate(date: Date = new Date(), timeZone?: string): string {
  const parts = getCivilDateParts(date, timeZone);
  return `${parts.day} ${englishGregorianMonthName(parts.month)} ${parts.year}`;
}

/** English label for a calendar cell whose civil day is already the Kabul day of `date`. */
export function formatEnglishKabulDate(date: Date): string {
  const parts = getKabulDateParts(date);
  return `${parts.day} ${englishGregorianMonthName(parts.month)} ${parts.year}`;
}

export function formatGregorianDateTimeCompact(
  gregorianDate: Date,
  formatNumber: (value: number) => string = String,
  timeLocale = 'fa-AF',
): string {
  const time = new Intl.DateTimeFormat(timeLocale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeLocale !== 'en-US',
    timeZone: 'Asia/Kabul',
  }).format(gregorianDate);
  return `${formatGregorianDateCompact(gregorianDate, formatNumber)} · ${time}`;
}

function padFa2(num: number): string {
  const s = toArabicNumerals(num);
  return num < 10 ? `${toArabicNumerals(0)}${s}` : s;
}

/** Afghan Shamsi with burj name: "۱۵ سرطان ۱۴۰۵" */
export function formatShamsiSlash(date: AfghanSolarHijriDate, language: AppLanguage = 'dari'): string {
  return formatAfghanSolarHijriDateWithPersianNumerals(date, language);
}

/** Numeric Shamsi: "۱۴۰۵/۰۴/۱۵" (internal/debug) */
export function formatShamsiNumeric(date: AfghanSolarHijriDate): string {
  return `${toArabicNumerals(date.year)}/${padFa2(date.month)}/${padFa2(date.day)}`;
}

export function formatHijriSlash(date: HijriDate): string {
  return `${toArabicNumerals(date.year)}/${padFa2(date.month)}/${padFa2(date.day)}`;
}

export function formatGregorianParts(gregorianDate: Date): {
  weekdayEn: string;
  day: number;
  monthEn: string;
} {
  const parts = getKabulDateParts(gregorianDate);
  return {
    weekdayEn: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parts.weekday],
    day: parts.day,
    monthEn: GREG_MONTHS_EN[parts.month - 1],
  };
}
