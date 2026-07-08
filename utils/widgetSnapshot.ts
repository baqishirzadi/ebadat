import { addDaysToKabulDate, getKabulDateParts } from '@/utils/afghanistanCalendar';
import { formatShamsiSlash, WEEKDAYS_DARI } from '@/utils/calendarDisplay';
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
  currentPrayer: WidgetPrayerKey | null;
  prayers: WidgetPrayerEntry[];
  nextRefreshAtMs: number;
}

const PRAYER_ORDER: WidgetPrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

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

export function parseWidgetSnapshot(raw: string | null | undefined): WidgetSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WidgetSnapshot;
    if (parsed?.version !== 1 || !Array.isArray(parsed.prayers)) return null;
    return parsed;
  } catch {
    return null;
  }
}
