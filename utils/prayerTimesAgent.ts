/**
 * Canonical prayer times agent.
 * Country-aware AlAdhan / Diyanet fetch, policy adjustments, 30-day cache.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  Coordinates,
  CalculationMethod,
  PrayerTimes as AdhanPrayerTimes,
  Madhab,
  SunnahTimes,
} from 'adhan';

import { getCity, City } from '@/utils/cities';
import {
  fetchDiyanetMonth,
  resolveDiyanetDistrictId,
} from '@/utils/diyanetClient';
import {
  PRAYER_POLICY_VERSION,
  PrayerCalculationPolicy,
  canReuseRawPrayerCache,
  policyCacheSegment,
  resolvePrayerCalculationPolicy,
} from '@/utils/prayerCalculationPolicy';
import { applyPrayerTimeOffsets } from '@/utils/prayerOffsets';
import {
  addDaysToDateKey,
  buildDateFromLocalTimeInTimezone,
  format12HourInTimeZone,
  getDateKeyInTimezone,
} from '@/utils/prayerTimezone';
import {
  AFGHAN_CITIES,
  Location as LocationType,
  PrayerTimes,
} from '@/utils/prayerTimes';
import { toArabicNumeralsString } from './numbers';

export interface PrayerTimesDisplay {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  date: string;
}

export type PrayerTimesSource =
  | 'aladhan'
  | 'diyanet'
  | 'cache'
  | 'fallback';

export interface PrayerTimesBundle {
  dateKey: string;
  cityKey?: string;
  timezone?: string;
  source: PrayerTimesSource;
  sourceLabel: string;
  policyVersion: number;
  validated: boolean;
  times: PrayerTimes;
  display: PrayerTimesDisplay;
}

const CACHE_KEY = '@ebadat/prayer_times_cache_v3';
const LEGACY_CACHE_KEYS = ['@ebadat/prayer_times_cache_v2', '@ebadat/prayer_times_cache_v1'];
const CACHE_DAYS = 30;
const ALADHAN_BASE = 'https://api.aladhan.com/v1';

let memoryCache: CachePayload | null = null;
let memoryCacheLoadPromise: Promise<CachePayload> | null = null;

type CachedTimings = {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

type CachedDay = {
  date: string;
  timings: CachedTimings;
  timezone?: string;
  fetchedAt: number;
  source: 'aladhan' | 'diyanet' | 'fallback';
  sourceLabel: string;
  policyVersion: number;
  validated: boolean;
};

type CachePayload = {
  version: 3;
  cities: Record<
    string,
    {
      updatedAt: number;
      policySegment: string;
      days: Record<string, CachedDay>;
    }
  >;
};

async function isOnline(): Promise<boolean> {
  try {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return false;
    if (netInfo.isInternetReachable === false) return false;
    return true;
  } catch {
    return false;
  }
}

function parseTimeValue(raw: string): string {
  return raw.split(' ')[0].trim();
}

function toDisplay(times: PrayerTimes, date: Date, timeZone?: string): PrayerTimesDisplay {
  return {
    fajr: toArabicNumeralsString(format12HourInTimeZone(times.fajr, timeZone)),
    sunrise: toArabicNumeralsString(format12HourInTimeZone(times.sunrise, timeZone)),
    dhuhr: toArabicNumeralsString(format12HourInTimeZone(times.dhuhr, timeZone)),
    asr: toArabicNumeralsString(format12HourInTimeZone(times.asr, timeZone)),
    maghrib: toArabicNumeralsString(format12HourInTimeZone(times.maghrib, timeZone)),
    isha: toArabicNumeralsString(format12HourInTimeZone(times.isha, timeZone)),
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
  };
}

function parseGregorianDate(value: string): string {
  if (!value) return '';
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  if (parts[0].length === 4) return value;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function minutesFromTimeString(time: string): number {
  const [hh, mm] = time.split(':').map((v) => parseInt(v, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return NaN;
  return hh * 60 + mm;
}

async function loadCache(): Promise<CachePayload> {
  if (memoryCache) return memoryCache;
  if (memoryCacheLoadPromise) return memoryCacheLoadPromise;

  memoryCacheLoadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (!raw) {
        memoryCache = { version: 3, cities: {} };
        return memoryCache;
      }
      const parsed = JSON.parse(raw) as CachePayload;
      if (!parsed || parsed.version !== 3) {
        memoryCache = { version: 3, cities: {} };
        return memoryCache;
      }
      memoryCache = parsed;
      return memoryCache;
    } catch {
      memoryCache = { version: 3, cities: {} };
      return memoryCache;
    } finally {
      memoryCacheLoadPromise = null;
    }
  })();

  return memoryCacheLoadPromise;
}

async function saveCache(cache: CachePayload): Promise<void> {
  memoryCache = cache;
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  for (const legacy of LEGACY_CACHE_KEYS) {
    try {
      await AsyncStorage.removeItem(legacy);
    } catch {
      // Best-effort.
    }
  }
}

function pruneCache(cache: CachePayload, timeZone?: string): CachePayload {
  const todayKey = getDateKeyInTimezone(new Date(), timeZone);
  const minKey = addDaysToDateKey(todayKey, -CACHE_DAYS);

  Object.keys(cache.cities).forEach((cityKey) => {
    const city = cache.cities[cityKey];
    const pruned: Record<string, CachedDay> = {};
    Object.entries(city.days).forEach(([dateKey, day]) => {
      if (dateKey >= minKey) pruned[dateKey] = day;
    });
    city.days = pruned;
  });

  return cache;
}

function getCityInfo(
  cityKey?: string,
  location?: LocationType,
): { cityKey?: string; city?: City & { category?: string; key?: string }; location: LocationType } {
  if (cityKey) {
    const city = getCity(cityKey);
    if (city) {
      return {
        cityKey,
        city,
        location: {
          latitude: city.lat,
          longitude: city.lon,
          altitude: city.altitude,
          timezone: city.timezone,
          countryCode: city.country,
        },
      };
    }
  }

  if (location) {
    return { cityKey, location, city: undefined };
  }

  const fallback = AFGHAN_CITIES.kabul;
  return {
    cityKey: 'afghanistan_kabul',
    city: getCity('afghanistan_kabul'),
    location: {
      latitude: fallback.latitude,
      longitude: fallback.longitude,
      altitude: fallback.altitude,
      timezone: fallback.timezone,
      countryCode: 'AF',
    },
  };
}

function createAdhanParams(policy: PrayerCalculationPolicy) {
  let params;
  switch (policy.adhanJsMethod) {
    case 'Egyptian':
      params = CalculationMethod.Egyptian();
      break;
    case 'Karachi':
      params = CalculationMethod.Karachi();
      break;
    case 'UmmAlQura':
      params = CalculationMethod.UmmAlQura();
      break;
    case 'Dubai':
      params = CalculationMethod.Dubai();
      break;
    case 'MoonsightingCommittee':
      params = CalculationMethod.MoonsightingCommittee();
      break;
    case 'NorthAmerica':
      params = CalculationMethod.NorthAmerica();
      break;
    case 'Kuwait':
      params = CalculationMethod.Kuwait();
      break;
    case 'Qatar':
      params = CalculationMethod.Qatar();
      break;
    case 'Singapore':
      params = CalculationMethod.Singapore();
      break;
    case 'Tehran':
      params = CalculationMethod.Tehran();
      break;
    case 'Turkey':
      params = CalculationMethod.Turkey();
      break;
    case 'MuslimWorldLeague':
    default:
      params = CalculationMethod.MuslimWorldLeague();
      break;
  }
  params.madhab = policy.madhab === 'Hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  return params;
}

export function calculateWithPolicy(
  location: LocationType,
  date: Date,
  policy: PrayerCalculationPolicy,
): PrayerTimes {
  const coordinates = new Coordinates(location.latitude, location.longitude);
  const params = createAdhanParams(policy);
  const prayerTimes = new AdhanPrayerTimes(coordinates, date, params);
  const sunnahTimes = new SunnahTimes(prayerTimes);
  return {
    fajr: prayerTimes.fajr,
    sunrise: prayerTimes.sunrise,
    dhuhr: prayerTimes.dhuhr,
    asr: prayerTimes.asr,
    maghrib: prayerTimes.maghrib,
    isha: prayerTimes.isha,
    midnight: sunnahTimes.middleOfTheNight,
    qiyam: sunnahTimes.lastThirdOfTheNight,
  };
}

async function fetchAlAdhanMonth(
  city: City,
  dateKeyMonth: string,
  policy: PrayerCalculationPolicy,
): Promise<CachedDay[]> {
  const [yearStr, monthStr] = dateKeyMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const params = new URLSearchParams({
    latitude: String(city.lat),
    longitude: String(city.lon),
    method: String(policy.aladhanMethod),
    school: String(policy.aladhanSchool),
    month: String(month),
    year: String(year),
  });
  if (city.timezone) {
    params.append('timezonestring', city.timezone);
  }
  const response = await fetch(`${ALADHAN_BASE}/calendar?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`AlAdhan error: ${response.status}`);
  }
  const json = await response.json();
  if (!json?.data) throw new Error('Invalid AlAdhan response');

  return json.data
    .map((item: any) => {
      const dateKey = parseGregorianDate(item.date?.gregorian?.date || '');
      const timezone = item.meta?.timezone || city.timezone;
      const timings = item.timings || {};
      return {
        date: dateKey,
        timings: {
          fajr: parseTimeValue(timings.Fajr || '00:00'),
          sunrise: parseTimeValue(timings.Sunrise || '00:00'),
          dhuhr: parseTimeValue(timings.Dhuhr || '00:00'),
          asr: parseTimeValue(timings.Asr || '00:00'),
          maghrib: parseTimeValue(timings.Maghrib || '00:00'),
          isha: parseTimeValue(timings.Isha || '00:00'),
        },
        timezone,
        fetchedAt: Date.now(),
        source: 'aladhan' as const,
        sourceLabel: policy.sourceLabel,
        policyVersion: policy.policyVersion,
        validated: true,
      };
    })
    .filter((d: CachedDay) => d.date);
}

async function fetchDiyanetMonthCached(
  cityKey: string,
  city: City & { key?: string },
  dateKeyMonth: string,
  policy: PrayerCalculationPolicy,
): Promise<CachedDay[]> {
  const districtId = await resolveDiyanetDistrictId(cityKey, { ...city, key: city.key || cityKey });
  if (!districtId) {
    throw new Error('Diyanet district unresolved');
  }
  const [yearStr, monthStr] = dateKeyMonth.split('-');
  const days = await fetchDiyanetMonth(
    districtId,
    parseInt(yearStr, 10),
    parseInt(monthStr, 10),
  );
  return days.map((day) => ({
    date: day.date,
    timings: day.timings,
    timezone: city.timezone || 'Europe/Istanbul',
    fetchedAt: Date.now(),
    source: 'diyanet' as const,
    sourceLabel: policy.sourceLabel,
    policyVersion: policy.policyVersion,
    validated: true,
  }));
}

/** Source-independent structural validation (no Karachi comparison). */
export function validateCachedTimings(timings: CachedTimings): boolean {
  const keys: (keyof CachedTimings)[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const minutes: number[] = [];
  for (const key of keys) {
    const value = timings[key];
    if (!/^\d{1,2}:\d{2}$/.test(value)) return false;
    const mins = minutesFromTimeString(value);
    if (!Number.isFinite(mins) || mins < 0 || mins >= 24 * 60) return false;
    minutes.push(mins);
  }
  // Strict increasing order across the day (allow wrap only for isha after maghrib already checked).
  for (let i = 1; i < minutes.length; i += 1) {
    if (minutes[i] <= minutes[i - 1]) return false;
  }
  // Daylight-ish bound: fajr before noon, maghrib after noon.
  if (minutes[0] >= 12 * 60) return false;
  if (minutes[4] < 12 * 60) return false;
  return true;
}

function timingsToPrayerTimes(
  timings: CachedTimings,
  dateKey: string,
  timezone: string | undefined,
): PrayerTimes {
  const fajrDate = buildDateFromLocalTimeInTimezone(dateKey, timings.fajr, timezone);
  const maghribDate = buildDateFromLocalTimeInTimezone(dateKey, timings.maghrib, timezone);
  const nightDurationMs = fajrDate.getTime() + 24 * 60 * 60 * 1000 - maghribDate.getTime();
  return {
    fajr: fajrDate,
    sunrise: buildDateFromLocalTimeInTimezone(dateKey, timings.sunrise, timezone),
    dhuhr: buildDateFromLocalTimeInTimezone(dateKey, timings.dhuhr, timezone),
    asr: buildDateFromLocalTimeInTimezone(dateKey, timings.asr, timezone),
    maghrib: maghribDate,
    isha: buildDateFromLocalTimeInTimezone(dateKey, timings.isha, timezone),
    midnight: new Date(maghribDate.getTime() + nightDurationMs / 2),
    qiyam: new Date(fajrDate.getTime() - nightDurationMs / 3),
  };
}

function finalizeTimes(
  times: PrayerTimes,
  cityKey: string | undefined,
  location: LocationType,
): PrayerTimes {
  return applyPrayerTimeOffsets(times, cityKey, location);
}

async function ensureCache(
  cityKey: string,
  city: City & { key?: string },
  dateKey: string,
  policy: PrayerCalculationPolicy,
  options?: { horizonDays?: number; allowNetwork?: boolean },
): Promise<CachePayload> {
  const timezone = city.timezone;
  const cache = pruneCache(await loadCache(), timezone);
  const segment = policyCacheSegment(policy);
  let cityCache = cache.cities[cityKey];
  let dirty = false;
  if (!cityCache) {
    cityCache = { updatedAt: 0, policySegment: segment, days: {} };
    dirty = true;
  } else if (cityCache.policySegment !== segment) {
    // The cache stores raw API timings. A policy-version-only change (such as
    // the global Maghrib delay) must not throw away valid source data while
    // offline; finalization applies the current policy after reading it.
    const reusableRawTimings = canReuseRawPrayerCache(cityCache.policySegment, segment);
    cityCache = reusableRawTimings
      ? { ...cityCache, policySegment: segment }
      : { updatedAt: 0, policySegment: segment, days: {} };
    dirty = true;
  }

  // Only fetch the requested day (+ small horizon). Prefetching CACHE_DAYS on every
  // miss pegged Hermes for ~70s on low-end Android during adhan schedule.
  const horizonDays = Math.max(0, Math.min(CACHE_DAYS - 1, options?.horizonDays ?? 2));
  const endKey = addDaysToDateKey(dateKey, horizonDays);
  const neededMonths = new Set<string>();
  for (let cursor = dateKey; cursor <= endKey; cursor = addDaysToDateKey(cursor, 1)) {
    const existing = cityCache.days[cursor];
    const usable =
      existing &&
      existing.policyVersion === policy.policyVersion &&
      (existing.source === 'aladhan' || existing.source === 'diyanet') &&
      validateCachedTimings(existing.timings);
    if (!usable) {
      neededMonths.add(cursor.slice(0, 7));
    }
  }

  // Adhan schedule path must not block on Diyanet/AlAdhan district search + month fetch
  // (can hang 30–70s on low-end devices). Callers can warm the cache later.
  const allowNetwork = options?.allowNetwork !== false;
  const online = allowNetwork && neededMonths.size > 0 ? await isOnline() : false;
  for (const monthKey of neededMonths) {
    if (!online) break;
    try {
      const monthDays =
        policy.onlineSource === 'diyanet'
          ? await fetchDiyanetMonthCached(cityKey, city, monthKey, policy)
          : await fetchAlAdhanMonth(city, monthKey, policy);
      monthDays.forEach((day) => {
        if (validateCachedTimings(day.timings)) {
          cityCache.days[day.date] = { ...day, validated: true };
          dirty = true;
        }
      });
      cityCache.updatedAt = Date.now();
      dirty = true;
    } catch (error) {
      if (__DEV__) {
        console.warn('Prayer month fetch failed:', policy.sourceLabel, error);
      }
    }
  }

  cache.cities[cityKey] = cityCache;
  // Avoid rewriting AsyncStorage on every schedule day lookup — stringify+write
  // of a multi-city month cache pegs Hermes on low-end Android.
  if (dirty) {
    await saveCache(cache);
  } else {
    memoryCache = cache;
  }
  return cache;
}

function localDateForDateKey(dateKey: string, timezone?: string): Date {
  return buildDateFromLocalTimeInTimezone(dateKey, '12:00', timezone);
}

export async function getPrayerTimesForDate(params: {
  cityKey?: string;
  location?: LocationType;
  date?: Date;
  /** Extra days to warm in the same month fetch. Default 2 (not 30). */
  cacheHorizonDays?: number;
  /** When false, read cache only and fall back to local calculation (no network). */
  allowNetwork?: boolean;
}): Promise<PrayerTimesBundle> {
  const anchorDate = params.date || new Date();
  const { cityKey, city, location } = getCityInfo(params.cityKey, params.location);
  const policy = resolvePrayerCalculationPolicy(cityKey, location);
  const timezone = location.timezone || city?.timezone;
  const dateKey = getDateKeyInTimezone(anchorDate, timezone);

  let cachedDay: CachedDay | undefined;
  let source: PrayerTimesSource = 'fallback';
  let validated = false;

  if (city && cityKey) {
    const cache = await ensureCache(cityKey, city, dateKey, policy, {
      horizonDays: params.cacheHorizonDays,
      allowNetwork: params.allowNetwork,
    });
    const candidate = cache.cities[cityKey]?.days[dateKey];
    if (
      candidate &&
      candidate.policyVersion === policy.policyVersion &&
      (candidate.source === 'aladhan' || candidate.source === 'diyanet') &&
      validateCachedTimings(candidate.timings)
    ) {
      cachedDay = candidate;
      validated = true;
      source = candidate.source;
    } else if (candidate && validateCachedTimings(candidate.timings)) {
      cachedDay = candidate;
      validated = true;
      source = 'cache';
    }
  }

  if (cachedDay && validated) {
    const tz = cachedDay.timezone || timezone;
    const raw = timingsToPrayerTimes(cachedDay.timings, dateKey, tz);
    const times = finalizeTimes(raw, cityKey, location);
    return {
      dateKey,
      cityKey,
      timezone: tz,
      source,
      sourceLabel: cachedDay.sourceLabel || policy.sourceLabel,
      policyVersion: policy.policyVersion,
      validated: true,
      times,
      display: toDisplay(times, localDateForDateKey(dateKey, tz), tz),
    };
  }

  const calcDate = localDateForDateKey(dateKey, timezone);
  const raw = calculateWithPolicy(location, calcDate, policy);
  const times = finalizeTimes(raw, cityKey, location);

  return {
    dateKey,
    cityKey,
    timezone,
    source: 'fallback',
    sourceLabel: `${policy.sourceLabel}-local`,
    policyVersion: PRAYER_POLICY_VERSION,
    validated: false,
    times,
    display: toDisplay(times, calcDate, timezone),
  };
}

/** Prefetch multi-day canonical times for widgets / native schedules. */
let offlineRangeCache:
  | { key: string; at: number; bundles: PrayerTimesBundle[] }
  | null = null;
const OFFLINE_RANGE_CACHE_TTL_MS = 60_000;

export async function getPrayerTimesForDateRange(params: {
  cityKey?: string;
  location?: LocationType;
  startDate?: Date;
  days?: number;
  /** When false, skip network month fetches (use cache + local calc). */
  allowNetwork?: boolean;
}): Promise<PrayerTimesBundle[]> {
  const days = Math.max(1, params.days ?? 7);
  const start = params.startDate || new Date();
  const { location } = getCityInfo(params.cityKey, params.location);
  const timezone = location.timezone;
  const startKey = getDateKeyInTimezone(start, timezone);
  const allowNetwork = params.allowNetwork !== false;
  const policy = resolvePrayerCalculationPolicy(params.cityKey, location);
  const cacheKey = `p${policy.policyVersion}_m${policy.maghribOffsetMinutes}|${params.cityKey || ''}|${location.latitude},${location.longitude}|${startKey}|${days}|net=${allowNetwork ? 1 : 0}`;

  if (
    !allowNetwork &&
    offlineRangeCache &&
    offlineRangeCache.key === cacheKey &&
    Date.now() - offlineRangeCache.at < OFFLINE_RANGE_CACHE_TTL_MS
  ) {
    return offlineRangeCache.bundles;
  }

  const results: PrayerTimesBundle[] = [];

  for (let i = 0; i < days; i += 1) {
    const dateKey = addDaysToDateKey(startKey, i);
    const noon = buildDateFromLocalTimeInTimezone(dateKey, '12:00', timezone);
    results.push(
      await getPrayerTimesForDate({
        cityKey: params.cityKey,
        location: params.location,
        date: noon,
        // First call warms the rest of the requested range; later days hit memory cache.
        cacheHorizonDays: Math.max(0, days - 1 - i),
        allowNetwork: params.allowNetwork,
      }),
    );
  }

  if (!allowNetwork) {
    offlineRangeCache = { key: cacheKey, at: Date.now(), bundles: results };
  }
  return results;
}
