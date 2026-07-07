/**
 * Lazy-loaded world city database (offline JSON regions).
 * Afghanistan stays in utils/cities.ts for fast onboarding.
 */

import type { City } from './cities';
import { ALL_CITIES, calculateDistance, registerWorldCityResolver, type CityKey } from './cities';

import cityIndex from '@/data/cities/index.json';

export interface WorldCity {
  key: string;
  lat: number;
  lon: number;
  name: string;
  nameEn: string;
  timezone: string;
  country?: string;
  admin1?: string;
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
  europe: () => require('@/data/cities/europe.json'),
  asia: () => require('@/data/cities/asia.json'),
  americas: () => require('@/data/cities/americas.json'),
  oceania: () => require('@/data/cities/oceania.json'),
  africa: () => require('@/data/cities/africa.json'),
};

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

function worldCityToLegacy(city: WorldCity, category: string): City & { category: string; key: string } {
  return {
    lat: city.lat,
    lon: city.lon,
    name: city.name,
    nameEn: city.nameEn,
    timezone: city.timezone,
    country: city.country,
    admin1: city.admin1,
    aliases: city.aliases,
    category,
    key: city.key,
  };
}

export function isRegionLoaded(regionId: string): boolean {
  return loadedRegions.has(regionId);
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

export async function loadAllCityRegions(): Promise<void> {
  await Promise.all(WORLD_REGIONS.map((r) => loadCityRegion(r.id)));
}

function buildSearchIndex(): void {
  if (searchIndexBuilt) return;
  searchEntries = [];

  Object.values(ALL_CITIES).forEach((city) => {
    const fields = [city.name, city.nameEn, ...(city.aliases ?? [])];
    searchEntries.push({
      key: city.key,
      city,
      searchText: normalizeSearchText(fields.join(' ')),
    });
  });

  worldCityMap.forEach((city) => {
    const fields = [city.name, city.nameEn, ...(city.aliases ?? [])];
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

function getSearchScore(rank: SearchMatchRank, population = 0): number {
  const baseScores: Record<SearchMatchRank, number> = {
    exact: 1000,
    'starts-with': 100,
    contains: 10,
  };
  return baseScores[rank] + Math.min(population / 100000, 50);
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
    const pop = 'population' in entry.city ? (entry.city as WorldCity).population ?? 0 : 0;
    results.push({
      key: entry.key,
      city: entry.city,
      score: getSearchScore(rank, pop),
    });
  }

  return results
    .sort((a, b) => b.score - a.score || a.city.name.localeCompare(b.city.name))
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

export function getCitiesForRegion(regionId: string): Array<{ key: string; city: City & { category: string } }> {
  if (regionId === 'afghanistan') {
    return Object.entries(ALL_CITIES)
      .filter(([, city]) => city.category === 'afghanistan')
      .map(([key, city]) => ({ key, city }));
  }

  return Array.from(worldCityMap.values())
    .filter((city) => city.category === regionId)
    .map((city) => ({ key: city.key, city: worldCityToLegacy(city, regionId) }));
}

export const NEAREST_WORLD_CITY_MAX_KM = 80;

export function findNearestWorldCity(lat: number, lon: number): { key: string | null; distanceKm: number } {
  let nearestKey: string | null = null;
  let minDistance = Infinity;

  const searchIn = (entries: Iterable<{ key: string; lat: number; lon: number }>) => {
    for (const city of entries) {
      const distance = calculateDistance(lat, lon, city.lat, city.lon);
      if (distance < minDistance) {
        minDistance = distance;
        nearestKey = city.key;
      }
    }
  };

  searchIn(Object.values(ALL_CITIES));
  searchIn(worldCityMap.values());

  if (nearestKey === null || minDistance > NEAREST_WORLD_CITY_MAX_KM) {
    return { key: null, distanceKm: minDistance };
  }

  return { key: nearestKey, distanceKm: minDistance };
}

export function getAllCategories(): Array<{ id: string; name: string; nameEn: string }> {
  return [
    { id: 'afghanistan', name: 'افغانستان', nameEn: 'Afghanistan' },
    ...WORLD_REGIONS,
  ];
}

registerWorldCityResolver(getWorldCity);
