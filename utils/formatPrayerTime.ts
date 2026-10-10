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

/** 12-hour prayer time with Latin digits and an AM/PM suffix. */
export function formatPrayerTime12hLatin(date: Date, timeZone?: string): string {
  const { hours: rawHours, minutes } = getHoursMinutesInTimeZone(date, timeZone);
  const suffix = rawHours >= 12 ? 'PM' : 'AM';
  let hours = rawHours % 12;
  if (hours === 0) hours = 12;
  const minuteStr = String(minutes).padStart(2, '0');
  return `${hours}:${minuteStr} ${suffix}`;
}

/** Turkish uses a 24-hour clock. English uses Latin digits with AM/PM. */
export function formatPrayerTimeForLanguage(
  date: Date,
  timeZone: string | undefined,
  language: AppLanguage,
): string {
  if (language === 'turkish') return formatPrayerTime24h(date, timeZone);
  if (language === 'english') return formatPrayerTime12hLatin(date, timeZone);
  return formatPrayerTime12h(date, timeZone);
}
