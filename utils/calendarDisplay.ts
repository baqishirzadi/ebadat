import { getKabulDateParts } from '@/utils/afghanistanCalendar';
import type { AfghanSolarHijriDate } from '@/utils/afghanSolarHijri';
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

export const WEEKDAYS_AR = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export const GREG_MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function padFa2(num: number): string {
  const s = toArabicNumerals(num);
  return num < 10 ? `${toArabicNumerals(0)}${s}` : s;
}

export function formatShamsiSlash(date: AfghanSolarHijriDate): string {
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
