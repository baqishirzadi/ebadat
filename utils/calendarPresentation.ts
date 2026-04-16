import type { AfghanSolarHijriDate } from '@/utils/afghanSolarHijri';
import { formatAfghanSolarHijriDateWithPersianNumerals } from '@/utils/afghanSolarHijri';
import { getKabulDateParts } from '@/utils/afghanistanCalendar';
import type { HijriDate } from '@/utils/islamicCalendar';
import {
  toArabicNumerals,
  toArabicNumeralsString,
  toPersianNumeralsString,
} from '@/utils/numbers';

export const WEEKDAY_DARI_FULL = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
  'شنبه',
] as const;

export const WEEKDAY_ARABIC_FULL = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
] as const;

export const WEEKDAY_ENGLISH_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const WEEKDAY_GRID_DARI = ['شن', 'یک', 'دو', 'سه', 'چه', 'پن', 'جم'] as const;

const GREGORIAN_MONTHS_EN_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatHijriDateArabicNumerals(hijri: HijriDate): string {
  return `${toArabicNumerals(hijri.day)} ${hijri.monthNameArabic} ${toArabicNumerals(hijri.year)}`;
}

export function formatHijriSlashDateArabicNumerals(hijri: HijriDate): string {
  return toArabicNumeralsString(`${hijri.year}/${pad(hijri.month)}/${pad(hijri.day)}`);
}

export function formatShamsiSlashDatePersianNumerals(shamsi: AfghanSolarHijriDate): string {
  return toPersianNumeralsString(`${shamsi.year}/${pad(shamsi.month)}/${pad(shamsi.day)}`);
}

export function formatGregorianEnglishDate(date: Date): string {
  const { day, month, year } = getKabulDateParts(date);
  return `${day} ${GREGORIAN_MONTHS_EN_SHORT[month - 1]} ${year}`;
}

export function getCalendarWeekdayLabels(weekday: number) {
  return {
    dari: WEEKDAY_DARI_FULL[weekday] ?? '',
    arabic: WEEKDAY_ARABIC_FULL[weekday] ?? '',
    english: WEEKDAY_ENGLISH_FULL[weekday] ?? '',
  };
}

export function formatCalendarTruthDisplay(input: {
  weekday: number;
  hijri: HijriDate;
  shamsi: AfghanSolarHijriDate;
  gregorianDate: Date;
}) {
  const weekday = getCalendarWeekdayLabels(input.weekday);

  return {
    weekday,
    shamsiFull: formatAfghanSolarHijriDateWithPersianNumerals(input.shamsi, 'dari'),
    shamsiSlash: formatShamsiSlashDatePersianNumerals(input.shamsi),
    hijriFullArabic: formatHijriDateArabicNumerals(input.hijri),
    hijriSlashArabic: formatHijriSlashDateArabicNumerals(input.hijri),
    gregorianFullEnglish: formatGregorianEnglishDate(input.gregorianDate),
  };
}
