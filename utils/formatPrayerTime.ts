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
