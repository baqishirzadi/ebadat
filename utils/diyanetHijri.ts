/**
 * Diyanet Hijri dates for the Turkish UI only.
 * Afghan `gregorianToHijri` is unchanged and is not used here.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  fetchDiyanetMonth,
  resolveDiyanetDistrictId,
  type DiyanetDay,
  type DiyanetHijriDate,
} from '@/utils/diyanetClient';
import {
  addIstanbulCivilDays,
  daysInGregorianMonth,
  getIstanbulDateParts,
  ISTANBUL_TIME_ZONE,
  istanbulNoon,
} from '@/utils/istanbulCalendar';
import { clampHijriOffsetDays, getUserHijriOffsetDays } from '@/utils/hijriOffset';
import { getSpecialDayInfo, HIJRI_MONTHS, type HijriDate } from '@/utils/islamicCalendar';

const STORAGE_KEY = '@ebadat/diyanet_hijri_v1';
const ISTANBUL_DISTRICT_KEY = 'turkey_province_istanbul';

const ISTANBUL_LOOKUP_CITY = {
  name: 'İstanbul',
  nameEn: 'Istanbul',
  key: ISTANBUL_DISTRICT_KEY,
  lat: 41.01384,
  lon: 28.94966,
  timezone: 'Europe/Istanbul',
};

type HijriCache = Record<string, DiyanetHijriDate>;

let memory: HijriCache | null = null;
let loadPromise: Promise<void> | null = null;
const monthInflight = new Map<string, Promise<void>>();
const monthStartCache = new Map<string, Date | null>();
const listeners = new Set<() => void>();

let umalquraFormatter: Intl.DateTimeFormat | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeDiyanetHijri(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function buildHijriDate(year: number, month: number, day: number): HijriDate {
  const monthInfo = HIJRI_MONTHS[month - 1];
  return {
    year,
    month,
    day,
    monthName: monthInfo?.english ?? '',
    monthNameArabic: monthInfo?.arabic ?? '',
    monthNameDari: monthInfo?.dari ?? '',
    monthNamePashto: monthInfo?.pashto ?? '',
  };
}

async function loadCache(): Promise<void> {
  if (memory) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        memory = raw ? (JSON.parse(raw) as HijriCache) : {};
      } catch {
        memory = {};
      }
    })();
  }
  await loadPromise;
}

async function persistCache(): Promise<void> {
  if (!memory) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // Best-effort.
  }
}

export function rememberDiyanetHijriDays(days: DiyanetDay[]): void {
  if (!memory) memory = {};
  let changed = false;
  for (const day of days) {
    if (!day.date || !day.hijri) continue;
    const previous = memory[day.date];
    if (
      previous &&
      previous.year === day.hijri.year &&
      previous.month === day.hijri.month &&
      previous.day === day.hijri.day
    ) {
      continue;
    }
    memory[day.date] = day.hijri;
    changed = true;
  }
  if (!changed) return;
  monthStartCache.clear();
  void persistCache();
  emit();
}

function monthIsComplete(year: number, month: number): boolean {
  if (!memory) return false;
  const total = daysInGregorianMonth(year, month);
  for (let day = 1; day <= total; day += 1) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!memory[key]) return false;
  }
  return true;
}

/** Offline stand-in: Umm al-Qura at Istanbul noon, with no Afghan day shift. */
function umalquraAtIstanbul(date: Date): HijriDate {
  const noon = istanbulNoon(
    getIstanbulDateParts(date).year,
    getIstanbulDateParts(date).month,
    getIstanbulDateParts(date).day,
  );
  try {
    if (!umalquraFormatter) {
      umalquraFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        timeZone: ISTANBUL_TIME_ZONE,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });
    }
    const parts = umalquraFormatter.formatToParts(noon);
    const lookup = (type: string) => parts.find((part) => part.type === type)?.value;
    const year = Number.parseInt(lookup('year') || '', 10);
    const month = Number.parseInt(lookup('month') || '', 10);
    const day = Number.parseInt(lookup('day') || '', 10);
    if (
      Number.isFinite(year) &&
      Number.isFinite(month) &&
      Number.isFinite(day) &&
      month >= 1 &&
      month <= 12
    ) {
      return buildHijriDate(year, month, day);
    }
  } catch {
    // Fall through.
  }
  return buildHijriDate(1, 1, 1);
}

/** Gregorian instant → Diyanet Hijri for that Istanbul civil day. */
export function gregorianToDiyanetHijri(date: Date = new Date()): HijriDate {
  const parts = getIstanbulDateParts(date);
  const cached = memory?.[parts.dateKey];
  if (cached) return buildHijriDate(cached.year, cached.month, cached.day);
  return umalquraAtIstanbul(date);
}

function shiftIstanbulDate(date: Date, deltaDays: number): Date {
  if (deltaDays === 0) return date;
  const parts = getIstanbulDateParts(date);
  const shifted = addIstanbulCivilDays(parts.year, parts.month, parts.day, deltaDays);
  return istanbulNoon(shifted.year, shifted.month, shifted.day);
}

/**
 * Diyanet date shown to the user. The moon-sighting correction moves the
 * lunar label without changing the official day table.
 */
