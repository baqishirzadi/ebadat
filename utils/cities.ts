/**
 * Comprehensive City Database
 * Organized by regions/countries with Afghan diaspora
 * Includes coordinates, timezone, and display names
 */

export interface City {
  lat: number;
  lon: number;
  name: string; // Dari/Pashto name
  nameEn: string; // English name
  timezone: string;
  altitude?: number; // in meters
  isImportant?: boolean; // Top 4 cities per category
  country?: string;
  admin1?: string;
  aliases?: string[];
}

export interface CityCategory {
  id: string;
  name: string; // Category name in Dari
  nameEn: string;
  cities: Record<string, City>;
}

export const CITIES: Record<string, CityCategory> = {
  afghanistan: {
    id: 'afghanistan',
    name: 'افغانستان',
    nameEn: 'Afghanistan',
    cities: {
      kabul: { lat: 34.5553, lon: 69.2075, name: 'کابل', nameEn: 'Kabul', timezone: 'Asia/Kabul', altitude: 1791, isImportant: true },
      herat: { lat: 34.3482, lon: 62.1997, name: 'هرات', nameEn: 'Herat', timezone: 'Asia/Kabul', altitude: 920, isImportant: true },
      kandahar: { lat: 31.6295, lon: 65.7372, name: 'قندهار', nameEn: 'Kandahar', timezone: 'Asia/Kabul', altitude: 1005, isImportant: true },
      mazar: { lat: 36.7081, lon: 67.1101, name: 'مزار شریف', nameEn: 'Mazar-i-Sharif', timezone: 'Asia/Kabul', altitude: 380, isImportant: true },
      jalalabad: { lat: 34.4415, lon: 70.4361, name: 'جلال‌آباد', nameEn: 'Jalalabad', timezone: 'Asia/Kabul', altitude: 575, isImportant: true },
      kunduz: { lat: 36.7281, lon: 68.8577, name: 'قندوز', nameEn: 'Kunduz', timezone: 'Asia/Kabul', altitude: 395 },
      ghazni: { lat: 33.5469, lon: 68.4269, name: 'غزنی', nameEn: 'Ghazni', timezone: 'Asia/Kabul', altitude: 2219 },
      bamiyan: { lat: 34.8213, lon: 67.8213, name: 'بامیان', nameEn: 'Bamiyan', timezone: 'Asia/Kabul', altitude: 2550 },
      farah: { lat: 32.3735, lon: 62.1130, name: 'فراه', nameEn: 'Farah', timezone: 'Asia/Kabul', altitude: 660 },
      badakhshan: { lat: 36.7347, lon: 70.8119, name: 'بدخشان', nameEn: 'Badakhshan', timezone: 'Asia/Kabul', altitude: 1250 },
      balkh: { lat: 36.7551, lon: 66.8975, name: 'بلخ', nameEn: 'Balkh', timezone: 'Asia/Kabul', altitude: 330 },
      baghlan: { lat: 36.1307, lon: 68.7083, name: 'بغلان', nameEn: 'Baghlan', timezone: 'Asia/Kabul', altitude: 528 },
      takhar: { lat: 36.7281, lon: 69.5347, name: 'تخار', nameEn: 'Takhar', timezone: 'Asia/Kabul', altitude: 460 },
      samangan: { lat: 36.2653, lon: 68.0167, name: 'سمنگان', nameEn: 'Samangan', timezone: 'Asia/Kabul', altitude: 960 },
      sarepol: { lat: 36.2153, lon: 65.9364, name: 'سرپل', nameEn: 'Sar-e Pol', timezone: 'Asia/Kabul', altitude: 600 },
      laghman: { lat: 34.6667, lon: 70.2000, name: 'لغمان', nameEn: 'Laghman', timezone: 'Asia/Kabul', altitude: 580 },
      kunar: { lat: 34.8500, lon: 71.1500, name: 'کنر', nameEn: 'Kunar', timezone: 'Asia/Kabul', altitude: 850 },
      nuristan: { lat: 35.2500, lon: 70.8333, name: 'نورستان', nameEn: 'Nuristan', timezone: 'Asia/Kabul', altitude: 2000 },
      paktiya: { lat: 33.6000, lon: 69.2167, name: 'پکتیا', nameEn: 'Paktiya', timezone: 'Asia/Kabul', altitude: 2300 },
      khost: { lat: 33.3394, lon: 69.9203, name: 'خوست', nameEn: 'Khost', timezone: 'Asia/Kabul', altitude: 1150 },
      paktika: { lat: 32.5000, lon: 68.8000, name: 'پکتیکا', nameEn: 'Paktika', timezone: 'Asia/Kabul', altitude: 2100 },
      logar: { lat: 34.0167, lon: 69.2167, name: 'لوگر', nameEn: 'Logar', timezone: 'Asia/Kabul', altitude: 1950 },
      wardak: { lat: 34.2333, lon: 68.3667, name: 'وردک', nameEn: 'Wardak', timezone: 'Asia/Kabul', altitude: 2200 },
      maidanwardak: { lat: 34.4000, lon: 68.8333, name: 'میدان وردک', nameEn: 'Maidan Wardak', timezone: 'Asia/Kabul', altitude: 2300 },
      daykundi: { lat: 33.9500, lon: 66.2333, name: 'دایکندی', nameEn: 'Daykundi', timezone: 'Asia/Kabul', altitude: 2200 },
      nimruz: { lat: 31.0333, lon: 62.1000, name: 'نیمروز', nameEn: 'Nimruz', timezone: 'Asia/Kabul', altitude: 480 },
      helmand: { lat: 31.5833, lon: 64.3667, name: 'هلمند', nameEn: 'Helmand', timezone: 'Asia/Kabul', altitude: 700 },
      badghis: { lat: 34.8000, lon: 63.8833, name: 'بادغیس', nameEn: 'Badghis', timezone: 'Asia/Kabul', altitude: 500 },
      ghor: { lat: 34.3500, lon: 65.1500, name: 'غور', nameEn: 'Ghor', timezone: 'Asia/Kabul', altitude: 2200 },
      kapisa: { lat: 34.8667, lon: 69.6167, name: 'کاپیسا', nameEn: 'Kapisa', timezone: 'Asia/Kabul', altitude: 1500 },
      parwan: { lat: 35.1167, lon: 69.2333, name: 'پروان', nameEn: 'Parwan', timezone: 'Asia/Kabul', altitude: 1400 },
      panjshir: { lat: 35.3167, lon: 69.5167, name: 'پنجشیر', nameEn: 'Panjshir', timezone: 'Asia/Kabul', altitude: 2200 },
      zabul: { lat: 32.1333, lon: 67.2833, name: 'زابل', nameEn: 'Zabul', timezone: 'Asia/Kabul', altitude: 1700 },
      uruzgan: { lat: 32.9333, lon: 66.6333, name: 'ارزگان', nameEn: 'Uruzgan', timezone: 'Asia/Kabul', altitude: 2000 },
    },
  },
};

