import { getShamsiMonthLength, shamsiToGregorian } from '@/utils/afghanSolarHijri';
import { getKabulDateParts, getKabulNoon, getKabulWeekdayIndex } from '@/utils/afghanistanCalendar';
import { getHijriMonthLength, hijriToGregorian } from '@/utils/islamicCalendar';

export type CalendarGridMode = 'qamari' | 'shamsi' | 'gregorian';

export interface CalendarMonthGridMeta {
  daysInMonth: number;
  firstDayOffset: number;
}

const MONTH_GRID_META_CACHE = new Map<string, CalendarMonthGridMeta>();

function mapWeekdayToDariGridColumn(date: Date | null): number {
  if (!date) {
    return 0;
  }

  // Kabul weekday index is Sun=0 ... Sat=6; visual grid is Sat-first (ش=Sat).
  return (6 - getKabulWeekdayIndex(date)) % 7;
}

export function getCalendarMonthGridMeta(
  mode: CalendarGridMode,
  displayYear: number,
  displayMonth: number,
): CalendarMonthGridMeta {
  const cacheKey = `${mode}:${displayYear}:${displayMonth}`;
  const cached = MONTH_GRID_META_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  if (mode === 'gregorian') {
    const firstDay = getKabulNoon(new Date(Date.UTC(displayYear, displayMonth - 1, 1, 12, 0, 0)));
    const daysInMonth = new Date(displayYear, displayMonth, 0).getDate();
    const resolved = {
      daysInMonth,
      firstDayOffset: mapWeekdayToDariGridColumn(firstDay),
    };
    MONTH_GRID_META_CACHE.set(cacheKey, resolved);
    return resolved;
  }

  if (mode === 'qamari') {
    const resolved = {
      daysInMonth: getHijriMonthLength(displayYear, displayMonth),
      firstDayOffset: mapWeekdayToDariGridColumn(hijriToGregorian(displayYear, displayMonth, 1)),
    };
    MONTH_GRID_META_CACHE.set(cacheKey, resolved);
    return resolved;
  }

  const resolved = {
    daysInMonth: getShamsiMonthLength(displayYear, displayMonth),
    firstDayOffset: mapWeekdayToDariGridColumn(shamsiToGregorian(displayYear, displayMonth, 1)),
  };
  MONTH_GRID_META_CACHE.set(cacheKey, resolved);
  return resolved;
}
