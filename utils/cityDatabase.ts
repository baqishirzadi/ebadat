/**
 * Lazy-loaded world city database (offline JSON regions).
 * Afghanistan stays in utils/cities.ts for fast onboarding.
 */

import type { City } from './cities';
import { ALL_CITIES, calculateDistance, registerWorldCityResolver, type CityKey } from './cities';

import cityIndex from '@/data/cities/index.json';

export type CityTier = 'province' | 'major';

export interface WorldCity {
  key: string;
  lat: number;
  lon: number;
  name: string;
  nameEn: string;
  timezone: string;
  country?: string;
  admin1?: string;
  admin1Name?: string;
  admin1NameEn?: string;
  countryName?: string;
  tier?: CityTier;
  isImportant?: boolean;
  aliases?: string[];
  population?: number;
}

export interface CityRegionMeta {
  id: string;
  name: string;
  nameEn: string;
}

export const WORLD_REGIONS: CityRegionMeta[] = cityIndex.regions;

const REGION_LOADERS: Record<string, () => WorldCity[]> = {
  iran: () => require('@/data/cities/iran.json'),
  turkey: () => require('@/data/cities/turkey.json'),
  uk: () => require('@/data/cities/uk.json'),
  france: () => require('@/data/cities/france.json'),
  netherlands: () => require('@/data/cities/netherlands.json'),
  germany: () => require('@/data/cities/germany.json'),
  pakistan: () => require('@/data/cities/pakistan.json'),
  gulf: () => require('@/data/cities/gulf.json'),
  russia: () => require('@/data/cities/russia.json'),
  'central-asia': () => require('@/data/cities/central-asia.json'),
  europe: () => require('@/data/cities/europe.json'),
  asia: () => require('@/data/cities/asia.json'),
  americas: () => require('@/data/cities/americas.json'),
  oceania: () => require('@/data/cities/oceania.json'),
  africa: () => require('@/data/cities/africa.json'),
};

const CRITICAL_REGIONS = [
  'iran', 'gulf', 'germany', 'uk', 'france', 'netherlands', 'turkey',
  'pakistan', 'central-asia', 'russia',
];

const loadedRegions = new Set<string>();
const worldCityMap = new Map<string, WorldCity & { category: string }>();
let searchIndexBuilt = false;
let searchEntries: Array<{ key: string; city: WorldCity & { category: string }; searchText: string }> = [];

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

function normalizeAdminName(name: string): string {
  return normalizeSearchText(name).replace(/[^a-z0-9\u0600-\u06ff ]/g, '').trim();
}

function worldCityToLegacy(city: WorldCity, category: string): City & { category: string; key: string } {
  return {
    lat: city.lat,
    lon: city.lon,
    name: city.name,
    nameEn: city.nameEn,
    timezone: city.timezone,
    country: city.country,
    admin1: city.admin1Name ?? city.admin1,
    isImportant: city.isImportant ?? city.tier === 'province',
    aliases: city.aliases,
    category,
    key: city.key,
  };
}

export function getCitySubtitle(city: WorldCity): string {
  const parts: string[] = [];
  if (city.tier === 'major' && city.admin1Name) {
    parts.push(city.admin1Name);
  }
  if (city.countryName) parts.push(city.countryName);
  return parts.join(' • ');
}

export function isRegionLoaded(regionId: string): boolean {
  return loadedRegions.has(regionId);
}

export function getRegionIdForCityKey(cityKey: string): string | null {
  const bundled = ALL_CITIES[cityKey];
  if (bundled) return bundled.category;
  const world = worldCityMap.get(cityKey);
  if (world) return world.category;
  const underscore = cityKey.indexOf('_');
  if (underscore > 0) return cityKey.slice(0, underscore);
  return null;
}

export async function loadCityRegion(regionId: string): Promise<WorldCity[]> {
  if (loadedRegions.has(regionId)) {
    return Array.from(worldCityMap.values()).filter((c) => c.category === regionId);
  }

  const loader = REGION_LOADERS[regionId];
  if (!loader) return [];

  const cities: WorldCity[] = loader();
  for (const city of cities) {
    worldCityMap.set(city.key, { ...city, category: regionId });
  }
  loadedRegions.add(regionId);
  searchIndexBuilt = false;
  return cities;
}

