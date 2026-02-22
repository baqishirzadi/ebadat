/**
 * GPS Location Utilities
 * Handles GPS-based city detection and nearest city finding
 */

import * as Location from 'expo-location';
import { findNearestCity, getCity, CityKey } from './cities';
import { Platform } from 'react-native';

export interface LocationResult {
  success: boolean;
  cityKey: CityKey | null;
  cityName?: string;
  coordinates?: { lat: number; lon: number };
  error?: string;
}

/**
 * Request location permission and get current location
 */
export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false; // Web doesn't support location in the same way
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
}

/**
 * Get current location and find nearest city
 */
export async function detectLocationAndFindCity(): Promise<LocationResult> {
  try {
    // Request permission
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return {
        success: false,
        cityKey: null,
        error: 'اجازه دسترسی به موقعیت داده نشد',
      };
    }

    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const lat = location.coords.latitude;
    const lon = location.coords.longitude;

    // Find nearest city
    const nearestCityKey = findNearestCity(lat, lon);
    
    if (!nearestCityKey) {
      return {
        success: false,
        cityKey: null,
        error: 'شهری یافت نشد',
      };
    }

    const city = getCity(nearestCityKey);
    
    return {
      success: true,
      cityKey: nearestCityKey,
      cityName: city?.name || 'نامشخص',
      coordinates: { lat, lon },
    };
  } catch (error) {
    console.error('Error detecting location:', error);
    return {
      success: false,
      cityKey: null,
      error: error instanceof Error ? error.message : 'خطا در تشخیص موقعیت',
    };
  }
}

/**
 * Check if location services are enabled
 */
export async function isLocationEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return 'geolocation' in navigator;
  }

  try {
    const enabled = await Location.hasServicesEnabledAsync();
    return enabled;
  } catch {
    return false;
  }
}
