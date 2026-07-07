import { getKabulDateParts } from '@/utils/afghanistanCalendar';
import { gregorianToAfghanSolarHijri, shamsiToGregorian, AFGHAN_SOLAR_MONTHS } from '@/utils/afghanSolarHijri';
import { AFGHAN_HOLIDAYS } from '@/utils/afghanHolidays';
import { formatShamsiSlash } from '@/utils/calendarDisplay';
import { debugLog } from '@/utils/debugLog';
import {
  gregorianToHijri,
  hijriToGregorian,
  HIJRI_MONTHS,
  SPECIAL_DAYS,
  type HijriDate,
} from '@/utils/islamicCalendar';
import { toArabicNumerals } from '@/utils/numbers';

export type CalendarEventCategory = 'islamic' | 'afghan' | 'international';

export interface CalendarEvent {
  id: string;
  titleDari: string;
  descriptionDari: string;
  gregorianDate: Date;
  category: CalendarEventCategory;
  isFasting?: boolean;
  isEid?: boolean;
  hijriMonth?: number;
  hijriDay?: number;
  shamsiMonth?: number;
  shamsiDay?: number;
}

export function getKabulDateKey(date: Date = new Date()): string {
  return getKabulDateParts(date).dateKey;
}

export function isEventOnOrAfterToday(eventDate: Date, today: Date = new Date()): boolean {
  const eventKey = getKabulDateParts(eventDate).dateKey;
  const todayKey = getKabulDateParts(today).dateKey;
  return eventKey >= todayKey;
}

function resolveIslamicEvent(hijriYear: number, month: number, day: number): Date | null {
  return hijriToGregorian(hijriYear, month, day);
}

function resolveAfghanEvent(shamsiYear: number, month: number, day: number): Date | null {
  return shamsiToGregorian(shamsiYear, month, day);
}

function collectAllEventsForYears(hijriYear: number, shamsiYear: number): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const day of SPECIAL_DAYS) {
    const gregorianDate = resolveIslamicEvent(hijriYear, day.month, day.day);
    if (!gregorianDate) continue;
    events.push({
      id: `islamic-${hijriYear}-${day.month}-${day.day}`,
      titleDari: day.nameDari,
      descriptionDari: day.descriptionDari,
      gregorianDate,
      category: 'islamic',
      isFasting: day.isFasting,
      isEid: day.isEid,
      hijriMonth: day.month,
      hijriDay: day.day,
    });
  }

  for (const holiday of AFGHAN_HOLIDAYS) {
    const gregorianDate = resolveAfghanEvent(shamsiYear, holiday.shamsiMonth, holiday.shamsiDay);
    if (!gregorianDate) continue;
    events.push({
      id: `afghan-${shamsiYear}-${holiday.shamsiMonth}-${holiday.shamsiDay}`,
      titleDari: holiday.nameDari,
      descriptionDari: holiday.descriptionDari,
      gregorianDate,
      category: 'afghan',
      shamsiMonth: holiday.shamsiMonth,
      shamsiDay: holiday.shamsiDay,
    });
  }

  return events;
}

let cachedEventsKey = '';
let cachedEvents: CalendarEvent[] = [];

export function getAllCalendarEvents(from: Date = new Date()): CalendarEvent[] {
  const hijri = gregorianToHijri(from);
  const shamsi = gregorianToAfghanSolarHijri(from);
  const key = `${hijri.year}-${shamsi.year}-${getKabulDateParts(from).dateKey}`;

  if (cachedEventsKey === key) {
    // #region agent log
    debugLog({
      location: 'calendarEvents.ts:getAllCalendarEvents',
      message: 'cache hit',
      data: { key, count: cachedEvents.length },
      hypothesisId: 'A',
    });
    // #endregion
    return cachedEvents;
  }

  // #region agent log
  const buildStart = Date.now();
  // #endregion

  const currentYearEvents = collectAllEventsForYears(hijri.year, shamsi.year);
  const nextYearEvents = collectAllEventsForYears(hijri.year + 1, shamsi.year + 1);

  const merged = new Map<string, CalendarEvent>();
  for (const event of [...currentYearEvents, ...nextYearEvents]) {
    const eventKey = `${event.category}-${event.titleDari}-${getKabulDateParts(event.gregorianDate).dateKey}`;
    if (!merged.has(eventKey)) merged.set(eventKey, event);
  }

  cachedEventsKey = key;
  cachedEvents = Array.from(merged.values()).sort(
    (a, b) => a.gregorianDate.getTime() - b.gregorianDate.getTime(),
  );

  // #region agent log
  debugLog({
    location: 'calendarEvents.ts:getAllCalendarEvents',
    message: 'cache miss built',
    data: { key, count: cachedEvents.length, durationMs: Date.now() - buildStart },
    hypothesisId: 'A',
  });
  // #endregion

  return cachedEvents;
}

