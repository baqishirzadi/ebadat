/**
 * Country-aware prayer calculation policy.
 * Single source of truth for AlAdhan method/school, local adhan-js method,
 * Maghrib/Dhuhr adjustments, and Afghanistan fixed Dhuhr.
 */

import { getCity, isAfghanCityKey, normalizeCityKey } from '@/utils/cities';
import type { Location as LocationType } from '@/utils/prayerTimes';
import { MAGHRIB_OFFSET_MINUTES } from '@/utils/adhanSchedulePolicy';

export const PRAYER_POLICY_VERSION = 9;

export type AdhanJsMethodName =
  | 'MuslimWorldLeague'
  | 'Egyptian'
  | 'Karachi'
  | 'UmmAlQura'
  | 'Dubai'
  | 'MoonsightingCommittee'
  | 'NorthAmerica'
  | 'Kuwait'
  | 'Qatar'
  | 'Singapore'
  | 'Tehran'
  | 'Turkey'
  | 'Other';

export type LocalMadhab = 'Hanafi' | 'Shafi';

export type OnlineSourceKind = 'aladhan' | 'diyanet';

export interface PrayerCalculationPolicy {
  countryCode: string;
  sourceLabel: string;
  onlineSource: OnlineSourceKind;
  /** AlAdhan calendar method id (ignored when onlineSource is diyanet). */
  aladhanMethod: number;
  /** AlAdhan school: 0 Shafi, 1 Hanafi */
  aladhanSchool: number;
  adhanJsMethod: AdhanJsMethodName;
  madhab: LocalMadhab;
  /** Universal Maghrib minutes to add after the source prayer time. */
  maghribOffsetMinutes: number;
  /** Absolute Dhuhr at 12:30 in city timezone (every day including Friday). */
  fixedDhuhrLocalTime: string | null;
  policyVersion: number;
}

const DEFAULT_POLICY: PrayerCalculationPolicy = {
  countryCode: 'XX',
  sourceLabel: 'MWL',
  onlineSource: 'aladhan',
  aladhanMethod: 3,
  aladhanSchool: 1,
  adhanJsMethod: 'MuslimWorldLeague',
  madhab: 'Hanafi',
  maghribOffsetMinutes: MAGHRIB_OFFSET_MINUTES,
  fixedDhuhrLocalTime: null,
  policyVersion: PRAYER_POLICY_VERSION,
};

/** ISO country → policy (explicit authoritative mapping). */
const COUNTRY_POLICIES: Record<string, Omit<PrayerCalculationPolicy, 'policyVersion'>> = {
  AF: {
    countryCode: 'AF',
    sourceLabel: 'Karachi+AF',
    onlineSource: 'aladhan',
    aladhanMethod: 1,
    aladhanSchool: 1,
    adhanJsMethod: 'Karachi',
    madhab: 'Hanafi',
    maghribOffsetMinutes: MAGHRIB_OFFSET_MINUTES,
    fixedDhuhrLocalTime: '12:30',
  },
  TR: {
    countryCode: 'TR',
    sourceLabel: 'Diyanet',
    onlineSource: 'diyanet',
    aladhanMethod: 13,
    aladhanSchool: 1,
    adhanJsMethod: 'Turkey',
    madhab: 'Hanafi',
    maghribOffsetMinutes: 0,
    fixedDhuhrLocalTime: null,
  },
  IR: mwlCountry('IR'),
  SA: mwlCountry('SA'),
  EG: mwlCountry('EG'),
  KW: mwlCountry('KW'),
  QA: mwlCountry('QA'),
  AE: mwlCountry('AE'),
  SG: mwlCountry('SG'),
  MY: mwlCountry('MY'),
  ID: mwlCountry('ID'),
  US: mwlCountry('US'),
  CA: mwlCountry('CA'),
  PK: mwlCountry('PK'),
  IN: mwlCountry('IN'),
  BD: mwlCountry('BD'),
};

