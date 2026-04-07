import { getShamsiMonthLength, shamsiToGregorian } from '@/utils/afghanSolarHijri';
import { getKabulWeekdayIndex } from '@/utils/afghanistanCalendar';
import { getHijriMonthLength, hijriToGregorian } from '@/utils/islamicCalendar';

export type CalendarGridMode = 'qamari' | 'shamsi';

export interface CalendarMonthGridMeta {
  daysInMonth: number;
  firstDayOffset: number;
}

function mapWeekdayToDariGridColumn(date: Date | null): number {
  if (!date) {
    return 0;
  }

  // Kabul weekday index is Sun=0 ... Sat=6 while the visual grid is Sat-first.
  return (getKabulWeekdayIndex(date) + 1) % 7;
}

export function getCalendarMonthGridMeta(
  mode: CalendarGridMode,
  displayYear: number,
  displayMonth: number,
): CalendarMonthGridMeta {
  if (mode === 'qamari') {
    return {
      daysInMonth: getHijriMonthLength(displayYear, displayMonth),
      firstDayOffset: mapWeekdayToDariGridColumn(hijriToGregorian(displayYear, displayMonth, 1)),
    };
  }

  return {
    daysInMonth: getShamsiMonthLength(displayYear, displayMonth),
    firstDayOffset: mapWeekdayToDariGridColumn(shamsiToGregorian(displayYear, displayMonth, 1)),
  };
}
