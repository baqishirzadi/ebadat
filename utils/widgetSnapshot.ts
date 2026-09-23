import { addDaysToDateKey, getDateKeyInTimezone, nextLocalMidnightMs } from '@/utils/prayerTimezone';
import { formatGregorianDateCompact, formatShamsiSlash, WEEKDAYS_DARI } from '@/utils/calendarDisplay';
import { getCalendarTruth } from '@/utils/calendarTruth';
import { formatPrayerTime12h } from '@/utils/formatPrayerTime';
import { toArabicNumerals } from '@/utils/numbers';
import { PRAYER_LABELS_DARI, type PrayerTimes } from '@/utils/prayerTimes';
import { PRAYER_POLICY_VERSION } from '@/utils/prayerCalculationPolicy';
import { MAGHRIB_OFFSET_MINUTES } from '@/utils/adhanSchedulePolicy';
import { getWidgetHadithForDateKey, type WidgetHadith } from '@/utils/widgetHadith';
import type { DailyHadithLanguage } from '@/utils/ahadith/daily';

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
  sunriseDisplay: string;
  hadithText: string;
  hadithSource: string;
  prayers: WidgetPrayerEntry[];
}

export interface WidgetSnapshot {
  /** Snapshot schema. Version 3 adds the inputs required for offline widget calculation. */
  version: 3;
  updatedAt: string;
  cityName: string;
  timezone: string;
  policyVersion: number;
  latitude: number;
  longitude: number;
  altitude: number;
  calculationMethod: string;
  asrMethod: 'Standard' | 'Hanafi';
  maghribOffsetMinutes: number;
  fixedDhuhrLocalTime: string | null;
  sourceLabel?: string;
  days: WidgetDaySnapshot[];
  /** Derived display fields for the active day (kept for renderers). */
  weekdayDari: string;
  shamsiDisplay: string;
  hijriDisplay: string;
  gregorianDisplay: string;
  sunriseDisplay: string;
  hadithText: string;
  hadithSource: string;
  currentPrayer: WidgetPrayerKey | null;
  prayers: WidgetPrayerEntry[];
  nextRefreshAtMs: number;
}

const PRAYER_ORDER: WidgetPrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

function formatGregorianDisplay(gregorianDate: Date): string {
  return formatGregorianDateCompact(gregorianDate);
}

function refreshDayCalendarDisplays(day: WidgetDaySnapshot): WidgetDaySnapshot {
  const date = new Date(`${day.dateKey}T12:00:00+04:30`);
  if (!Number.isFinite(date.getTime())) return day;

  const truth = getCalendarTruth(date);
  return {
    ...day,
    weekdayDari: WEEKDAYS_DARI[truth.weekday],
    shamsiDisplay: formatShamsiSlash(truth.shamsi),
    hijriDisplay: `${toArabicNumerals(truth.hijri.day)} ${truth.hijri.monthNameDari} ${toArabicNumerals(truth.hijri.year)}`,
    gregorianDisplay: formatGregorianDisplay(truth.gregorianDate),
  };
}

function formatSunriseDisplay(prayerTimes: PrayerTimes, timezone: string): string {
  return `طلوع آفتاب ${formatPrayerTime12h(prayerTimes.sunrise, timezone)}`;
}