export function getUpcomingEvents(from: Date = new Date(), count: number = 8): CalendarEvent[] {
  return getAllCalendarEvents(from)
    .filter((event) => isEventOnOrAfterToday(event.gregorianDate, from))
    .slice(0, count);
}

export function getEventsForGregorianMonth(year: number, month: number, from: Date = new Date()): CalendarEvent[] {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  return getAllCalendarEvents(from).filter((event) => {
    const parts = getKabulDateParts(event.gregorianDate);
    const eventMonthKey = `${parts.year}-${String(parts.month).padStart(2, '0')}`;
    return eventMonthKey === monthKey && isEventOnOrAfterToday(event.gregorianDate, from);
  });
}

export function formatEventDateLabel(event: CalendarEvent): string {
  const parts = formatEventDateParts(event);
  if (parts.month) {
    const yearPart = parts.year ? ` ${parts.year}` : '';
    return `${parts.day} ${parts.month}${yearPart}`;
  }
  return parts.day;
}

export function formatEventDateParts(event: CalendarEvent): { day: string; month?: string; year?: string } {
  if (event.category === 'islamic' && event.hijriMonth && event.hijriDay) {
    const monthName = HIJRI_MONTHS[event.hijriMonth - 1]?.dari ?? '';
    return { day: toArabicNumerals(event.hijriDay), month: monthName };
  }

  const shamsi = gregorianToAfghanSolarHijri(event.gregorianDate);
  const monthName = AFGHAN_SOLAR_MONTHS[shamsi.month - 1]?.dari ?? '';
  return {
    day: toArabicNumerals(shamsi.day),
    month: monthName,
    year: toArabicNumerals(shamsi.year),
  };
}

export function getEventCategoryColor(
  category: CalendarEventCategory,
  theme: { tint: string; bookmark: string },
): string {
  if (category === 'islamic') return theme.bookmark;
  if (category === 'afghan') return theme.tint;
  return theme.tint;
}

export function isIslamicEventOnDate(hijri: HijriDate): boolean {
  return SPECIAL_DAYS.some((d) => d.month === hijri.month && d.day === hijri.day);
}

export function isAfghanEventOnDate(shamsiMonth: number, shamsiDay: number): boolean {
  return AFGHAN_HOLIDAYS.some((h) => h.shamsiMonth === shamsiMonth && h.shamsiDay === shamsiDay);
}

export type DayEventType = 'islamic' | 'afghan' | 'both';

const ISLAMIC_DAY_SET = new Set(
  SPECIAL_DAYS.map((d) => `${d.month}-${d.day}`),
);
const AFGHAN_DAY_SET = new Set(
  AFGHAN_HOLIDAYS.map((h) => `${h.shamsiMonth}-${h.shamsiDay}`),
);

export function getDayEventType(gregorianDate: Date): DayEventType | null {
  const hijri = gregorianToHijri(gregorianDate);
  const shamsi = gregorianToAfghanSolarHijri(gregorianDate);
  return getDayEventTypeFromParts(hijri.month, hijri.day, shamsi.month, shamsi.day);
}

export function getDayEventTypeFromParts(
  hijriMonth: number,
  hijriDay: number,
  shamsiMonth: number,
  shamsiDay: number,
): DayEventType | null {
  const islamic = ISLAMIC_DAY_SET.has(`${hijriMonth}-${hijriDay}`);
  const afghan = AFGHAN_DAY_SET.has(`${shamsiMonth}-${shamsiDay}`);
  if (islamic && afghan) return 'both';
  if (islamic) return 'islamic';
  if (afghan) return 'afghan';
  return null;
}

export function warmCalendarEventsCache(from: Date = new Date()): void {
  getAllCalendarEvents(from);
}
