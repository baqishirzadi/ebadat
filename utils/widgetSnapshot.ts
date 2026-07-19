import { addDaysToDateKey, getDateKeyInTimezone, nextLocalMidnightMs } from '@/utils/prayerTimezone';
import { formatGregorianParts, formatShamsiSlash, WEEKDAYS_DARI } from '@/utils/calendarDisplay';
import { getCalendarTruth } from '@/utils/calendarTruth';
import { formatPrayerTime12h } from '@/utils/formatPrayerTime';
import { toArabicNumerals } from '@/utils/numbers';
import { PRAYER_LABELS_DARI, type PrayerTimes } from '@/utils/prayerTimes';
import { PRAYER_POLICY_VERSION } from '@/utils/prayerCalculationPolicy';

export const WIDGET_SNAPSHOT_KEY = 'ebadat_widget_snapshot_v1';

export type WidgetPrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface WidgetPrayerEntry {
  key: WidgetPrayerKey;
  labelDari: string;
  time12h: string;
  atMs: number;
}

export interface WidgetDaySnapshot {
  dateKey: string;
  weekdayDari: string;
  shamsiDisplay: string;
  hijriDisplay: string;
  gregorianDisplay: string;
  prayers: WidgetPrayerEntry[];
}

export interface WidgetSnapshot {
  version: 2;
  updatedAt: string;
  cityName: string;
  timezone: string;
  policyVersion: number;
  sourceLabel?: string;
  days: WidgetDaySnapshot[];
  /** Derived display fields for the active day (kept for renderers). */
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

function buildDaySnapshot(
  prayerTimes: PrayerTimes,
  dateKey: string,
  timezone: string,
  noonAnchor: Date,
): WidgetDaySnapshot {
  const truth = getCalendarTruth(noonAnchor);
  return {
    dateKey,
    weekdayDari: WEEKDAYS_DARI[truth.weekday],
    shamsiDisplay: formatShamsiSlash(truth.shamsi),
    hijriDisplay: `${toArabicNumerals(truth.hijri.day)} ${truth.hijri.monthNameDari} ${toArabicNumerals(truth.hijri.year)}`,
    gregorianDisplay: formatGregorianDisplay(truth.gregorianDate),
    prayers: PRAYER_ORDER.map((key) => ({
      key,
      labelDari: PRAYER_LABELS_DARI[key],
      time12h: formatPrayerTime12h(prayerTimes[key], timezone),
      atMs: prayerTimes[key].getTime(),
    })),
  };
}

function selectDay(
  days: WidgetDaySnapshot[],
  now: Date,
  timezone: string,
): WidgetDaySnapshot | null {
  if (!days.length) return null;
  const todayKey = getDateKeyInTimezone(now, timezone);
  return days.find((day) => day.dateKey === todayKey) || days[0];
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

function computeNextRefreshAtMs(
  days: WidgetDaySnapshot[],
  timezone: string,
  now: Date = new Date(),
): number {
  const nowMs = now.getTime();
  let nextPrayerMs = Number.POSITIVE_INFINITY;
  for (const day of days) {
    for (const entry of day.prayers) {
      if (entry.atMs > nowMs && entry.atMs < nextPrayerMs) {
        nextPrayerMs = entry.atMs;
      }
    }
  }
  const midnightMs = nextLocalMidnightMs(now, timezone);
  return Math.min(nextPrayerMs, midnightMs);
}

export function buildWidgetSnapshot(
  prayerTimes: PrayerTimes,
  cityName: string,
  now: Date = new Date(),
  options?: {
    timezone?: string;
    sourceLabel?: string;
    multiDay?: Array<{ dateKey: string; times: PrayerTimes; noonAnchor: Date }>;
  },
): WidgetSnapshot {
  const timezone = options?.timezone || 'Asia/Kabul';
  const todayKey = getDateKeyInTimezone(now, timezone);

  const days: WidgetDaySnapshot[] =
    options?.multiDay && options.multiDay.length > 0
      ? options.multiDay.map((day) =>
          buildDaySnapshot(day.times, day.dateKey, timezone, day.noonAnchor),
        )
      : [buildDaySnapshot(prayerTimes, todayKey, timezone, now)];

  const active = selectDay(days, now, timezone) || days[0];
  const currentPrayer = getCurrentPrayerFromEntries(active.prayers, now);

  return {
    version: 2,
    updatedAt: now.toISOString(),
    cityName,
    timezone,
    policyVersion: PRAYER_POLICY_VERSION,
    sourceLabel: options?.sourceLabel,
    days,
    weekdayDari: active.weekdayDari,
    shamsiDisplay: active.shamsiDisplay,
    hijriDisplay: active.hijriDisplay,
    gregorianDisplay: active.gregorianDisplay,
    currentPrayer,
    prayers: active.prayers,
    nextRefreshAtMs: computeNextRefreshAtMs(days, timezone, now),
  };
}

export function refreshWidgetSnapshot(snapshot: WidgetSnapshot, now: Date = new Date()): WidgetSnapshot {
  const timezone = snapshot.timezone || 'Asia/Kabul';
  const days = Array.isArray(snapshot.days) && snapshot.days.length > 0
    ? snapshot.days
    : [
        {
          dateKey: getDateKeyInTimezone(now, timezone),
          weekdayDari: snapshot.weekdayDari,
          shamsiDisplay: snapshot.shamsiDisplay,
          hijriDisplay: snapshot.hijriDisplay,
          gregorianDisplay: snapshot.gregorianDisplay,
          prayers: snapshot.prayers,
        },
      ];

  const active = selectDay(days, now, timezone) || days[0];
  const truth = getCalendarTruth(now);

  return {
    ...snapshot,
    version: 2,
    updatedAt: now.toISOString(),
    days,
    weekdayDari: active?.weekdayDari || WEEKDAYS_DARI[truth.weekday],
    shamsiDisplay: active?.shamsiDisplay || formatShamsiSlash(truth.shamsi),
    hijriDisplay:
      active?.hijriDisplay ||
      `${toArabicNumerals(truth.hijri.day)} ${truth.hijri.monthNameDari} ${toArabicNumerals(truth.hijri.year)}`,
    gregorianDisplay: active?.gregorianDisplay || formatGregorianDisplay(truth.gregorianDate),
    currentPrayer: getCurrentPrayerFromEntries(active.prayers, now),
    prayers: active.prayers,
    nextRefreshAtMs: computeNextRefreshAtMs(days, timezone, now),
  };
}

export function parseWidgetSnapshot(raw: string | null | undefined): WidgetSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      version?: number;
      updatedAt?: string;
      cityName?: string;
      timezone?: string;
      policyVersion?: number;
      sourceLabel?: string;
      days?: WidgetDaySnapshot[];
      weekdayDari?: string;
      shamsiDisplay?: string;
      hijriDisplay?: string;
      gregorianDisplay?: string;
      currentPrayer?: WidgetPrayerKey | null;
      prayers?: WidgetPrayerEntry[];
      nextRefreshAtMs?: number;
    };
    if (!parsed || (parsed.version !== 1 && parsed.version !== 2)) return null;
    if ((!Array.isArray(parsed.prayers) || parsed.prayers.length === 0) &&
      (!Array.isArray(parsed.days) || parsed.days.length === 0)) {
      return null;
    }

