import { AhadithCalendarContext, HadithSpecialDay } from '@/types/hadith';
import { getKabulEpochDay } from '@/utils/afghanistanCalendar';
import { getCalendarTruth } from '@/utils/calendarTruth';
import { gregorianToHijri } from '@/utils/islamicCalendar';
import { getVerifiedAfghanistanHijriDate } from '@/utils/ahadith/officialAfghanistanCalendar';

export function getAhadithCalendarContext(date: Date = new Date()): AhadithCalendarContext {
  const normalizedDate = new Date(date);
  const truth = getCalendarTruth(normalizedDate);
  const official = getVerifiedAfghanistanHijriDate(truth.dateKey);
  // Hadith matching stays on the official Afghan date. The settings offset
  // only moves the lunar date the user sees.
  const hijri = gregorianToHijri(truth.gregorianDate);
  const specialDayKeys: HadithSpecialDay[] = official?.specialDayKeys ?? [];

  const weekday = truth.weekday;

  return {
    gregorianDate: normalizedDate,
    epochDay: getKabulEpochDay(normalizedDate),
    weekday,
    hijri: {
      year: hijri.year,
      month: hijri.month,
      day: hijri.day,
    },
    hijriVerified: official !== null,
    specialDayKeys,
    isFriday: weekday === 5,
  };
}
