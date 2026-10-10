import {
  AfghanSolarHijriDate,
  gregorianToAfghanSolarHijri,
} from '@/utils/afghanSolarHijri';
import {
  getKabulDateKey,
  getKabulNoon,
  getKabulWeekdayIndex,
} from '@/utils/afghanistanCalendar';
import { gregorianToDisplayHijri, getUserHijriOffsetDays } from '@/utils/hijriOffset';
import { HijriDate } from '@/utils/islamicCalendar';

export interface CalendarTruth {
  gregorianDate: Date;
  dateKey: string;
  weekday: number;
  hijri: HijriDate;
  shamsi: AfghanSolarHijriDate;
}

export function getCalendarTruth(
  date: Date = new Date(),
  hijriOffsetDays: number = getUserHijriOffsetDays(),
): CalendarTruth {
  const gregorianDate = getKabulNoon(date);

  return {
    gregorianDate,
    dateKey: getKabulDateKey(gregorianDate),
    weekday: getKabulWeekdayIndex(gregorianDate),
    hijri: gregorianToDisplayHijri(gregorianDate, hijriOffsetDays),
    shamsi: gregorianToAfghanSolarHijri(gregorianDate),
  };
}