/** Maps deprecated bundled city keys to JSON equivalents */
export const LEGACY_CITY_KEY_ALIASES: Record<string, string> = {
  europe_hamburg: 'germany_province_hamburg',
  europe_berlin: 'germany_province_state_of_berlin',
  iran_tehran: 'iran_province_tehran',
  iran_mashhad: 'iran_province_razavi_khorasan',
  iran_qom: 'iran_province_qom_province',
  iran_isfahan: 'iran_province_isfahan',
  iran_shiraz: 'iran_province_fars',
  iran_tabriz: 'iran_province_east_azerbaijan',
  turkey_istanbul: 'turkey_province_istanbul',
  turkey_ankara: 'turkey_province_ankara',
  turkey_izmir: 'turkey_province_izmir',
  turkey_antalya: 'turkey_province_antalya',
  germany_berlin: 'germany_province_state_of_berlin',
  germany_hamburg: 'germany_province_hamburg',
  germany_munich: 'germany_province_bavaria',
  germany_duesseldorf: 'germany_province_north_rhine_westphalia',
};

// Flatten all cities for easy lookup
export const ALL_CITIES: Record<string, City & { category: string; key: string }> = {};

Object.entries(CITIES).forEach(([categoryId, category]) => {
  Object.entries(category.cities).forEach(([cityKey, city]) => {
    const fullKey = `${categoryId}_${cityKey}`;
    ALL_CITIES[fullKey] = {
      ...city,
      category: categoryId,
      key: fullKey,
    };
  });
});

// Get city by full key (resolves legacy aliases + world database)
export function getCity(fullKey: string): (City & { category: string; key: string }) | undefined {
  return resolveCityKey(fullKey);
}

/** Normalize short/legacy keys (e.g. "kabul") to full keys ("afghanistan_kabul"). */
export function normalizeCityKey(cityKey?: string | null): string | undefined {
  if (!cityKey) return undefined;
  if (cityKey.startsWith('afghanistan_') && getCity(cityKey)) return cityKey;
  const prefixed = `afghanistan_${cityKey}`;
  if (getCity(prefixed)) return prefixed;
  if (getCity(cityKey)) return cityKey;
  return undefined;
}

export function isAfghanCityKey(cityKey?: string | null): boolean {
  const normalized = normalizeCityKey(cityKey);
  return Boolean(normalized?.startsWith('afghanistan_'));
}

export const NEAREST_CITY_MAX_KM = 50;

export interface NearestCityResult {
  key: string | null;
  distanceKm: number;
}