export function gregorianToDisplayDiyanetHijri(
  date: Date = new Date(),
  offsetDays: number = getUserHijriOffsetDays(),
): HijriDate {
  return gregorianToDiyanetHijri(shiftIstanbulDate(date, clampHijriOffsetDays(offsetDays)));
}

export async function ensureDiyanetHijriMonth(year: number, month: number): Promise<void> {
  await loadCache();
  emit();
  if (monthIsComplete(year, month)) return;

  const key = `${year}-${month}`;
  const existing = monthInflight.get(key);
  if (existing) return existing;

  const task = (async () => {
    try {
      const districtId = await resolveDiyanetDistrictId(ISTANBUL_DISTRICT_KEY, ISTANBUL_LOOKUP_CITY);
      if (!districtId) return;
      const days = await fetchDiyanetMonth(districtId, year, month);
      rememberDiyanetHijriDays(days);
    } catch {
      // Keep the Umm al-Qura stand-in until a later fetch succeeds.
    }
  })();

  monthInflight.set(key, task);
  try {
    await task;
  } finally {
    monthInflight.delete(key);
  }
}

function findDiyanetMonthStart(hijriYear: number, hijriMonth: number): Date | null {
  const cacheKey = `${hijriYear}-${hijriMonth}`;
  if (monthStartCache.has(cacheKey)) return monthStartCache.get(cacheKey) ?? null;

  let cursor = { year: hijriYear + 578, month: 1, day: 1 };
  for (let step = 0; step < 520; step += 1) {
    const date = istanbulNoon(cursor.year, cursor.month, cursor.day);
    const hijri = gregorianToDiyanetHijri(date);
    if (hijri.year === hijriYear && hijri.month === hijriMonth && hijri.day === 1) {
      monthStartCache.set(cacheKey, date);
      return date;
    }
    if (hijri.year > hijriYear || (hijri.year === hijriYear && hijri.month > hijriMonth)) break;
    cursor = addIstanbulCivilDays(cursor.year, cursor.month, cursor.day, 1);
  }

  monthStartCache.set(cacheKey, null);
  return null;
}

/** Istanbul noon whose displayed Diyanet date is the given lunar day. */
export function displayDiyanetHijriToGregorian(
  year: number,
  month: number,
  day: number,
  offsetDays: number = getUserHijriOffsetDays(),
): Date | null {
  const official = diyanetHijriToGregorian(year, month, day);
  if (!official) return null;
  return shiftIstanbulDate(official, -clampHijriOffsetDays(offsetDays));
}

export function diyanetHijriToGregorian(year: number, month: number, day: number): Date | null {
  if (day < 1) return null;
  const start = findDiyanetMonthStart(year, month);
  if (!start) return null;
  const parts = getIstanbulDateParts(start);
  const shifted = addIstanbulCivilDays(parts.year, parts.month, parts.day, day - 1);
  const date = istanbulNoon(shifted.year, shifted.month, shifted.day);
  const resolved = gregorianToDiyanetHijri(date);
  if (resolved.year !== year || resolved.month !== month || resolved.day !== day) return null;
  return date;
}

export function getDiyanetHijriMonthLength(year: number, month: number): number {
  const start = findDiyanetMonthStart(year, month);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextStart = findDiyanetMonthStart(nextYear, nextMonth);
  if (!start || !nextStart) return 30;
  const startParts = getIstanbulDateParts(start);
  const nextParts = getIstanbulDateParts(nextStart);
  const startUtc = Date.UTC(startParts.year, startParts.month - 1, startParts.day);
  const nextUtc = Date.UTC(nextParts.year, nextParts.month - 1, nextParts.day);
  const diff = Math.round((nextUtc - startUtc) / 86400000);
  return diff >= 29 && diff <= 30 ? diff : 30;
}

/** Monday-first column of an Istanbul civil date. Monday = 0 … Sunday = 6. */
export function istanbulMondayColumn(date: Date): number {
  return (getIstanbulDateParts(date).weekday + 6) % 7;
}

const TURKISH_FASTING_SPECIALS: Record<string, string> = {
  '1-9': 'Aşure arifesi',
  '1-10': 'Aşure orucu',
  '8-15': 'Berat orucu',
  '9-1': 'Ramazan başlangıcı',
  '12-9': 'Arefe orucu',
};

/** Fasting note for the Turkish calendar. Null when today is not a fasting day. */
export function turkishFastingLabel(date: Date = new Date()): string | null {
  const hijri = gregorianToDisplayDiyanetHijri(date);
  const special = getSpecialDayInfo(hijri);
  if (special?.isFasting) {
    return TURKISH_FASTING_SPECIALS[`${hijri.month}-${hijri.day}`] ?? 'Sünnet orucu';
  }

  const weekday = getIstanbulDateParts(date).weekday;
  if (weekday === 1) return 'Pazartesi sünnet orucu';
  if (weekday === 4) return 'Perşembe sünnet orucu';
  if (hijri.day >= 13 && hijri.day <= 15) return 'Eyyâm-ı bîz (beyaz günler)';
  return null;
}
