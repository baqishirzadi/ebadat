import type { AppLanguage } from '@/types/quran';
import { getKabulDateParts } from '@/utils/afghanistanCalendar';
import { formatAfghanSolarHijriDateWithPersianNumerals, type AfghanSolarHijriDate } from '@/utils/afghanSolarHijri';
import type { HijriDate } from '@/utils/islamicCalendar';
import { toArabicNumerals } from '@/utils/numbers';

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
  'سې‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
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

const WEEKDAYS_BY_LANGUAGE: Record<AppLanguage, string[]> = {
  dari: WEEKDAYS_DARI,
  pashto: WEEKDAYS_PASHTO,
  english: WEEKDAYS_ENGLISH,
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
  pashto: ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'],
  english: ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr'],
};

export function weekdayGridHeaders(language: AppLanguage): string[] {
  return WEEKDAY_GRID_HEADERS[language] ?? WEEKDAY_GRID_HEADERS.dari;
}

/** Compact Gregorian month labels used consistently in app and widget dates. */
export const GREG_MONTHS_EN = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

export function formatGregorianDateCompact(
  gregorianDate: Date,
  formatNumber: (value: number) => string = String,
): string {
  const parts = getKabulDateParts(gregorianDate);
  return `${formatNumber(parts.day)} ${GREG_MONTHS_EN[parts.month - 1]} ${formatNumber(parts.year)}`;
}

export function formatGregorianDateTimeCompact(
  gregorianDate: Date,
  formatNumber: (value: number) => string = String,
  timeLocale = 'fa-AF',
): string {
  const time = new Intl.DateTimeFormat(timeLocale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
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
