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

export { CityKey } from '@/utils/prayerTimesManager';

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
      } else {
        // Try legacy format
        if (saved && saved.startsWith('afghanistan_')) {
          setSelectedCity(saved as CityKey);
        } else {
          setSelectedCity('afghanistan_kabul'); // Default
        }
      }
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