    if (parsed.version === 1) {
      const timezone = 'Asia/Kabul';
      const day: WidgetDaySnapshot = {
        dateKey: getDateKeyInTimezone(new Date(parsed.updatedAt || Date.now()), timezone),
        weekdayDari: parsed.weekdayDari || '',
        shamsiDisplay: parsed.shamsiDisplay || '',
        hijriDisplay: parsed.hijriDisplay || '',
        gregorianDisplay: parsed.gregorianDisplay || '',
        prayers: parsed.prayers || [],
      };
      return refreshWidgetSnapshot({
        version: 2,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        cityName: parsed.cityName || '',
        timezone,
        policyVersion: PRAYER_POLICY_VERSION,
        days: [day],
        weekdayDari: day.weekdayDari,
        shamsiDisplay: day.shamsiDisplay,
        hijriDisplay: day.hijriDisplay,
        gregorianDisplay: day.gregorianDisplay,
        currentPrayer: parsed.currentPrayer ?? null,
        prayers: day.prayers,
        nextRefreshAtMs: parsed.nextRefreshAtMs || Date.now() + 30 * 60 * 1000,
      });
    }

    if (!parsed.prayers?.every((entry) => typeof entry?.atMs === 'number' && typeof entry?.key === 'string')) {
      return null;
    }
    return {
      version: 2,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      cityName: parsed.cityName || '',
      timezone: parsed.timezone || 'Asia/Kabul',
      policyVersion: parsed.policyVersion || PRAYER_POLICY_VERSION,
      sourceLabel: parsed.sourceLabel,
      days: parsed.days || [],
      weekdayDari: parsed.weekdayDari || '',
      shamsiDisplay: parsed.shamsiDisplay || '',
      hijriDisplay: parsed.hijriDisplay || '',
      gregorianDisplay: parsed.gregorianDisplay || '',
      currentPrayer: parsed.currentPrayer ?? null,
      prayers: parsed.prayers || [],
      nextRefreshAtMs: parsed.nextRefreshAtMs || Date.now() + 30 * 60 * 1000,
    };
  } catch {
    return null;
  }
}

export function listWidgetTimelineBoundaries(snapshot: WidgetSnapshot, now: Date = new Date()): number[] {
  const timezone = snapshot.timezone || 'Asia/Kabul';
  const boundaries = new Set<number>();
  boundaries.add(now.getTime());
  for (const day of snapshot.days || []) {
    for (const prayer of day.prayers) {
      if (prayer.atMs >= now.getTime() - 60_000) {
        boundaries.add(prayer.atMs);
      }
    }
  }
  // Midnights for stored horizon
  const startKey = getDateKeyInTimezone(now, timezone);
  for (let i = 0; i < Math.max(1, (snapshot.days || []).length + 1); i += 1) {
    const key = addDaysToDateKey(startKey, i);
    const midnight = nextLocalMidnightMs(
      new Date(now.getTime() + i * 24 * 60 * 60 * 1000),
      timezone,
    );
    // Prefer exact midnight from dateKey via nextLocalMidnight on that day's noon-ish
    boundaries.add(midnight);
    void key;
  }
  return Array.from(boundaries).sort((a, b) => a - b);
}
