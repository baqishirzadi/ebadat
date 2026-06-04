import { CityKey, getCity } from '@/utils/cities';
import { getSavedPrayerCityKey } from '@/utils/prayerOnboarding';
import type { Location as LocationType } from '@/utils/prayerTimes';

export type SetCustomLocationFn = (
  location: LocationType,
  name: string,
  cityKey?: string,
) => void | Promise<void>;

export function isLocationReadyForQibla(
  selectedCity: string | null | undefined,
  savedCityKey?: string | null,
): boolean {
  if (selectedCity) return true;
  if (!savedCityKey) return false;
  return Boolean(getCity(savedCityKey as CityKey));
}

/**
 * Sync PrayerContext with city saved during first-open / prayer tab setup.
 */
export async function hydratePrayerCityFromStorage(
  setCustomLocation: SetCustomLocationFn,
  currentSelectedCity?: string | null,
): Promise<boolean> {
  if (currentSelectedCity) {
    return true;
  }

  const savedKey = await getSavedPrayerCityKey();
  if (!savedKey) {
    return false;
  }

  const city = getCity(savedKey as CityKey);
  if (!city) {
    return false;
  }

  await setCustomLocation(
    {
      latitude: city.lat,
      longitude: city.lon,
      altitude: city.altitude || 0,
      timezone: city.timezone,
    },
    city.name,
    city.key,
  );
  return true;
}
