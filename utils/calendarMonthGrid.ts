import { getShamsiMonthLength, shamsiToGregorian } from '@/utils/afghanSolarHijri';
import { getKabulNoon, getKabulWeekdayIndex } from '@/utils/afghanistanCalendar';
import { displayHijriToGregorian, getUserHijriOffsetDays } from '@/utils/hijriOffset';
import { getHijriMonthLength } from '@/utils/islamicCalendar';

export type CalendarGridMode = 'qamari' | 'shamsi' | 'gregorian';

export interface CalendarMonthGridMeta {
  daysInMonth: number;
  firstDayOffset: number;
}

const MONTH_GRID_META_CACHE = new Map<string, CalendarMonthGridMeta>();

export type WeekStartsOn = 'saturday' | 'monday';

function mapWeekdayToGridColumn(date: Date | null, weekStartsOn: WeekStartsOn): number {
  if (!date) {
    return 0;
  }

  const weekday = getKabulWeekdayIndex(date);
  if (weekStartsOn === 'monday') {
    // Monday = 0 … Sunday = 6.
    return (weekday + 6) % 7;
  }

  // Kabul weekday index is Sun=0 ... Sat=6; visual grid is Sat-first, reading
  // right-to-left as: ش(Sat) ی(Sun) د(Mon) س(Tue) چ(Wed) پ(Thu) ج(Fri).
  // Column 0 = rightmost = Saturday. So Sat(6)->0, Sun(0)->1, ... Fri(5)->6.
  return (weekday + 1) % 7;
}

export function getCalendarMonthGridMeta(
  mode: CalendarGridMode,
  displayYear: number,
  displayMonth: number,
  weekStartsOn: WeekStartsOn = 'saturday',
): CalendarMonthGridMeta {
  const cacheKey = `${mode}:${displayYear}:${displayMonth}:${weekStartsOn}:${mode === 'qamari' ? getUserHijriOffsetDays() : 0}`;
  const cached = MONTH_GRID_META_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  if (mode === 'gregorian') {
    const firstDay = getKabulNoon(new Date(Date.UTC(displayYear, displayMonth - 1, 1, 12, 0, 0)));
    const daysInMonth = new Date(displayYear, displayMonth, 0).getDate();
    const resolved = {
      daysInMonth,
      firstDayOffset: mapWeekdayToGridColumn(firstDay, weekStartsOn),
    };
    MONTH_GRID_META_CACHE.set(cacheKey, resolved);
    return resolved;
  }

  if (mode === 'qamari') {
    const resolved = {
      daysInMonth: getHijriMonthLength(displayYear, displayMonth),
      firstDayOffset: mapWeekdayToGridColumn(displayHijriToGregorian(displayYear, displayMonth, 1), weekStartsOn),
    };
    MONTH_GRID_META_CACHE.set(cacheKey, resolved);
    return resolved;
  }

  const resolved = {
    daysInMonth: getShamsiMonthLength(displayYear, displayMonth),
    firstDayOffset: mapWeekdayToGridColumn(shamsiToGregorian(displayYear, displayMonth, 1), weekStartsOn),
  };
  MONTH_GRID_META_CACHE.set(cacheKey, resolved);
  return resolved;
}
