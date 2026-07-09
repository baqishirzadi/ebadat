import { normalizeCityKey } from '@/utils/cities';
import type { Location as LocationType, PrayerTimes } from '@/utils/prayerTimes';

export const MAGHRIB_OFFSET_MINUTES = 3;
export const KABUL_DHUHR_OFFSET_MINUTES = 20;

const KABUL_COORDS = { latitude: 34.5553, longitude: 69.2075 };
const KABUL_GPS_RADIUS_KM = 45;

function isKabulCityKey(cityKey?: string | null): boolean {
  return normalizeCityKey(cityKey) === 'afghanistan_kabul';
}

function isWithinKabulRadius(location: LocationType): boolean {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(location.latitude - KABUL_COORDS.latitude);
  const dLon = toRad(location.longitude - KABUL_COORDS.longitude);
  const lat1 = toRad(KABUL_COORDS.latitude);
  const lat2 = toRad(location.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c <= KABUL_GPS_RADIUS_KM;
}

export function shouldApplyKabulDhuhrOffset(
  cityKey?: string | null,
  location?: LocationType,
): boolean {
  if (isKabulCityKey(cityKey)) return true;
  if (cityKey) return false;
  return location ? isWithinKabulRadius(location) : false;
}

export function applyPrayerTimeOffsets(
  times: PrayerTimes,
  cityKey?: string | null,
  location?: LocationType,
): PrayerTimes {
  const maghrib = new Date(times.maghrib.getTime() + MAGHRIB_OFFSET_MINUTES * 60 * 1000);
  const dhuhr = shouldApplyKabulDhuhrOffset(cityKey, location)
    ? new Date(times.dhuhr.getTime() + KABUL_DHUHR_OFFSET_MINUTES * 60 * 1000)
    : times.dhuhr;

  return {
    ...times,
    maghrib,
    dhuhr,
  };
}
