/**
 * Diyanet (Türkiye) prayer times client via ezanvakti.imsakiyem.com.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { City } from '@/utils/cities';

const DIYANET_BASE = 'https://ezanvakti.imsakiyem.com/api';
const DISTRICT_CACHE_KEY = '@ebadat/diyanet_district_map_v1';

export type DiyanetTimings = {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

export type DiyanetDay = {
  date: string; // YYYY-MM-DD
  timings: DiyanetTimings;
};

type DistrictCache = Record<string, string>;

let memoryDistrictCache: DistrictCache | null = null;

async function loadDistrictCache(): Promise<DistrictCache> {
  if (memoryDistrictCache) return memoryDistrictCache;
  try {
    const raw = await AsyncStorage.getItem(DISTRICT_CACHE_KEY);
    memoryDistrictCache = raw ? (JSON.parse(raw) as DistrictCache) : {};
  } catch {
    memoryDistrictCache = {};
  }
  return memoryDistrictCache;
}

async function saveDistrictCache(cache: DistrictCache): Promise<void> {
  memoryDistrictCache = cache;
  try {
    await AsyncStorage.setItem(DISTRICT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Best-effort.
  }
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/province[_-]?/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function extractSearchQueries(city: City & { key?: string }): string[] {
  const queries: string[] = [];
  if (city.nameEn) queries.push(city.nameEn);
  if (city.admin1) {
    // Often province code; nameEn usually better.
  }
  if (city.key) {
    const parts = city.key.split('_').filter((p) => p !== 'turkey' && p !== 'province');
    if (parts.length) queries.push(parts.join(' '));
  }
  // Common central-district aliases for province-level records.
  const aliases: Record<string, string[]> = {
    istanbul: ['Istanbul', 'Fatih'],
    ankara: ['Ankara', 'Cankaya'],
    izmir: ['Izmir', 'Konak'],
    antalya: ['Antalya', 'Muratpasa'],
    bursa: ['Bursa', 'Osmangazi'],
    adana: ['Adana', 'Seyhan'],
  };
  const en = normalizeName(city.nameEn || '');
  for (const [key, list] of Object.entries(aliases)) {
    if (en.includes(key)) {
      queries.push(...list);
    }
  }
  return [...new Set(queries.filter(Boolean))];
}

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function searchDistrictId(query: string): Promise<string | null> {
  const url = `${DIYANET_BASE}/locations/search/districts?q=${encodeURIComponent(query)}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) return null;
  const json = await response.json();
  const rows: Array<{ _id?: string; name?: string; name_en?: string }> = Array.isArray(json?.data)
    ? json.data
    : [];
  if (!rows.length) return null;

  const target = normalizeName(query);
  const exact = rows.find((row) => {
    const n = normalizeName(row.name_en || row.name || '');
    return n === target || n.includes(target) || target.includes(n);
  });
  return (exact || rows[0])?._id || null;
}

export async function resolveDiyanetDistrictId(
  cityKey: string,
  city: City & { key?: string },
): Promise<string | null> {
  const cache = await loadDistrictCache();
  if (cache[cityKey]) return cache[cityKey];

  for (const query of extractSearchQueries({ ...city, key: city.key || cityKey })) {
    try {
      const id = await searchDistrictId(query);
      if (id) {
        cache[cityKey] = id;
        await saveDistrictCache(cache);
        return id;
      }
    } catch {
      // try next query
    }
  }
  return null;
}

function parseDiyanetDate(raw: string): string {
  if (!raw) return '';
  // "2026-07-01T00:00:00.000Z" → civil calendar date from ISO date part
  return raw.slice(0, 10);
}

function mapTimes(times: Record<string, string> | undefined): DiyanetTimings | null {
  if (!times) return null;
  const fajr = times.imsak || times.Imsak;
  const sunrise = times.gunes || times.Gunes;
  const dhuhr = times.ogle || times.Ogle;
  const asr = times.ikindi || times.Ikindi;
  const maghrib = times.aksam || times.Aksam;
  const isha = times.yatsi || times.Yatsi;
  if (!fajr || !sunrise || !dhuhr || !asr || !maghrib || !isha) return null;
  return { fajr, sunrise, dhuhr, asr, maghrib, isha };
}

export async function fetchDiyanetMonth(
  districtId: string,
  year: number,
  month: number,
): Promise<DiyanetDay[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const url = `${DIYANET_BASE}/prayer-times/${districtId}/monthly?startDate=${startDate}&limit=35`;
  const response = await fetchWithTimeout(url, 12_000);
  if (!response.ok) {
    throw new Error(`Diyanet error: ${response.status}`);
  }
  const json = await response.json();
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  const days: DiyanetDay[] = [];
  for (const row of rows) {
    const date = parseDiyanetDate(String(row.date || ''));
    const timings = mapTimes(row.times);
    if (!date || !timings) continue;
    days.push({ date, timings });
  }
  return days;
}
