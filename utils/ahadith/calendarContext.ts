import { AhadithCalendarContext, HadithSpecialDay } from '@/types/hadith';
import { getKabulEpochDay } from '@/utils/afghanistanCalendar';
import { getCalendarTruth } from '@/utils/calendarTruth';

export function getAhadithCalendarContext(date: Date = new Date()): AhadithCalendarContext {
  const normalizedDate = new Date(date);
  const truth = getCalendarTruth(normalizedDate);
  const hijri = truth.hijri;
  const specialDayKeys: HadithSpecialDay[] = [];

  if (hijri.month === 9) {
    specialDayKeys.push('ramadan');
    if (hijri.day === 27) {
      specialDayKeys.push('laylat_al_qadr');
    }
  }

  if (hijri.month === 10 && hijri.day === 1) {
    specialDayKeys.push('eid_al_fitr');
  }

  if (hijri.month === 12) {
    if (hijri.day >= 1 && hijri.day <= 10) {
      specialDayKeys.push('first_10_dhul_hijjah');
    }
    if (hijri.day === 10) {
      specialDayKeys.push('eid_al_adha');
    }
  }

  if (hijri.month === 1 && hijri.day === 10) {
    specialDayKeys.push('ashura');
  }

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
    specialDayKeys,
    isFriday: weekday === 5,
  };
}