export async function loadCriticalCityRegions(): Promise<void> {
  await Promise.all(CRITICAL_REGIONS.map((id) => loadCityRegion(id)));
}

export async function loadAllCityRegions(): Promise<void> {
  await Promise.all(WORLD_REGIONS.map((r) => loadCityRegion(r.id)));
}

export async function preloadRegionForCityKey(cityKey: string): Promise<void> {
  const regionId = getRegionIdForCityKey(cityKey);
  if (regionId && regionId !== 'afghanistan') {
    await loadCityRegion(regionId);
  }
}

function buildSearchIndex(): void {
  if (searchIndexBuilt) return;
  searchEntries = [];

  Object.values(ALL_CITIES).forEach((city) => {
    const fields = [city.name, city.nameEn, ...(city.aliases ?? [])];
    searchEntries.push({
      key: city.key,
      city: city as WorldCity & { category: string },
      searchText: normalizeSearchText(fields.join(' ')),
    });
  });

  worldCityMap.forEach((city) => {
    const fields = [
      city.name, city.nameEn, city.admin1Name, city.admin1NameEn,
      city.countryName, ...(city.aliases ?? []),
    ];
    searchEntries.push({
      key: city.key,
      city,
      searchText: normalizeSearchText(fields.join(' ')),
    });
  });

  searchIndexBuilt = true;
}

type SearchMatchRank = 'exact' | 'starts-with' | 'contains';

function getSearchMatchRank(normalizedQuery: string, normalizedField: string): SearchMatchRank | null {
  if (!normalizedField) return null;
  if (normalizedField === normalizedQuery) return 'exact';
  if (normalizedField.startsWith(normalizedQuery)) return 'starts-with';
  if (normalizedField.includes(normalizedQuery)) return 'contains';
  return null;
}

function getSearchScore(rank: SearchMatchRank, population = 0, isImportant = false): number {
  const baseScores: Record<SearchMatchRank, number> = {
    exact: 1000,
    'starts-with': 100,
    contains: 10,
  };
  return baseScores[rank] + Math.min(population / 100000, 50) + (isImportant ? 30 : 0);
}

export function searchWorldCities(
  query: string,
  limit = 50,
): Array<{ key: string; city: City & { category: string } }> {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  buildSearchIndex();

  const results: Array<{ key: string; city: City & { category: string }; score: number }> = [];

  for (const entry of searchEntries) {
    const rank = getSearchMatchRank(normalizedQuery, entry.searchText);
    if (!rank) continue;
    const wc = entry.city as WorldCity;
    results.push({
      key: entry.key,
      city: worldCityToLegacy(wc, entry.city.category),
      score: getSearchScore(rank, wc.population ?? 0, wc.isImportant),
    });
  }

  return results
    .sort((a, b) => b.score - a.score || a.city.name.localeCompare(b.city.name, 'fa'))
    .slice(0, limit)
    .map(({ key, city }) => ({ key, city }));
}

export function getWorldCity(key: CityKey): (City & { category: string; key: string }) | undefined {
  const bundled = ALL_CITIES[key];
  if (bundled) return bundled;
  const world = worldCityMap.get(key);
  if (!world) return undefined;
  return worldCityToLegacy(world, world.category);
}

function regionEntries(regionId: string): Array<{ key: string; city: WorldCity & { category: string } }> {
  if (regionId === 'afghanistan') {
    return Object.entries(ALL_CITIES)
      .filter(([, city]) => city.category === 'afghanistan')
      .map(([key, city]) => ({ key, city: city as WorldCity & { category: string } }));
  }

  return Array.from(worldCityMap.values())
    .filter((city) => city.category === regionId)
    .map((city) => ({ key: city.key, city }));
}

export function getCitiesForRegion(regionId: string): Array<{ key: string; city: City & { category: string } }> {
  return regionEntries(regionId).map(({ key, city }) => ({
    key,
    city: worldCityToLegacy(city, regionId),
  }));
}

export function getFeaturedCitiesForRegion(regionId: string): Array<{ key: string; city: City & { category: string } }> {
  if (regionId === 'afghanistan') {
    return getCitiesForRegion('afghanistan');
  }
  return regionEntries(regionId)
    .filter(({ city }) => city.tier === 'province' || city.tier === 'major' || city.isImportant)
    .map(({ key, city }) => ({ key, city: worldCityToLegacy(city, regionId) }));
}

