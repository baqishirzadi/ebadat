import { AhadithCalendarContext, HadithSpecialDay } from '@/types/hadith';
import { gregorianToHijri } from '@/utils/islamicCalendar';

function getEpochDay(date: Date): number {
  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  const utcDay = date.getUTCDate();
  return Math.floor(Date.UTC(utcYear, utcMonth, utcDay) / 86400000);
}

export function getAhadithCalendarContext(date: Date = new Date()): AhadithCalendarContext {
  const normalizedDate = new Date(date);
  const hijri = gregorianToHijri(normalizedDate);
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

  const weekday = normalizedDate.getDay();

  return {
    gregorianDate: normalizedDate,
    epochDay: getEpochDay(normalizedDate),
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
