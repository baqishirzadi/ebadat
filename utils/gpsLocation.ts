/**
 * GPS Location Utilities
 * Handles GPS-based city detection with reverse geocode + nearest city matching
 */

import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { getCity, type CityKey } from './cities';
import {
  findNearestWorldCityWithFallback,
  findProvinceByAdmin,
  loadCriticalCityRegions,
  NEAREST_WORLD_CITY_FALLBACK_MAX_KM,
  NEAREST_WORLD_CITY_MAX_KM,
} from './cityDatabase';

export interface LocationResult {
  success: boolean;
  cityKey: CityKey | null;
  cityName?: string;
  citySubtitle?: string;
  coordinates?: { lat: number; lon: number };
  warning?: boolean;
  error?: string;
}

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
}

export async function isLocationEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return 'geolocation' in navigator;
  }

  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}

async function resolveCityFromCoords(
  lat: number,
  lon: number,
): Promise<LocationResult> {
  await loadCriticalCityRegions();

  let countryCode: string | undefined;
  let regionName: string | undefined;

  try {
    const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    const place = places[0];
    if (place) {
      countryCode = place.isoCountryCode ?? undefined;
      regionName = place.region ?? place.subregion ?? undefined;
    }
  } catch {
    // reverse geocode optional — fall back to nearest city
  }

  if (countryCode && regionName) {
    const provinceMatch = findProvinceByAdmin(countryCode, regionName);
    if (provinceMatch) {
      const city = getCity(provinceMatch.key);
      return {
        success: true,
        cityKey: provinceMatch.key as CityKey,
        cityName: city?.name ?? provinceMatch.city.name,
        citySubtitle: provinceMatch.city.countryName,
        coordinates: { lat, lon },
      };
    }
  }

  const nearest = findNearestWorldCityWithFallback(lat, lon, countryCode);

  if (!nearest.key) {
    return {
      success: false,
      cityKey: null,
      error: nearest.distanceKm > NEAREST_WORLD_CITY_FALLBACK_MAX_KM
        ? `هیچ شهر یا استانی در شعاع ${NEAREST_WORLD_CITY_FALLBACK_MAX_KM} کیلومتری یافت نشد`
        : 'شهر یا استانی یافت نشد',
    };
  }

  const city = getCity(nearest.key);
  return {
    success: true,
    cityKey: nearest.key as CityKey,
    cityName: city?.name ?? 'نامشخص',
    citySubtitle: city?.admin1 ?? city?.country,
    coordinates: { lat, lon },
    warning: nearest.warning,
    error: nearest.warning
      ? `شهر/استان نزدیک در فاصله ${Math.round(nearest.distanceKm)} کیلومتر یافت شد؛ در صورت نیاز دستی تغییر دهید`
      : undefined,
  };
}

export async function detectLocationAndFindCity(): Promise<LocationResult> {
  try {
    if (Platform.OS === 'web') {
      return { success: false, cityKey: null, error: 'GPS در وب پشتیبانی نمی‌شود' };
    }

    const servicesOn = await isLocationEnabled();
    if (!servicesOn) {
      return {
        success: false,
        cityKey: null,
        error: 'لطفاً موقعیت‌یاب (GPS) دستگاه را روشن کنید',
      };
    }

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return {
        success: false,
        cityKey: null,
        error: 'اجازه دسترسی به موقعیت داده نشد',
      };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return resolveCityFromCoords(location.coords.latitude, location.coords.longitude);
  } catch (error) {
    console.error('Error detecting location:', error);
    return {
      success: false,
      cityKey: null,
      error: error instanceof Error ? error.message : 'خطا در تشخیص موقعیت',
    };
  }
}

export { NEAREST_WORLD_CITY_MAX_KM, NEAREST_WORLD_CITY_FALLBACK_MAX_KM };