// Find nearest city to coordinates within NEAREST_CITY_MAX_KM
export function findNearestCity(lat: number, lon: number): NearestCityResult {
  let nearestKey: string | null = null;
  let minDistance = Infinity;

  Object.entries(ALL_CITIES).forEach(([key, city]) => {
    const distance = calculateDistance(lat, lon, city.lat, city.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearestKey = key;
    }
  });

  if (nearestKey === null || minDistance > NEAREST_CITY_MAX_KM) {
    return { key: null, distanceKm: minDistance };
  }

  return { key: nearestKey, distanceKm: minDistance };
}

/** @deprecated Use findNearestCity() which returns { key, distanceKm } */
export function findNearestCityLegacy(lat: number, lon: number): string | null {
  return findNearestCity(lat, lon).key;
}

type WorldCityResolver = (key: string) => (City & { category: string; key: string }) | undefined;
let worldCityResolver: WorldCityResolver | null = null;

export function registerWorldCityResolver(resolver: WorldCityResolver): void {
  worldCityResolver = resolver;
}

export function resolveCityKey(fullKey: string): (City & { category: string; key: string }) | undefined {
  const resolvedKey = LEGACY_CITY_KEY_ALIASES[fullKey] ?? fullKey;
  return ALL_CITIES[resolvedKey] ?? worldCityResolver?.(resolvedKey);
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ä/g, 'a')
    .replace(/ß/g, 'ss')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .trim();
}

type SearchMatchRank = 'exact' | 'starts-with' | 'contains';

function getSearchMatchRank(normalizedQuery: string, normalizedField: string): SearchMatchRank | null {
  if (!normalizedField) return null;
  if (normalizedField === normalizedQuery) return 'exact';
  if (normalizedField.startsWith(normalizedQuery)) return 'starts-with';
  if (normalizedField.includes(normalizedQuery)) return 'contains';
  return null;
}

function getSearchScore(rank: SearchMatchRank, isImportant?: boolean): number {
  const baseScores: Record<SearchMatchRank, number> = {
    exact: 1000,
    'starts-with': 100,
    contains: 10,
  };
  return baseScores[rank] + (isImportant ? 50 : 0);
}

function getCitySearchFields(city: City): string[] {
  return [city.name, city.nameEn, ...(city.aliases ?? [])];
}

function getBestCitySearchScore(normalizedQuery: string, city: City): number {
  let bestScore = 0;

  for (const field of getCitySearchFields(city)) {
    const normalizedField = normalizeSearchText(field);
    const rank = getSearchMatchRank(normalizedQuery, normalizedField);
    if (rank) {
      bestScore = Math.max(bestScore, getSearchScore(rank, city.isImportant));
    }
  }

  return bestScore;
}

// Search cities by name with normalized matching and ranked results
export function searchCities(query: string): Array<{ key: string; city: City & { category: string } }> {
  if (worldCityResolver) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { searchWorldCities, isRegionLoaded } = require('./cityDatabase') as typeof import('./cityDatabase');
      if (isRegionLoaded('iran') || isRegionLoaded('europe')) {
        return searchWorldCities(query);
      }
    } catch {
      // fall through to bundled search
    }
  }

  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const results: Array<{ key: string; city: City & { category: string }; score: number }> = [];

  Object.entries(ALL_CITIES).forEach(([key, city]) => {
    const score = getBestCitySearchScore(normalizedQuery, city);
    if (score > 0) {
      results.push({ key, city, score });
    }
  });

  return results
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.city.name.localeCompare(b.city.name);
    })
    .map(({ key, city }) => ({ key, city }));
}

// Export category list
export const CATEGORIES = Object.values(CITIES).map(cat => ({
  id: cat.id,
  name: cat.name,
  nameEn: cat.nameEn,
}));

// Export type for city key
export type CityKey = string; // Format: "category_city" e.g., "afghanistan_kabul"

// Get important cities only (top 4 per category)
export function getImportantCities(categoryId?: string): Array<{ key: string; city: City & { category: string } }> {
  const results: Array<{ key: string; city: City & { category: string } }> = [];
  
  if (categoryId) {
    // Get important cities for specific category
    const category = CITIES[categoryId];
    if (category) {
      Object.entries(category.cities).forEach(([cityKey, city]) => {
        if (city.isImportant) {
          results.push({
            key: `${categoryId}_${cityKey}`,
            city: { ...city, category: categoryId },
          });
        }
      });
    }
  } else {
    // Get important cities from all categories
    Object.entries(CITIES).forEach(([catId, category]) => {
      Object.entries(category.cities).forEach(([cityKey, city]) => {
        if (city.isImportant) {
          results.push({
            key: `${catId}_${cityKey}`,
            city: { ...city, category: catId },
          });
        }
      });
    });
  }
  
  return results;
}
