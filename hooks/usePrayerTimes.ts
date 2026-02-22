/**
 * Prayer Times Hook
 * Uses adhan library for accurate Hanafi prayer times
 * Supports all cities worldwide with Afghan diaspora
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CityKey } from '@/utils/prayerTimesManager';
import { PrayerTimesDisplay, getPrayerTimesForDate } from '@/utils/prayerTimesAgent';
import { CITIES, ALL_CITIES, searchCities } from '@/utils/cities';
import { detectLocationAndFindCity } from '@/utils/gpsLocation';

const SELECTED_CITY_KEY = 'selected_city';
const AUTO_LOCATION_BOOTSTRAP_KEY = '@ebadat/auto_location_bootstrap_v1';
const TIMEZONE_PREFERRED_CITY: Record<string, CityKey> = {
  'Asia/Kabul': 'afghanistan_kabul',
  'Asia/Tehran': 'iran_tehran',
  'Europe/Istanbul': 'turkey_istanbul',
  'Europe/London': 'europe_london',
  'Europe/Berlin': 'europe_berlin',
  'America/New_York': 'usa_newyork',
  'America/Los_Angeles': 'usa_losangeles',
  'America/Chicago': 'usa_chicago',
  'America/Toronto': 'canada_toronto',
  'America/Vancouver': 'canada_vancouver',
  'Australia/Sydney': 'australia_sydney',
  'Australia/Melbourne': 'australia_melbourne',
  'Australia/Perth': 'australia_perth',
};

export { CityKey } from '@/utils/prayerTimesManager';

function pickCityByTimezone(timezone?: string): CityKey | null {
  if (!timezone) return null;

  const preferredCity = TIMEZONE_PREFERRED_CITY[timezone];
  if (preferredCity && preferredCity in ALL_CITIES) {
    return preferredCity;
  }

  const matches = Object.entries(ALL_CITIES).filter(([, city]) => city.timezone === timezone);
  if (matches.length === 0) return null;

  const timezoneToken = timezone.split('/')[1]?.toLowerCase() ?? '';
  matches.sort((a, b) => {
    const exactTokenDiff =
      Number(b[0].toLowerCase().endsWith(`_${timezoneToken}`)) -
      Number(a[0].toLowerCase().endsWith(`_${timezoneToken}`));
    if (exactTokenDiff !== 0) return exactTokenDiff;

    const importanceDiff = Number(Boolean(b[1].isImportant)) - Number(Boolean(a[1].isImportant));
    if (importanceDiff !== 0) return importanceDiff;
    return a[0].localeCompare(b[0]);
  });

  return matches[0][0] as CityKey;
}

export function usePrayerTimes() {
  const [selectedCity, setSelectedCity] = useState<CityKey>('afghanistan_kabul');
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Load saved city on mount
  useEffect(() => {
    loadSavedCity();
  }, []);

  // Recalculate when city changes
  useEffect(() => {
    let cancelled = false;
    const loadTimes = async () => {
      if (!selectedCity) return;
      setLoading(true);
      try {
        const result = await getPrayerTimesForDate({ cityKey: selectedCity, date: new Date() });
        if (!cancelled) {
          setPrayerTimes(result.display);
        }
      } catch (error) {
        console.error('Error loading prayer times:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    loadTimes();
    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

  const loadSavedCity = async () => {
    try {
      const saved = await AsyncStorage.getItem(SELECTED_CITY_KEY);
      if (saved && saved in ALL_CITIES) {
        setSelectedCity(saved as CityKey);
        return;
      } else {
        // Try legacy format
        if (saved && saved.startsWith('afghanistan_')) {
          setSelectedCity(saved as CityKey);
          return;
        }
      }

      let resolvedCity: CityKey | null = null;
      const bootstrapDone = await AsyncStorage.getItem(AUTO_LOCATION_BOOTSTRAP_KEY);
      if (!bootstrapDone) {
        await AsyncStorage.setItem(AUTO_LOCATION_BOOTSTRAP_KEY, '1');
        const gpsResult = await detectLocationAndFindCity();
        if (gpsResult.success && gpsResult.cityKey && gpsResult.cityKey in ALL_CITIES) {
          resolvedCity = gpsResult.cityKey as CityKey;
        } else {
          console.log('Auto GPS city detection failed, using timezone fallback');
        }
      }

      if (!resolvedCity) {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timezoneCity = pickCityByTimezone(timezone);
        if (timezoneCity) {
          resolvedCity = timezoneCity;
        }
      }

      const finalCity = resolvedCity || 'afghanistan_kabul';
      await AsyncStorage.setItem(SELECTED_CITY_KEY, finalCity);
      setSelectedCity(finalCity);
    } catch (err) {
      console.error('Error loading city:', err);
      setSelectedCity('afghanistan_kabul');
    }
  };

  const changeCity = async (cityKey: CityKey) => {
    try {
      await AsyncStorage.setItem(SELECTED_CITY_KEY, cityKey);
      setSelectedCity(cityKey);
    } catch (err) {
      console.error('Error saving city:', err);
    }
  };

  const detectLocation = async (): Promise<{ success: boolean; cityKey?: CityKey; error?: string }> => {
    setGpsLoading(true);
    try {
      const result = await detectLocationAndFindCity();
      if (result.success && result.cityKey) {
        await changeCity(result.cityKey);
        return { success: true, cityKey: result.cityKey };
      }
      return { success: false, error: result.error || 'خطا در تشخیص موقعیت' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'خطا در تشخیص موقعیت' };
    } finally {
      setGpsLoading(false);
    }
  };

  return {
    prayerTimes,
    selectedCity,
    changeCity,
    detectLocation,
    loading,
    gpsLoading,
    cities: CITIES,
    allCities: ALL_CITIES,
    searchCities,
  };
}
