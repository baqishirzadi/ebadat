/**
 * Prayer Times Hook
 * Uses the canonical prayerTimesAgent (country-aware policies + offsets).
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CityKey } from '@/utils/prayerTimesManager';
import { PrayerTimesDisplay, getPrayerTimesForDate } from '@/utils/prayerTimesAgent';
import { CITIES, ALL_CITIES, searchCities, getCity } from '@/utils/cities';
import { detectLocationAndFindCity } from '@/utils/gpsLocation';
import { preloadRegionForCityKey } from '@/utils/cityDatabase';

const SELECTED_CITY_KEY = 'selected_city';

export { CityKey } from '@/utils/prayerTimesManager';

export function usePrayerTimes() {
  const [selectedCity, setSelectedCity] = useState<CityKey | null>(null);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    loadSavedCity();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadTimes = async () => {
      if (!selectedCity) {
        if (!cancelled) {
          setPrayerTimes(null);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      try {
        await preloadRegionForCityKey(selectedCity).catch(() => undefined);
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
      if (saved) {
        await preloadRegionForCityKey(saved).catch(() => undefined);
        if (getCity(saved) || saved in ALL_CITIES || saved.startsWith('afghanistan_')) {
          setSelectedCity(saved as CityKey);
          return;
        }
      }

      setSelectedCity(null);
      setPrayerTimes(null);
      setLoading(false);
    } catch (err) {
      console.error('Error loading city:', err);
      setSelectedCity(null);
      setPrayerTimes(null);
      setLoading(false);
    }
  };

  const changeCity = async (cityKey: CityKey | null) => {
    try {
      if (!cityKey) {
        await AsyncStorage.removeItem(SELECTED_CITY_KEY);
        setSelectedCity(null);
        setPrayerTimes(null);
        setLoading(false);
        return;
      }
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
