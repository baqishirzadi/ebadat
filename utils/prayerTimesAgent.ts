/**
 * Prayer Times Agent
 * Fetches AlAdhan API (Hanafi school), caches 30 days, validates against local calculations,
 * and falls back to local calculations if needed.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { getCity, City } from '@/utils/cities';
import {
  calculatePrayerTimes,
  CalculationMethods,
  AsrMethod,
  Location as LocationType,
  PrayerTimes,
  AFGHAN_CITIES,
} from '@/utils/prayerTimes';
import { Coordinates, CalculationMethod, PrayerTimes as AdhanPrayerTimes, Madhab } from 'adhan';

export interface PrayerTimesDisplay {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  date: string;
}

export interface PrayerTimesBundle {
  dateKey: string;
  cityKey?: string;
  timezone?: string;
  source: 'aladhan' | 'cache' | 'fallback';
  validated: boolean;
  times: PrayerTimes;
  display: PrayerTimesDisplay;
}

const CACHE_KEY = '@ebadat/prayer_times_cache_v1';
const CACHE_DAYS = 30;
const ALADHAN_BASE = 'https://api.aladhan.com/v1';
const ALADHAN_METHOD = 1; // Karachi
const ALADHAN_SCHOOL = 1; // Hanafi

const FALLBACK_TZ_OFFSETS: Record<string, number> = {
  'Asia/Kabul': 270,
};

type CachedDay = {
  date: string;
  timings: {
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
  timezone?: string;
  fetchedAt: number;
  source: 'aladhan' | 'fallback';
  validated: boolean;
};

type CachePayload = {
  version: 1;
  cities: Record<
    string,
    {
      updatedAt: number;
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

function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map((v) => parseInt(v, 10));
  return new Date(y, m - 1, d);
}

function parseTimeValue(raw: string): string {
  return raw.split(' ')[0].trim();
}

function format12Hour(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${hours}:${minutesStr} ${ampm}`;
}

function format12HourInTimeZone(date: Date, timeZone?: string): string {
  if (!timeZone) return format12Hour(date);
  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
    return formatted;
  } catch {
    return format12Hour(date);
  }
}

function toArabicNumerals(str: string): string {
  const arabicNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (d) => arabicNumerals[parseInt(d, 10)]);
}

function toDisplay(times: PrayerTimes, date: Date, timeZone?: string): PrayerTimesDisplay {
  return {
    fajr: toArabicNumerals(format12HourInTimeZone(times.fajr, timeZone)),
    sunrise: toArabicNumerals(format12HourInTimeZone(times.sunrise, timeZone)),
    dhuhr: toArabicNumerals(format12HourInTimeZone(times.dhuhr, timeZone)),
    asr: toArabicNumerals(format12HourInTimeZone(times.asr, timeZone)),
    maghrib: toArabicNumerals(format12HourInTimeZone(times.maghrib, timeZone)),
    isha: toArabicNumerals(format12HourInTimeZone(times.isha, timeZone)),
    date: date.toLocaleDateString('fa-AF'),
  };
}

function parseGregorianDate(value: string): string {
  if (!value) return '';
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  if (parts[0].length === 4) {
    return value;
  }
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function getTimezoneOffsetMinutes(timeZone: string | undefined, date: Date): number {
  if (!timeZone) return date.getTimezoneOffset() * -1;
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = dtf.formatToParts(date);
    const lookup = (type: string) => parts.find((p) => p.type === type)?.value || '00';
    const y = lookup('year');
    const m = lookup('month');
    const d = lookup('day');
    const hh = lookup('hour');
    const mm = lookup('minute');
    const ss = lookup('second');
    const asUTC = new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}Z`);
    return Math.round((asUTC.getTime() - date.getTime()) / 60000);
  } catch {
    return FALLBACK_TZ_OFFSETS[timeZone] ?? date.getTimezoneOffset() * -1;
  }
}

function buildDateFromLocalTime(date: Date, time: string, tzOffsetMinutes: number): Date {
  const [hh, mm] = time.split(':').map((v) => parseInt(v, 10));
  const utcMillis =
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hh, mm) -
    tzOffsetMinutes * 60 * 1000;
  return new Date(utcMillis);
}

function minutesFromTimeString(time: string): number {
  const [hh, mm] = time.split(':').map((v) => parseInt(v, 10));
  return hh * 60 + mm;
}

function minutesInTimezone(date: Date, tzOffsetMinutes: number): number {
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  return (utcMinutes + tzOffsetMinutes + 1440) % 1440;
}

async function loadCache(): Promise<CachePayload> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) {
      return { version: 1, cities: {} };
    }
    const parsed = JSON.parse(raw) as CachePayload;
    if (!parsed || parsed.version !== 1) {
      return { version: 1, cities: {} };
    }
    return parsed;
  } catch {
    return { version: 1, cities: {} };
  }
}

async function saveCache(cache: CachePayload): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function pruneCache(cache: CachePayload): CachePayload {
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() - CACHE_DAYS);
  const minKey = getDateKey(minDate);

  Object.keys(cache.cities).forEach((cityKey) => {
    const city = cache.cities[cityKey];
    const pruned: Record<string, CachedDay> = {};
    Object.entries(city.days).forEach(([dateKey, day]) => {
      if (dateKey >= minKey) {
        pruned[dateKey] = day;
      }
    });
    city.days = pruned;
  });

  return cache;
}

function getCityInfo(cityKey?: string, location?: LocationType): { cityKey?: string; city?: City; location: LocationType } {
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
    },
  };
}

async function fetchAlAdhanMonth(city: City, date: Date): Promise<CachedDay[]> {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const params = new URLSearchParams({
    latitude: String(city.lat),
    longitude: String(city.lon),
    method: String(ALADHAN_METHOD),
    school: String(ALADHAN_SCHOOL),
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
  if (!json || !json.data) {
    throw new Error('Invalid AlAdhan response');
  }

  const days: CachedDay[] = json.data.map((item: any) => {
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
      source: 'aladhan',
      validated: true,
    };
  });

  return days.filter((d) => d.date);
}

function calculateWithAdhan(location: LocationType, date: Date): PrayerTimes {
  const coordinates = new Coordinates(location.latitude, location.longitude);
  const params = CalculationMethod.Karachi();
  params.madhab = Madhab.Hanafi;
  const prayerTimes = new AdhanPrayerTimes(coordinates, date, params);
  return {
    fajr: prayerTimes.fajr,
    sunrise: prayerTimes.sunrise,
    dhuhr: prayerTimes.dhuhr,
    asr: prayerTimes.asr,
    maghrib: prayerTimes.maghrib,
    isha: prayerTimes.isha,
    midnight: prayerTimes.middleOfTheNight,
    qiyam: prayerTimes.lastThirdOfTheNight,
  };
}

function validateTimes(
  cached: CachedDay,
  location: LocationType,
  date: Date
): boolean {
  try {
    const tzOffset = getTimezoneOffsetMinutes(cached.timezone || location.timezone, date);
    const apiMinutes = {
      fajr: minutesFromTimeString(cached.timings.fajr),
      sunrise: minutesFromTimeString(cached.timings.sunrise),
      dhuhr: minutesFromTimeString(cached.timings.dhuhr),
      asr: minutesFromTimeString(cached.timings.asr),
      maghrib: minutesFromTimeString(cached.timings.maghrib),
      isha: minutesFromTimeString(cached.timings.isha),
    };

    const adhanTimes = calculateWithAdhan(location, date);
    const calcTimes = calculatePrayerTimes(date, location, 'Karachi', 'Hanafi');

    const adhanMinutes = {
      fajr: minutesInTimezone(adhanTimes.fajr, tzOffset),
      sunrise: minutesInTimezone(adhanTimes.sunrise, tzOffset),
      dhuhr: minutesInTimezone(adhanTimes.dhuhr, tzOffset),
      asr: minutesInTimezone(adhanTimes.asr, tzOffset),
      maghrib: minutesInTimezone(adhanTimes.maghrib, tzOffset),
      isha: minutesInTimezone(adhanTimes.isha, tzOffset),
    };

    const calcMinutes = {
      fajr: minutesInTimezone(calcTimes.fajr, tzOffset),
      sunrise: minutesInTimezone(calcTimes.sunrise, tzOffset),
      dhuhr: minutesInTimezone(calcTimes.dhuhr, tzOffset),
      asr: minutesInTimezone(calcTimes.asr, tzOffset),
      maghrib: minutesInTimezone(calcTimes.maghrib, tzOffset),
      isha: minutesInTimezone(calcTimes.isha, tzOffset),
    };

    const keys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
    let overThreshold = 0;
    const threshold = 20;
    keys.forEach((key) => {
      const diffA = Math.abs(apiMinutes[key] - adhanMinutes[key]);
      const diffB = Math.abs(apiMinutes[key] - calcMinutes[key]);
      if (diffA > threshold && diffB > threshold) {
        overThreshold += 1;
      }
    });

    return overThreshold < 2;
  } catch {
    return true;
  }
}

async function ensureCache(cityKey: string, city: City, date: Date): Promise<CachePayload> {
  const cache = pruneCache(await loadCache());
  const cityCache = cache.cities[cityKey] || { updatedAt: 0, days: {} };

  const todayKey = getDateKey(date);
  const end = new Date(date);
  end.setDate(end.getDate() + CACHE_DAYS - 1);

  const neededMonths = new Set<string>();
  for (let d = new Date(date); d <= end; d.setDate(d.getDate() + 1)) {
    const key = getDateKey(d);
    if (!cityCache.days[key]) {
      neededMonths.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
    }
  }

  const online = await isOnline();
  for (const monthKey of neededMonths) {
    const [year, month] = monthKey.split('-').map((v) => parseInt(v, 10));
    const monthDate = new Date(year, month - 1, 1);
    try {
      if (!online) {
        break;
      }
      const monthDays = await fetchAlAdhanMonth(city, monthDate);
      monthDays.forEach((day) => {
        cityCache.days[day.date] = day;
      });
      cityCache.updatedAt = Date.now();
    } catch (error) {
      if (__DEV__) {
        console.warn('AlAdhan month fetch failed:', error);
      }
    }
  }

  cache.cities[cityKey] = cityCache;
  await saveCache(cache);

  if (!cache.cities[cityKey].days[todayKey]) {
    cache.cities[cityKey] = cityCache;
  }

  return cache;
}

export async function getPrayerTimesForDate(params: {
  cityKey?: string;
  location?: LocationType;
  date?: Date;
}): Promise<PrayerTimesBundle> {
  const date = params.date || new Date();
  const dateKey = getDateKey(date);
  const { cityKey, city, location } = getCityInfo(params.cityKey, params.location);

  let cachedDay: CachedDay | undefined;
  let source: PrayerTimesBundle['source'] = 'fallback';
  let validated = false;
  let timezone = location.timezone;

  if (city && cityKey) {
    const cache = await ensureCache(cityKey, city, date);
    cachedDay = cache.cities[cityKey]?.days[dateKey];
    if (cachedDay) {
      timezone = cachedDay.timezone || timezone;
      validated = validateTimes(cachedDay, location, date);
      cachedDay.validated = validated;
      source = cachedDay.source === 'aladhan' ? 'aladhan' : 'cache';
    }
  }

  if (cachedDay && validated) {
    const tzOffset = getTimezoneOffsetMinutes(timezone, date);
    const fajrDate = buildDateFromLocalTime(date, cachedDay.timings.fajr, tzOffset);
    const maghribDate = buildDateFromLocalTime(date, cachedDay.timings.maghrib, tzOffset);
    const nightDurationMs = ((fajrDate.getTime() + 24 * 60 * 60 * 1000) - maghribDate.getTime());
    const midnightDate = new Date(maghribDate.getTime() + nightDurationMs / 2);
    const qiyamDate = new Date(fajrDate.getTime() - nightDurationMs / 3);
    const times: PrayerTimes = {
      fajr: fajrDate,
      sunrise: buildDateFromLocalTime(date, cachedDay.timings.sunrise, tzOffset),
      dhuhr: buildDateFromLocalTime(date, cachedDay.timings.dhuhr, tzOffset),
      asr: buildDateFromLocalTime(date, cachedDay.timings.asr, tzOffset),
      maghrib: maghribDate,
      isha: buildDateFromLocalTime(date, cachedDay.timings.isha, tzOffset),
      midnight: midnightDate,
      qiyam: qiyamDate,
    };
    return {
      dateKey,
      cityKey,
      timezone,
      source,
      validated,
      times,
      display: toDisplay(times, date, timezone),
    };
  }

  // Fallback calculations (local)
  const times = calculatePrayerTimes(
    date,
    location,
    'Karachi' as keyof typeof CalculationMethods,
    'Hanafi' as AsrMethod
  );

  if (city && cityKey) {
    const cache = pruneCache(await loadCache());
    const fallbackDay: CachedDay = {
      date: dateKey,
      timings: {
        fajr: `${String(times.fajr.getHours()).padStart(2, '0')}:${String(times.fajr.getMinutes()).padStart(2, '0')}`,
        sunrise: `${String(times.sunrise.getHours()).padStart(2, '0')}:${String(times.sunrise.getMinutes()).padStart(2, '0')}`,
        dhuhr: `${String(times.dhuhr.getHours()).padStart(2, '0')}:${String(times.dhuhr.getMinutes()).padStart(2, '0')}`,
        asr: `${String(times.asr.getHours()).padStart(2, '0')}:${String(times.asr.getMinutes()).padStart(2, '0')}`,
        maghrib: `${String(times.maghrib.getHours()).padStart(2, '0')}:${String(times.maghrib.getMinutes()).padStart(2, '0')}`,
        isha: `${String(times.isha.getHours()).padStart(2, '0')}:${String(times.isha.getMinutes()).padStart(2, '0')}`,
      },
      timezone,
      fetchedAt: Date.now(),
      source: 'fallback',
      validated: false,
    };
    const cityCache = cache.cities[cityKey] || { updatedAt: 0, days: {} };
    if (!cityCache.days[dateKey]) {
      cityCache.days[dateKey] = fallbackDay;
      cityCache.updatedAt = Date.now();
      cache.cities[cityKey] = cityCache;
      await saveCache(cache);
    }
  }

  return {
    dateKey,
    cityKey,
    timezone,
    source: 'fallback',
    validated: false,
    times,
    display: toDisplay(times, date, timezone),
  };
}
