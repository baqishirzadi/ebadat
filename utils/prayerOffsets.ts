import { isAfghanCityKey, normalizeCityKey } from '@/utils/cities';
import {
  resolvePrayerCalculationPolicy,
} from '@/utils/prayerCalculationPolicy';
import {
  buildDateFromLocalTimeInTimezone,
  getDateKeyInTimezone,
} from '@/utils/prayerTimezone';
import type { Location as LocationType, PrayerTimes } from '@/utils/prayerTimes';

/** @deprecated Use policy.maghribOffsetMinutes; kept for callers/tests. */
export const MAGHRIB_OFFSET_MINUTES = 3;

/** @deprecated Afghanistan now uses fixed 12:30 Dhuhr. */
export const KABUL_DHUHR_OFFSET_MINUTES = 0;

export function shouldApplyAfghanFixedDhuhr(
  cityKey?: string | null,
  location?: LocationType,
): boolean {
  const policy = resolvePrayerCalculationPolicy(cityKey, location);
  return Boolean(policy.fixedDhuhrLocalTime);
}

/** @deprecated Prefer shouldApplyAfghanFixedDhuhr */
export function shouldApplyKabulDhuhrOffset(
  cityKey?: string | null,
  location?: LocationType,
): boolean {
  return shouldApplyAfghanFixedDhuhr(cityKey, location);
}

export function applyPrayerTimeOffsets(
  times: PrayerTimes,
  cityKey?: string | null,
  location?: LocationType,
): PrayerTimes {
  const policy = resolvePrayerCalculationPolicy(cityKey, location);
  const timezone = location?.timezone || (isAfghanCityKey(cityKey) ? 'Asia/Kabul' : undefined);

  let maghrib = times.maghrib;
  if (policy.maghribOffsetMinutes) {
    maghrib = new Date(times.maghrib.getTime() + policy.maghribOffsetMinutes * 60 * 1000);
  }

  let dhuhr = times.dhuhr;
  if (policy.fixedDhuhrLocalTime) {
    const dateKey = getDateKeyInTimezone(times.dhuhr, timezone);
    dhuhr = buildDateFromLocalTimeInTimezone(
      dateKey,
      policy.fixedDhuhrLocalTime,
      timezone || 'Asia/Kabul',
    );
  }

  return {
    ...times,
    maghrib,
    dhuhr,
  };
}

export function isAfghanistanSchedule(cityKey?: string | null): boolean {
  return isAfghanCityKey(normalizeCityKey(cityKey) ?? cityKey);
}
