import { toArabicNumerals, toArabicNumeralsString } from '@/utils/numbers';

/** 12-hour prayer time with Persian numerals: "۳:۰۳" / "۱۲:۱۸" (no AM/PM suffix) */
export function formatPrayerTime12h(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minuteStr = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${toArabicNumerals(hours)}:${toArabicNumeralsString(minuteStr)}`;
}
