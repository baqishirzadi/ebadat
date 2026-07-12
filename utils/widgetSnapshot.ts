import { addDaysToKabulDate, getKabulDateParts } from '@/utils/afghanistanCalendar';
import { formatGregorianParts, formatShamsiSlash, WEEKDAYS_DARI } from '@/utils/calendarDisplay';
import { getCalendarTruth } from '@/utils/calendarTruth';
import { formatPrayerTime12h } from '@/utils/formatPrayerTime';
import { toArabicNumerals } from '@/utils/numbers';
import { getCurrentPrayerKey } from '@/utils/prayerDisplay';
import { PRAYER_LABELS_DARI, type PrayerTimes } from '@/utils/prayerTimes';

export const WIDGET_SNAPSHOT_KEY = 'ebadat_widget_snapshot_v1';

export type WidgetPrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface WidgetPrayerEntry {
  key: WidgetPrayerKey;
  labelDari: string;
  time12h: string;
  atMs: number;
}

export interface WidgetSnapshot {
  version: 1;
  updatedAt: string;
  cityName: string;
  weekdayDari: string;
  shamsiDisplay: string;
  hijriDisplay: string;
  gregorianDisplay: string;
  currentPrayer: WidgetPrayerKey | null;
  prayers: WidgetPrayerEntry[];
  nextRefreshAtMs: number;
}

const PRAYER_ORDER: WidgetPrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

function formatGregorianDisplay(gregorianDate: Date): string {
  const greg = formatGregorianParts(gregorianDate);
  return `${greg.day} ${greg.monthEn} ${gregorianDate.getUTCFullYear()}`;
}

function getNextKabulMidnightMs(now: Date = new Date()): number {
  const tomorrow = addDaysToKabulDate(now, 1);
  const { dateKey } = getKabulDateParts(tomorrow);
  return new Date(`${dateKey}T00:00:00+04:30`).getTime();
}

function computeNextRefreshAtMs(prayerTimes: PrayerTimes, now: Date = new Date()): number {
  const nowMs = now.getTime();
  let nextPrayerMs = Number.POSITIVE_INFINITY;

  for (const key of PRAYER_ORDER) {
    const atMs = prayerTimes[key].getTime();
    if (atMs > nowMs) {
      nextPrayerMs = atMs;
      break;
    }
  }

  const midnightMs = getNextKabulMidnightMs(now);
  return Math.min(nextPrayerMs, midnightMs);
}

function getCurrentPrayerFromEntries(
  prayers: WidgetPrayerEntry[],
  now: Date = new Date(),
): WidgetPrayerKey | null {
  const nowMs = now.getTime();
  let current: WidgetPrayerKey | null = null;

  for (const key of PRAYER_ORDER) {
    const entry = prayers.find((prayer) => prayer.key === key);
    if (entry && entry.atMs <= nowMs) {
      current = key;
    }
  }

  return current;
}

function computeNextRefreshFromEntries(prayers: WidgetPrayerEntry[], now: Date = new Date()): number {
  const nowMs = now.getTime();
  let nextPrayerMs = Number.POSITIVE_INFINITY;

  for (const entry of prayers) {
    if (entry.atMs > nowMs) {
      nextPrayerMs = entry.atMs;
      break;
    }
  }

  return Math.min(nextPrayerMs, getNextKabulMidnightMs(now));
}

export function buildWidgetSnapshot(
  prayerTimes: PrayerTimes,
  cityName: string,
  now: Date = new Date(),
): WidgetSnapshot {
  const truth = getCalendarTruth(now);
  const currentPrayer = getCurrentPrayerKey(prayerTimes, now) as WidgetPrayerKey | null;

  return {
    version: 1,
    updatedAt: now.toISOString(),
    cityName,
    weekdayDari: WEEKDAYS_DARI[truth.weekday],
    shamsiDisplay: formatShamsiSlash(truth.shamsi),
    hijriDisplay: `${toArabicNumerals(truth.hijri.day)} ${truth.hijri.monthNameDari} ${toArabicNumerals(truth.hijri.year)}`,
    gregorianDisplay: formatGregorianDisplay(truth.gregorianDate),
    currentPrayer,
    prayers: PRAYER_ORDER.map((key) => ({
      key,
      labelDari: PRAYER_LABELS_DARI[key],
      time12h: formatPrayerTime12h(prayerTimes[key]),
      atMs: prayerTimes[key].getTime(),
    })),
    nextRefreshAtMs: computeNextRefreshAtMs(prayerTimes, now),
  };
}

export function refreshWidgetSnapshot(snapshot: WidgetSnapshot, now: Date = new Date()): WidgetSnapshot {
  const truth = getCalendarTruth(now);
  const currentPrayer = getCurrentPrayerFromEntries(snapshot.prayers, now);

  return {
    ...snapshot,
    updatedAt: now.toISOString(),
    weekdayDari: WEEKDAYS_DARI[truth.weekday],
    shamsiDisplay: formatShamsiSlash(truth.shamsi),
    hijriDisplay: `${toArabicNumerals(truth.hijri.day)} ${truth.hijri.monthNameDari} ${toArabicNumerals(truth.hijri.year)}`,
    gregorianDisplay: formatGregorianDisplay(truth.gregorianDate),
    currentPrayer,
    nextRefreshAtMs: computeNextRefreshFromEntries(snapshot.prayers, now),
  };
}

export function parseWidgetSnapshot(raw: string | null | undefined): WidgetSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WidgetSnapshot;
    if (parsed?.version !== 1 || !Array.isArray(parsed.prayers) || parsed.prayers.length === 0) {
      return null;
    }
    if (!parsed.prayers.every((entry) => typeof entry?.atMs === 'number' && typeof entry?.key === 'string')) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
