import { AhadithCalendarContext, HadithSpecialDay } from '@/types/hadith';
import { getKabulEpochDay } from '@/utils/afghanistanCalendar';
import { getCalendarTruth } from '@/utils/calendarTruth';
import { getVerifiedAfghanistanHijriDate } from '@/utils/ahadith/officialAfghanistanCalendar';

export function getAhadithCalendarContext(date: Date = new Date()): AhadithCalendarContext {
  const normalizedDate = new Date(date);
  const truth = getCalendarTruth(normalizedDate);
  const official = getVerifiedAfghanistanHijriDate(truth.dateKey);
  const hijri = truth.hijri;
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
