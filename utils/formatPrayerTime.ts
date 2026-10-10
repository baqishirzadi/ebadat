import type { AppLanguage } from '@/types/quran';
import { toArabicNumerals, toArabicNumeralsString } from '@/utils/numbers';
import { getHoursMinutesInTimeZone } from '@/utils/prayerTimezone';

/** 12-hour prayer time with Persian numerals: "۳:۰۳" / "۱۲:۱۸" (no AM/PM suffix) */
export function formatPrayerTime12h(date: Date, timeZone?: string): string {
  const { hours: rawHours, minutes } = getHoursMinutesInTimeZone(date, timeZone);
  let hours = rawHours % 12;
  if (hours === 0) hours = 12;
  const minuteStr = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${toArabicNumerals(hours)}:${toArabicNumeralsString(minuteStr)}`;
}

/** 24-hour prayer time with Latin digits: "05:12". */
export function formatPrayerTime24h(date: Date, timeZone?: string): string {
  const { hours, minutes } = getHoursMinutesInTimeZone(date, timeZone);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Turkish uses a 24-hour clock. Other languages keep the existing 12-hour display. */
export function formatPrayerTimeForLanguage(
  date: Date,
  timeZone: string | undefined,
  language: AppLanguage,
): string {
  if (language === 'turkish') return formatPrayerTime24h(date, timeZone);
  return formatPrayerTime12h(date, timeZone);
}