function mwlCountry(countryCode: string): Omit<PrayerCalculationPolicy, 'policyVersion'> {
  return {
    countryCode,
    sourceLabel: 'MWL',
    onlineSource: 'aladhan',
    aladhanMethod: 3,
    aladhanSchool: 1,
    adhanJsMethod: 'MuslimWorldLeague',
    madhab: 'Hanafi',
    maghribOffsetMinutes: 0,
    fixedDhuhrLocalTime: null,
  };
}

function normalizeCountryCode(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const code = raw.trim().toUpperCase();
  if (code.length === 2) return code;
  return undefined;
}

export function resolveCountryCode(
  cityKey?: string | null,
  location?: LocationType,
): string {
  const normalized = normalizeCityKey(cityKey) ?? cityKey ?? undefined;
  if (isAfghanCityKey(normalized)) return 'AF';

  if (normalized) {
    const city = getCity(normalized);
    const fromCity = normalizeCountryCode(city?.country);
    if (fromCity) return fromCity;

    const prefix = normalized.split('_')[0]?.toLowerCase();
    const prefixMap: Record<string, string> = {
      afghanistan: 'AF',
      turkey: 'TR',
      iran: 'IR',
      saudi: 'SA',
      egypt: 'EG',
      kuwait: 'KW',
      qatar: 'QA',
      uae: 'AE',
      emirates: 'AE',
      singapore: 'SG',
      malaysia: 'MY',
      indonesia: 'ID',
      pakistan: 'PK',
      india: 'IN',
      bangladesh: 'BD',
      usa: 'US',
      canada: 'CA',
      germany: 'DE',
      uk: 'GB',
      britain: 'GB',
    };
    if (prefix && prefixMap[prefix]) return prefixMap[prefix];
  }

  const locationCountry = normalizeCountryCode(location?.countryCode);
  if (locationCountry) return locationCountry;
  if (location?.timezone === 'Asia/Kabul') return 'AF';

  // GPS near Kabul → treat as Afghanistan when no city key.
  if (!normalized && location) {
    const dLat = location.latitude - 34.5553;
    const dLon = location.longitude - 69.2075;
    const approxKm = Math.sqrt(dLat * dLat + dLon * dLon) * 111;
    if (approxKm <= 45) return 'AF';
  }

  return 'XX';
}

export function resolvePrayerCalculationPolicy(
  cityKey?: string | null,
  location?: LocationType,
): PrayerCalculationPolicy {
  const countryCode = resolveCountryCode(cityKey, location);
  const base = COUNTRY_POLICIES[countryCode] ?? {
    ...DEFAULT_POLICY,
    countryCode,
  };
  return {
    ...base,
    // Maghrib is intentionally delayed worldwide, even when country lookup
    // falls through to the generic policy. Regional calculation settings are
    // still selected above and remain unchanged.
    maghribOffsetMinutes: MAGHRIB_OFFSET_MINUTES,
    policyVersion: PRAYER_POLICY_VERSION,
  };
}

export function policyCacheSegment(policy: PrayerCalculationPolicy): string {
  return `p${policy.policyVersion}_${policy.countryCode}_${policy.sourceLabel}`;
}

/** Raw remote timings remain reusable when only the post-source Maghrib
 * adjustment policy changes. Country or source changes still invalidate them. */
export function canReuseRawPrayerCache(previousSegment: string, nextSegment: string): boolean {
  const withoutVersion = (segment: string) => segment.replace(/^p\d+_/, '');
  return withoutVersion(previousSegment) === withoutVersion(nextSegment);
}

/** Keep prayer labels free of calculation metadata; the scheduled time itself
 * already reflects the country policy. */
export function displayPrayerLabel(
  prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha',
  label: string,
  cityKey?: string | null,
  location?: LocationType,
): string {
  void prayer;
  void cityKey;
  void location;
  return label;
}