export function getCityDisplaySubtitle(cityKey: string): string {
  const world = worldCityMap.get(cityKey);
  if (world) return getCitySubtitle(world);
  const bundled = ALL_CITIES[cityKey];
  if (bundled?.admin1) return bundled.admin1;
  return '';
}

export function getProvincesForRegion(regionId: string): Array<{ key: string; city: City & { category: string } }> {
  if (regionId === 'afghanistan') {
    return getCitiesForRegion('afghanistan');
  }
  return regionEntries(regionId)
    .filter(({ city }) => city.tier === 'province')
    .map(({ key, city }) => ({ key, city: worldCityToLegacy(city, regionId) }));
}

export function getMajorCitiesForRegion(regionId: string): Array<{ key: string; city: City & { category: string } }> {
  return regionEntries(regionId)
    .filter(({ city }) => city.tier === 'major')
    .map(({ key, city }) => ({ key, city: worldCityToLegacy(city, regionId) }));
}

export const NEAREST_WORLD_CITY_MAX_KM = 80;
export const NEAREST_WORLD_CITY_FALLBACK_MAX_KM = 300;

export interface NearestCityMatch {
  key: string | null;
  distanceKm: number;
  warning?: boolean;
}

function allSearchableCities(): Array<WorldCity & { key: string; category: string }> {
  const list: Array<WorldCity & { key: string; category: string }> = [];
  Object.values(ALL_CITIES).forEach((city) => {
    list.push({ ...city, tier: 'province', isImportant: city.isImportant } as WorldCity & { key: string; category: string });
  });
  worldCityMap.forEach((city) => list.push(city));
  return list;
}

export function findProvinceByAdmin(
  countryCode: string,
  admin1Name: string,
): { key: string; city: WorldCity & { category: string } } | null {
  const normalized = normalizeAdminName(admin1Name);
  if (!normalized) return null;

  for (const city of worldCityMap.values()) {
    if (city.country !== countryCode || city.tier !== 'province') continue;
    const candidates = [city.admin1NameEn, city.admin1Name, city.nameEn, city.name]
      .filter(Boolean)
      .map((n) => normalizeAdminName(n!));
    if (candidates.some((c) => c === normalized || c.includes(normalized) || normalized.includes(c))) {
      return { key: city.key, city };
    }
  }
  return null;
}

export function findNearestWorldCity(
  lat: number,
  lon: number,
  options?: { countryCode?: string; tier?: CityTier; maxKm?: number },
): NearestCityMatch {
  const maxKm = options?.maxKm ?? NEAREST_WORLD_CITY_MAX_KM;
  let nearestKey: string | null = null;
  let minDistance = Infinity;

  for (const city of allSearchableCities()) {
    if (options?.countryCode && city.country !== options.countryCode) continue;
    if (options?.tier && city.tier !== options.tier) continue;
    const distance = calculateDistance(lat, lon, city.lat, city.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearestKey = city.key;
    }
  }

  if (nearestKey === null || minDistance > maxKm) {
    return { key: null, distanceKm: minDistance };
  }

  return { key: nearestKey, distanceKm: minDistance };
}

export function findNearestWorldCityWithFallback(lat: number, lon: number, countryCode?: string): NearestCityMatch {
  const strict = findNearestWorldCity(lat, lon, { countryCode, maxKm: NEAREST_WORLD_CITY_MAX_KM });
  if (strict.key) return strict;

  const relaxed = findNearestWorldCity(lat, lon, { countryCode, maxKm: NEAREST_WORLD_CITY_FALLBACK_MAX_KM });
  if (relaxed.key) {
    return { ...relaxed, warning: true };
  }

  const global = findNearestWorldCity(lat, lon, { maxKm: NEAREST_WORLD_CITY_FALLBACK_MAX_KM });
  if (global.key) {
    return { ...global, warning: true };
  }

  return { key: null, distanceKm: global.distanceKm };
}

export function getAllCategories(): Array<{ id: string; name: string; nameEn: string }> {
  return [
    { id: 'afghanistan', name: 'افغانستان', nameEn: 'Afghanistan' },
    ...WORLD_REGIONS,
  ];
}

registerWorldCityResolver(getWorldCity);