function buildDaySnapshot(
  prayerTimes: PrayerTimes,
  dateKey: string,
  timezone: string,
  noonAnchor: Date,
  hadith?: WidgetHadith,
  language: DailyHadithLanguage = 'dari',
  maghribOffsetMinutes = 0,
): WidgetDaySnapshot {
  const truth = getCalendarTruth(noonAnchor);
  const dailyHadith = hadith || getWidgetHadithForDateKey(dateKey, language);
  return {
    dateKey,
    weekdayDari: WEEKDAYS_DARI[truth.weekday],
    shamsiDisplay: formatShamsiSlash(truth.shamsi),
    hijriDisplay: `${toArabicNumerals(truth.hijri.day)} ${truth.hijri.monthNameDari} ${toArabicNumerals(truth.hijri.year)}`,
    gregorianDisplay: formatGregorianDisplay(truth.gregorianDate),
    sunriseDisplay: formatSunriseDisplay(prayerTimes, timezone),
    hadithText: dailyHadith.text,
    hadithSource: dailyHadith.source,
    prayers: PRAYER_ORDER.map((key) => ({
      key,
      // The canonical time already includes the country policy. Keep the
      // prayer label itself free of offset metadata.
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
  previousPrayers: WidgetPrayerEntry[] = [],
): WidgetPrayerKey | null {
  const nowMs = now.getTime();
  let current: WidgetPrayerKey | null = null;
  for (const key of PRAYER_ORDER) {
    const entry = prayers.find((prayer) => prayer.key === key);
    if (entry && entry.atMs <= nowMs) {
      current = key;
    }
  }
  if (current) return current;

  // Before today's Fajr, the prayer period that is still active is the
  // previous local day's Isha. This keeps Android in sync with the native
  // widget and avoids a blank highlight after midnight.
  const previousIsha = previousPrayers.find(
    (prayer) => prayer.key === 'isha' && prayer.atMs <= nowMs,
  );
  return previousIsha ? 'isha' : null;
}

function findPreviousDay(days: WidgetDaySnapshot[], active: WidgetDaySnapshot): WidgetDaySnapshot | null {
  return days
    .filter((day) => day.dateKey < active.dateKey)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0] || null;
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

function migrateLegacyMaghribEntries(
  prayers: WidgetPrayerEntry[],
  missingOffsetMinutes: number,
  timezone: string,
): WidgetPrayerEntry[] {
  if (missingOffsetMinutes <= 0) return prayers;
  return prayers.map((entry) => {
    if (entry.key !== 'maghrib') return entry;
    const atMs = entry.atMs + missingOffsetMinutes * 60_000;
    return { ...entry, atMs, time12h: formatPrayerTime12h(new Date(atMs), timezone) };
  });
}

export function buildWidgetSnapshot(
  prayerTimes: PrayerTimes,
  cityName: string,
  now: Date = new Date(),
  options?: {
    timezone?: string;
    sourceLabel?: string;
    location?: { latitude: number; longitude: number; altitude?: number };
    calculationMethod?: string;
    asrMethod?: 'Standard' | 'Hanafi';
    maghribOffsetMinutes?: number;
    fixedDhuhrLocalTime?: string | null;
    appLanguage?: DailyHadithLanguage;
    multiDay?: Array<{ dateKey: string; times: PrayerTimes; noonAnchor: Date }>;
  },
): WidgetSnapshot {
  const timezone = options?.timezone || 'Asia/Kabul';
  const appLanguage = options?.appLanguage || 'dari';
  const maghribOffsetMinutes =
    options?.maghribOffsetMinutes ?? MAGHRIB_OFFSET_MINUTES;
  const todayKey = getDateKeyInTimezone(now, timezone);

  const days: WidgetDaySnapshot[] =
    options?.multiDay && options.multiDay.length > 0
      ? options.multiDay.map((day) =>
          buildDaySnapshot(
            day.times,
            day.dateKey,
            timezone,
            day.noonAnchor,
            undefined,
            appLanguage,
            maghribOffsetMinutes,
          ),
        )
      : [buildDaySnapshot(
          prayerTimes,
          todayKey,
          timezone,
          now,
          undefined,
          appLanguage,
          maghribOffsetMinutes,
        )];

  const active = selectDay(days, now, timezone) || days[0];
  const previous = findPreviousDay(days, active);
  const currentPrayer = getCurrentPrayerFromEntries(active.prayers, now, previous?.prayers);

  return {
    version: 3,
    updatedAt: now.toISOString(),
    cityName,
    timezone,
    policyVersion: PRAYER_POLICY_VERSION,
    latitude: options?.location?.latitude ?? 34.5553,
    longitude: options?.location?.longitude ?? 69.2075,
    altitude: options?.location?.altitude ?? 1791,
    calculationMethod: options?.calculationMethod || 'Karachi',
    asrMethod: options?.asrMethod || 'Hanafi',
    maghribOffsetMinutes,
    fixedDhuhrLocalTime: options?.fixedDhuhrLocalTime ?? null,
    sourceLabel: options?.sourceLabel,
    days,
    weekdayDari: active.weekdayDari,
    shamsiDisplay: active.shamsiDisplay,
    hijriDisplay: active.hijriDisplay,
    gregorianDisplay: active.gregorianDisplay,
    sunriseDisplay: active.sunriseDisplay,
    hadithText: active.hadithText,
    hadithSource: active.hadithSource,
    currentPrayer,
    prayers: active.prayers,
    nextRefreshAtMs: computeNextRefreshAtMs(days, timezone, now),
  };
}

export function refreshWidgetSnapshot(snapshot: WidgetSnapshot, now: Date = new Date()): WidgetSnapshot {
  const timezone = snapshot.timezone || 'Asia/Kabul';
  const todayKey = getDateKeyInTimezone(now, timezone);
  const storedDays = Array.isArray(snapshot.days) && snapshot.days.length > 0
    ? snapshot.days
    : [
        {
          dateKey: getDateKeyInTimezone(now, timezone),
          weekdayDari: snapshot.weekdayDari,
          shamsiDisplay: snapshot.shamsiDisplay,
          hijriDisplay: snapshot.hijriDisplay,
          gregorianDisplay: snapshot.gregorianDisplay,
          sunriseDisplay: snapshot.sunriseDisplay || '',
          hadithText: snapshot.hadithText || getWidgetHadithForDateKey(getDateKeyInTimezone(now, timezone)).text,
          hadithSource: snapshot.hadithSource || getWidgetHadithForDateKey(getDateKeyInTimezone(now, timezone)).source,
          prayers: snapshot.prayers,
        },
      ];
  const days = storedDays.map(refreshDayCalendarDisplays);

  const activeDay = days.find((day) => day.dateKey === todayKey);
  const active = activeDay || days[0];
  const previous = findPreviousDay(days, active);
  // The prayer horizon is intentionally bounded. Even after it expires, the
  // small daily Hadith strip must continue rotating from bundled data without
  // waiting for the app to regenerate a snapshot.
  // The stored day may have been generated several days ago. Always derive
  // the Hadith from today's local key during a widget render so Android's
  // periodic/date rollover update cannot keep displaying a stale entry.
  const dateHadith = getWidgetHadithForDateKey(todayKey);
  const dailyHadith = {
    text: dateHadith.text || activeDay?.hadithText || snapshot.hadithText,
    source: dateHadith.source || activeDay?.hadithSource || snapshot.hadithSource,
  };
  const truth = getCalendarTruth(now);

  return {
    ...snapshot,
    version: 3,
    updatedAt: now.toISOString(),
    days,
    weekdayDari: active?.weekdayDari || WEEKDAYS_DARI[truth.weekday],
    shamsiDisplay: active?.shamsiDisplay || formatShamsiSlash(truth.shamsi),
    hijriDisplay:
      active?.hijriDisplay ||
      `${toArabicNumerals(truth.hijri.day)} ${truth.hijri.monthNameDari} ${toArabicNumerals(truth.hijri.year)}`,
    gregorianDisplay: active?.gregorianDisplay || formatGregorianDisplay(truth.gregorianDate),
    sunriseDisplay: active?.sunriseDisplay || snapshot.sunriseDisplay || '',
    hadithText: dailyHadith.text || snapshot.hadithText || '',
    hadithSource: dailyHadith.source || snapshot.hadithSource || '',
    currentPrayer: getCurrentPrayerFromEntries(active.prayers, now, previous?.prayers),
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
      latitude?: number;
      longitude?: number;
      altitude?: number;
      calculationMethod?: string;
      asrMethod?: 'Standard' | 'Hanafi';
      maghribOffsetMinutes?: number;
      fixedDhuhrLocalTime?: string | null;
      sourceLabel?: string;
      days?: WidgetDaySnapshot[];
      weekdayDari?: string;
      shamsiDisplay?: string;
      hijriDisplay?: string;
      gregorianDisplay?: string;
      sunriseDisplay?: string;
      hadithText?: string;
      hadithSource?: string;
      currentPrayer?: WidgetPrayerKey | null;
      prayers?: WidgetPrayerEntry[];
      nextRefreshAtMs?: number;
    };
    if (!parsed || (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3)) return null;
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
        sunriseDisplay: parsed.sunriseDisplay || '',
        hadithText: parsed.hadithText || getWidgetHadithForDateKey(getDateKeyInTimezone(new Date(parsed.updatedAt || Date.now()), timezone)).text,
        hadithSource: '',
        prayers: (parsed.prayers || []).filter((p): p is WidgetPrayerEntry =>
          PRAYER_ORDER.includes(p.key as WidgetPrayerKey),
        ),
      };
      return refreshWidgetSnapshot({
        version: 3,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        cityName: parsed.cityName || '',
        timezone,
        policyVersion: PRAYER_POLICY_VERSION,
        latitude: 34.5553,
        longitude: 69.2075,
        altitude: 1791,
        calculationMethod: 'Karachi',
        asrMethod: 'Hanafi',
        maghribOffsetMinutes: MAGHRIB_OFFSET_MINUTES,
        fixedDhuhrLocalTime: null,
        days: [day],
        weekdayDari: day.weekdayDari,
        shamsiDisplay: day.shamsiDisplay,
        hijriDisplay: day.hijriDisplay,
        gregorianDisplay: day.gregorianDisplay,
        sunriseDisplay: day.sunriseDisplay,
        hadithText: day.hadithText,
        hadithSource: day.hadithSource,
        currentPrayer: parsed.currentPrayer ?? null,
        prayers: day.prayers,
        nextRefreshAtMs: parsed.nextRefreshAtMs || Date.now() + 30 * 60 * 1000,
      });
    }

    const prayers = (parsed.prayers || []).filter((entry): entry is WidgetPrayerEntry =>
      typeof entry?.atMs === 'number' &&
      typeof entry?.key === 'string' &&
      PRAYER_ORDER.includes(entry.key as WidgetPrayerKey),
    );
    if (prayers.length === 0 && (!parsed.days || parsed.days.length === 0)) {
      return null;
    }

    const timezone = parsed.timezone || 'Asia/Kabul';
    const previousOffset = Number.isFinite(parsed.maghribOffsetMinutes)
      ? parsed.maghribOffsetMinutes!
      : timezone === 'Asia/Kabul'
        ? MAGHRIB_OFFSET_MINUTES
        : 0;
    const missingMaghribOffset = (parsed.policyVersion || 0) < PRAYER_POLICY_VERSION
      ? Math.max(0, MAGHRIB_OFFSET_MINUTES - previousOffset)
      : 0;
    const days = (parsed.days || []).map((day) => ({
      ...day,
      sunriseDisplay: day.sunriseDisplay || parsed.sunriseDisplay || '',
      hadithText: day.hadithText || getWidgetHadithForDateKey(day.dateKey).text,
      hadithSource: day.hadithSource || getWidgetHadithForDateKey(day.dateKey).source,
      prayers: migrateLegacyMaghribEntries(
        (day.prayers || []).filter((entry): entry is WidgetPrayerEntry =>
          typeof entry?.atMs === 'number' &&
          typeof entry?.key === 'string' &&
          PRAYER_ORDER.includes(entry.key as WidgetPrayerKey),
        ),
        missingMaghribOffset,
        timezone,
      ),
    }));
    const migratedPrayers = migrateLegacyMaghribEntries(prayers, missingMaghribOffset, timezone);

    return {
      version: 3,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      cityName: parsed.cityName || '',
      timezone,
      policyVersion: PRAYER_POLICY_VERSION,
      latitude: Number.isFinite(parsed.latitude) ? parsed.latitude! : 34.5553,
      longitude: Number.isFinite(parsed.longitude) ? parsed.longitude! : 69.2075,
      altitude: Number.isFinite(parsed.altitude) ? parsed.altitude! : 1791,
      calculationMethod: parsed.calculationMethod || 'Karachi',
      asrMethod: parsed.asrMethod === 'Standard' ? 'Standard' : 'Hanafi',
      maghribOffsetMinutes: MAGHRIB_OFFSET_MINUTES,
      fixedDhuhrLocalTime: parsed.fixedDhuhrLocalTime ?? null,
      sourceLabel: parsed.sourceLabel,
      days,
      weekdayDari: parsed.weekdayDari || '',
      shamsiDisplay: parsed.shamsiDisplay || '',
      hijriDisplay: parsed.hijriDisplay || '',
      gregorianDisplay: parsed.gregorianDisplay || '',
      sunriseDisplay: parsed.sunriseDisplay || days[0]?.sunriseDisplay || '',
      hadithText: parsed.hadithText || days[0]?.hadithText || '',
      hadithSource: parsed.hadithSource || days[0]?.hadithSource || '',
      currentPrayer:
        parsed.currentPrayer && PRAYER_ORDER.includes(parsed.currentPrayer)
          ? parsed.currentPrayer
          : null,
      prayers: migratedPrayers.length > 0 ? migratedPrayers : days[0]?.prayers || [],
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
