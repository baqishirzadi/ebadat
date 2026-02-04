/**
 * Prayer & Location Context
 * Manages prayer times, location, Qibla direction, and Adhan notifications
 */

import { playAdhan } from '@/utils/adhanAudio';
import {
  AdhanPreferences,
  DEFAULT_ADHAN_PREFERENCES,
  getEarlyReminderContent,
  getNotificationContent,
  loadAdhanPreferences,
  PrayerName,
  saveAdhanPreferences
} from '@/utils/adhanManager';
import { gregorianToHijri, HijriDate } from '@/utils/islamicCalendar';
import {
  AFGHAN_CITIES,
  AsrMethod,
  calculatePrayerTimes,
  calculateQibla,
  CalculationMethods,
  DEFAULT_LOCATION,
  Location as LocationType,
  PrayerTimes,
} from '@/utils/prayerTimes';
import { getPrayerTimesForDate } from '@/utils/prayerTimesAgent';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useReducer } from 'react';
import { Platform } from 'react-native';

// Conditional imports - only load on native platforms
// Skip notifications entirely in Expo Go to avoid SDK 53 error
let Location: typeof import('expo-location') | null = null;
let Notifications: typeof import('expo-notifications') | null = null;

// Detect if running in Expo Go
const isExpoGo = (): boolean => {
  try {
    const Constants = require('expo-constants').default;
    return Constants.appOwnership === 'expo' || 
           Constants.executionEnvironment === Constants.ExecutionEnvironment?.StoreClient;
  } catch {
    return false;
  }
};

// Load Location synchronously (safe)
if (Platform.OS !== 'web') {
  try {
    Location = require('expo-location');
  } catch (error) {
    console.warn('expo-location unavailable:', error);
  }
}

// Helper function to safely load Notifications (async to avoid SDK 53 error in Expo Go)
async function loadNotificationsIfAvailable(): Promise<typeof import('expo-notifications') | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  
  if (isExpoGo()) {
    console.log('Skipping expo-notifications: Expo Go detected (SDK 53+ does not support remote push)');
    return null;
  }
  
  if (Notifications) {
    return Notifications;
  }
  
  try {
    Notifications = await import('expo-notifications');
    return Notifications;
  } catch (error) {
    console.warn('expo-notifications unavailable:', error);
    return null;
  }
}

// Storage keys
const STORAGE_KEYS = {
  LOCATION: '@ebadat/location',
  SETTINGS: '@ebadat/prayer_settings',
};

// Settings
interface PrayerSettings {
  calculationMethod: keyof typeof CalculationMethods;
  asrMethod: AsrMethod;
  use24Hour: boolean;
  notificationsEnabled: boolean;
  notificationMinutesBefore: number;
  selectedCity: string | null; // null means auto-detect
}

const DEFAULT_SETTINGS: PrayerSettings = {
  calculationMethod: 'Karachi',
  asrMethod: 'Hanafi',
  use24Hour: false,
  notificationsEnabled: true,
  notificationMinutesBefore: 15,
  selectedCity: null,
};

// State
interface PrayerState {
  location: LocationType;
  locationName: string;
  prayerTimes: PrayerTimes | null;
  qiblaDirection: number;
  hijriDate: HijriDate | null;
  settings: PrayerSettings;
  adhanPreferences: AdhanPreferences;
  isLoading: boolean;
  locationPermission: 'granted' | 'denied' | 'undetermined';
  error: string | null;
}

// Actions
type PrayerAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LOCATION'; payload: { location: LocationType; name: string } }
  | { type: 'SET_PRAYER_TIMES'; payload: PrayerTimes }
  | { type: 'SET_QIBLA'; payload: number }
  | { type: 'SET_HIJRI_DATE'; payload: HijriDate }
  | { type: 'SET_SETTINGS'; payload: Partial<PrayerSettings> }
  | { type: 'SET_ADHAN_PREFERENCES'; payload: AdhanPreferences }
  | { type: 'UPDATE_ADHAN_PREFERENCES'; payload: Partial<AdhanPreferences> }
  | { type: 'SET_PERMISSION'; payload: 'granted' | 'denied' | 'undetermined' }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'INITIALIZE'; payload: { location: LocationType; settings: PrayerSettings; adhanPreferences: AdhanPreferences; name: string } };

// Reducer
function prayerReducer(state: PrayerState, action: PrayerAction): PrayerState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_LOCATION':
      return { ...state, location: action.payload.location, locationName: action.payload.name };
    case 'SET_PRAYER_TIMES':
      return { ...state, prayerTimes: action.payload };
    case 'SET_QIBLA':
      return { ...state, qiblaDirection: action.payload };
    case 'SET_HIJRI_DATE':
      return { ...state, hijriDate: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_ADHAN_PREFERENCES':
      return { ...state, adhanPreferences: action.payload };
    case 'UPDATE_ADHAN_PREFERENCES':
      return { ...state, adhanPreferences: { ...state.adhanPreferences, ...action.payload } };
    case 'SET_PERMISSION':
      return { ...state, locationPermission: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'INITIALIZE':
      return {
        ...state,
        location: action.payload.location,
        locationName: action.payload.name,
        settings: action.payload.settings,
        adhanPreferences: action.payload.adhanPreferences,
        isLoading: false,
      };
    default:
      return state;
  }
}

// Initial state
const initialState: PrayerState = {
  location: DEFAULT_LOCATION,
  locationName: 'کابل',
  prayerTimes: null,
  qiblaDirection: 0,
  hijriDate: null,
  settings: DEFAULT_SETTINGS,
  adhanPreferences: DEFAULT_ADHAN_PREFERENCES,
  isLoading: true,
  locationPermission: 'undetermined',
  error: null,
};

// Context
interface PrayerContextType {
  state: PrayerState;
  refreshPrayerTimes: () => void;
  setCity: (cityKey: string) => void;
  setCustomLocation: (location: LocationType, name: string) => void;
  updateSettings: (settings: Partial<PrayerSettings>) => void;
  updateAdhanPreferences: (preferences: Partial<AdhanPreferences>) => Promise<void>;
  requestLocationPermission: () => Promise<boolean>;
  detectLocation: () => Promise<void>;
  scheduleNotifications: () => Promise<void>;
  scheduleAdhanNotifications: () => Promise<void>;
}

const PrayerContext = createContext<PrayerContextType | undefined>(undefined);

// Provider
export function PrayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(prayerReducer, initialState);

  // Initialize
  useEffect(() => {
    loadSavedData();
  }, []);

  // Update prayer times when location or settings change
  useEffect(() => {
    if (!state.isLoading) {
      updatePrayerTimes().catch((error) => {
        console.warn('updatePrayerTimes failed:', error);
      });
      updateQibla();
      updateHijriDate();
    }
  }, [state.location, state.settings.selectedCity, state.settings.calculationMethod, state.settings.asrMethod, state.isLoading]);

  // Configure notifications (only for native platforms)
  useEffect(() => {
    const setupNotifications = async () => {
      const NotificationsModule = await loadNotificationsIfAvailable();
      if (!NotificationsModule) {
        console.log('Notifications not available (Expo Go or web), skipping setup');
        return;
      }
      
      NotificationsModule.setNotificationHandler({
        handleNotification: async (notification) => {
          const { playSound, type } = notification.request.content.data || {};
          
          // For adhan notifications with sound, ensure audio plays
          return {
            shouldShowAlert: true,
            shouldPlaySound: playSound === true || type === 'adhan',
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        },
      });
      
      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await configureAndroidNotificationChannels(NotificationsModule);
      }
      
      console.log('Notification handler configured');
    };
    
    setupNotifications();
  }, []);

  // Listen for notification received events (foreground) and play Adhan audio
  useEffect(() => {
    let subscription: any = null;
    
    const setupListener = async () => {
      const NotificationsModule = await loadNotificationsIfAvailable();
      if (!NotificationsModule) return;
      
      subscription = NotificationsModule.addNotificationReceivedListener(async (notification: any) => {
        const { prayer, playSound, voice, type } = notification.request.content.data || {};
        
        console.log('Notification received (foreground):', { prayer, playSound, voice, type });
        
        // Only play Adhan audio for adhan notifications with sound enabled
        if (type === 'adhan' && playSound && prayer) {
          try {
            const prayerName = prayer as PrayerName;
            const selectedVoice = (voice as any) || 'barakatullah';
            console.log(`Playing Adhan for ${prayerName} with voice: ${selectedVoice} (foreground)`);
            await playAdhan(selectedVoice, prayerName);
          } catch (error) {
            console.error('Failed to play Adhan from notification (foreground):', error);
          }
        }
      });
    };
    
    setupListener();
    
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // Listen for notification response (when user taps notification - works even if app was killed)
  useEffect(() => {
    let subscription: any = null;
    
    const setupListener = async () => {
      const NotificationsModule = await loadNotificationsIfAvailable();
      if (!NotificationsModule) return;
      
      subscription = NotificationsModule.addNotificationResponseReceivedListener(async (response: any) => {
        const { prayer, playSound, voice, type } = response.notification.request.content.data || {};
        
        console.log('Notification response received (background/killed):', { prayer, playSound, voice, type });
        
        // Play Adhan when user taps notification (even if app was killed)
        if (type === 'adhan' && playSound && prayer) {
          try {
            const prayerName = prayer as PrayerName;
            const selectedVoice = (voice as any) || 'barakatullah';
            console.log(`Playing Adhan for ${prayerName} with voice: ${selectedVoice} (from notification tap)`);
            await playAdhan(selectedVoice, prayerName);
          } catch (error) {
            console.error('Failed to play Adhan from notification response:', error);
          }
        }
      });
    };
    
    setupListener();
    
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // Schedule Adhan notifications when prayer times or preferences change
  useEffect(() => {
    if (state.prayerTimes && state.adhanPreferences.masterEnabled) {
      scheduleAdhanNotifications();
    }
  }, [state.prayerTimes, state.adhanPreferences]);

  async function configureAndroidNotificationChannels(NotificationsModule: typeof import('expo-notifications')) {
    if (Platform.OS !== 'android') return;
    
    try {
      // Channel for Adhan with sound
      // Use default notification sound - playAdhan() will also play for better experience
      await NotificationsModule.setNotificationChannelAsync('adhan-sound', {
        name: 'اذان با صدا',
        importance: NotificationsModule.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1a4d3e',
        sound: 'default', // Use default sound as fallback
        enableVibrate: true,
        showBadge: true,
      });
      
      // Channel for silent prayer reminders
      await NotificationsModule.setNotificationChannelAsync('prayer-silent', {
        name: 'یادآوری نماز (بی‌صدا)',
        importance: NotificationsModule.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 100],
        lightColor: '#1a4d3e',
        sound: undefined, // No sound
        enableVibrate: true,
        showBadge: true,
      });
      
      // Channel for early reminders
      await NotificationsModule.setNotificationChannelAsync('prayer-reminder', {
        name: 'یادآوری قبل از نماز',
        importance: NotificationsModule.AndroidImportance.LOW,
        vibrationPattern: [0, 50],
        lightColor: '#D4AF37',
        sound: undefined,
        enableVibrate: true,
        showBadge: false,
      });
    } catch (error) {
      console.error('Failed to configure notification channels:', error);
    }
  }

  function toCityKey(selectedCity: string | null): string | undefined {
    if (!selectedCity) return undefined;
    if (selectedCity.startsWith('afghanistan_')) return selectedCity;
    if (AFGHAN_CITIES[selectedCity]) {
      return `afghanistan_${selectedCity}`;
    }
    return undefined;
  }

  async function loadPrayerTimesFor(
    location: LocationType,
    selectedCity: string | null,
    settings: PrayerSettings
  ) {
    try {
      const cityKey = toCityKey(selectedCity);
      const result = await getPrayerTimesForDate({ cityKey, location, date: new Date() });
      dispatch({ type: 'SET_PRAYER_TIMES', payload: result.times });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      console.error('Failed to load prayer times (agent):', error);
      const fallback = calculatePrayerTimes(
        new Date(),
        location,
        settings.calculationMethod,
        settings.asrMethod
      );
      dispatch({ type: 'SET_PRAYER_TIMES', payload: fallback });
    }
  }

  async function loadSavedData() {
    try {
      const [locationJson, settingsJson, adhanPrefs] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LOCATION),
        AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
        loadAdhanPreferences(),
      ]);

      const settings = settingsJson ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsJson) } : DEFAULT_SETTINGS;
      
      let location = DEFAULT_LOCATION;
      let name = 'کابل';

      if (locationJson) {
        const saved = JSON.parse(locationJson);
        location = saved.location;
        name = saved.name;
      } else if (settings.selectedCity && AFGHAN_CITIES[settings.selectedCity]) {
        location = AFGHAN_CITIES[settings.selectedCity];
        name = getCityName(settings.selectedCity);
      }

      dispatch({ type: 'INITIALIZE', payload: { location, settings, adhanPreferences: adhanPrefs, name } });
      await loadPrayerTimesFor(location, settings.selectedCity, settings);
      
      const qibla = calculateQibla(location);
      dispatch({ type: 'SET_QIBLA', payload: qibla });
      
      const hijri = gregorianToHijri(new Date());
      dispatch({ type: 'SET_HIJRI_DATE', payload: hijri });
    } catch (error) {
      console.error('Failed to load prayer data:', error);
      dispatch({ type: 'INITIALIZE', payload: { location: DEFAULT_LOCATION, settings: DEFAULT_SETTINGS, adhanPreferences: DEFAULT_ADHAN_PREFERENCES, name: 'کابل' } });
      await loadPrayerTimesFor(DEFAULT_LOCATION, DEFAULT_SETTINGS.selectedCity, DEFAULT_SETTINGS);
      
      const qibla = calculateQibla(DEFAULT_LOCATION);
      dispatch({ type: 'SET_QIBLA', payload: qibla });
      
      const hijri = gregorianToHijri(new Date());
      dispatch({ type: 'SET_HIJRI_DATE', payload: hijri });
    }
  }

  function getCityName(key: string): string {
    const names: Record<string, string> = {
      kabul: 'کابل',
      herat: 'هرات',
      mazar: 'مزارشریف',
      kandahar: 'قندهار',
      jalalabad: 'جلال‌آباد',
      kunduz: 'قندوز',
      ghazni: 'غزنی',
      bamiyan: 'بامیان',
      farah: 'فراه',
      badakhshan: 'بدخشان',
    };
    return names[key] || key;
  }

  const updatePrayerTimes = useCallback(async () => {
    await loadPrayerTimesFor(state.location, state.settings.selectedCity, state.settings);
  }, [state.location, state.settings]);

  function updateQibla() {
    const qibla = calculateQibla(state.location);
    dispatch({ type: 'SET_QIBLA', payload: qibla });
  }

  function updateHijriDate() {
    const hijri = gregorianToHijri(new Date());
    dispatch({ type: 'SET_HIJRI_DATE', payload: hijri });
  }

  const refreshPrayerTimes = useCallback(() => {
    updatePrayerTimes().catch((error) => {
      console.warn('updatePrayerTimes failed:', error);
    });
    updateHijriDate();
  }, [updatePrayerTimes]);

  const setCity = useCallback(async (cityKey: string) => {
    const location = AFGHAN_CITIES[cityKey];
    if (location) {
      const name = getCityName(cityKey);
      dispatch({ type: 'SET_LOCATION', payload: { location, name } });
      dispatch({ type: 'SET_SETTINGS', payload: { selectedCity: cityKey } });
      
      await AsyncStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify({ location, name }));
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...state.settings, selectedCity: cityKey }));
    }
  }, [state.settings]);

  const setCustomLocation = useCallback(async (location: LocationType, name: string) => {
    dispatch({ type: 'SET_LOCATION', payload: { location, name } });
    dispatch({ type: 'SET_SETTINGS', payload: { selectedCity: null } });
    
    await AsyncStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify({ location, name }));
  }, []);

  const updateSettings = useCallback(async (settings: Partial<PrayerSettings>) => {
    dispatch({ type: 'SET_SETTINGS', payload: settings });
    
    const newSettings = { ...state.settings, ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
  }, [state.settings]);

  const updateAdhanPreferences = useCallback(async (preferences: Partial<AdhanPreferences>) => {
    const newPreferences = { ...state.adhanPreferences, ...preferences };
    dispatch({ type: 'SET_ADHAN_PREFERENCES', payload: newPreferences });
    await saveAdhanPreferences(newPreferences);
    
    // Reschedule notifications with new preferences
    if (state.prayerTimes) {
      await scheduleAdhanNotifications();
    }
  }, [state.adhanPreferences, state.prayerTimes]);

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      try {
        if (navigator.geolocation) {
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              () => {
                dispatch({ type: 'SET_PERMISSION', payload: 'granted' });
                resolve(true);
              },
              () => {
                dispatch({ type: 'SET_PERMISSION', payload: 'denied' });
                resolve(false);
              }
            );
          });
        }
      } catch (error) {
        dispatch({ type: 'SET_PERMISSION', payload: 'denied' });
        return false;
      }
    }
    
    if (!Location) {
      dispatch({ type: 'SET_PERMISSION', payload: 'denied' });
      return false;
    }
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      dispatch({ type: 'SET_PERMISSION', payload: status === 'granted' ? 'granted' : 'denied' });
      return status === 'granted';
    } catch (error) {
      console.error('Location permission error:', error);
      dispatch({ type: 'SET_PERMISSION', payload: 'denied' });
      return false;
    }
  }, []);

  const detectLocation = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          dispatch({ type: 'SET_ERROR', payload: 'مرورگر شما از موقعیت پشتیبانی نمی‌کند' });
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const location: LocationType = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              altitude: position.coords.altitude || 0,
            };
            dispatch({ type: 'SET_LOCATION', payload: { location, name: 'موقعیت فعلی' } });
            await AsyncStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify({ location, name: 'موقعیت فعلی' }));
            dispatch({ type: 'SET_LOADING', payload: false });
          },
          () => {
            dispatch({ type: 'SET_ERROR', payload: 'اجازه دسترسی به موقعیت داده نشد' });
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        );
        return;
      }

      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        dispatch({ type: 'SET_ERROR', payload: 'اجازه دسترسی به موقعیت داده نشد' });
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      if (!Location) {
        dispatch({ type: 'SET_ERROR', payload: 'ماژول موقعیت در دسترس نیست' });
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const location: LocationType = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        altitude: position.coords.altitude || 0,
      };

      let name = 'موقعیت فعلی';
      try {
        const [geocode] = await Location.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
        });
        if (geocode) {
          name = geocode.city || geocode.subregion || geocode.region || name;
        }
      } catch {
        // Use default name
      }

      dispatch({ type: 'SET_LOCATION', payload: { location, name } });
      await AsyncStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify({ location, name }));
    } catch (error) {
      console.error('Location detection error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'خطا در تشخیص موقعیت' });
    } finally {
      if (Platform.OS !== 'web') {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  }, [requestLocationPermission]);

  // Legacy notification scheduling (kept for backward compatibility)
  const scheduleNotifications = useCallback(async () => {
    const NotificationsModule = await loadNotificationsIfAvailable();
    if (!NotificationsModule) {
      console.log('Notifications not available (Expo Go or web), skipping schedule');
      return;
    }
    
    if (!state.settings.notificationsEnabled || !state.prayerTimes) return;

    try {
      // Cancel existing notifications
      await NotificationsModule.cancelAllScheduledNotificationsAsync();

      // Request permission
      const { status } = await NotificationsModule.requestPermissionsAsync();
      if (status !== 'granted') return;

      const prayers = [
        { key: 'fajr', name: 'نماز صبح', time: state.prayerTimes.fajr },
        { key: 'dhuhr', name: 'نماز ظهر', time: state.prayerTimes.dhuhr },
        { key: 'asr', name: 'نماز عصر', time: state.prayerTimes.asr },
        { key: 'maghrib', name: 'نماز مغرب', time: state.prayerTimes.maghrib },
        { key: 'isha', name: 'نماز عشا', time: state.prayerTimes.isha },
      ];

      const now = new Date();
      const minutesBefore = state.settings.notificationMinutesBefore;

      for (const prayer of prayers) {
        const notificationTime = new Date(prayer.time.getTime() - minutesBefore * 60 * 1000);
        
        // Validate date is in valid range (prevent invalid date errors)
        const maxDate = new Date(now.getFullYear() + 1, 11, 31); // Max 1 year ahead
        if (notificationTime > now && notificationTime <= maxDate) {
          await NotificationsModule.scheduleNotificationAsync({
            content: {
              title: 'وقت نماز',
              body: `${minutesBefore} دقیقه تا ${prayer.name}`,
              sound: true,
            },
            trigger: {
              type: NotificationsModule.SchedulableTriggerInputTypes.DATE,
              date: notificationTime,
            },
          });
        }
      }
    } catch (error) {
      console.error('Notification scheduling error:', error);
    }
  }, [state.settings.notificationsEnabled, state.settings.notificationMinutesBefore, state.prayerTimes]);

  // Enhanced Adhan notification scheduling
  const scheduleAdhanNotifications = useCallback(async () => {
    const NotificationsModule = await loadNotificationsIfAvailable();
    if (!NotificationsModule) {
      console.log('Skipping notification scheduling: Expo Go, web platform or Notifications unavailable');
      return;
    }
    
    if (!state.adhanPreferences.masterEnabled) {
      console.log('Skipping notification scheduling: master toggle is disabled');
      return;
    }
    if (!state.prayerTimes) {
      console.log('Skipping notification scheduling: prayer times not available');
      return;
    }

    try {
      console.log('Starting Adhan notification scheduling...');
      
      // Cancel existing notifications
      await NotificationsModule.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled existing notifications');

      // Request permission
      const { status } = await NotificationsModule.requestPermissionsAsync();
      console.log('Notification permission status:', status);
      
      if (status !== 'granted') {
        console.warn('Notification permission not granted. Status:', status);
        dispatch({ type: 'SET_ERROR', payload: 'اجازه اعلان داده نشد. لطفاً در تنظیمات دستگاه اجازه دهید.' });
        return;
      }

      const prayers: { key: PrayerName; time: Date }[] = [
        { key: 'fajr', time: state.prayerTimes.fajr },
        { key: 'dhuhr', time: state.prayerTimes.dhuhr },
        { key: 'asr', time: state.prayerTimes.asr },
        { key: 'maghrib', time: state.prayerTimes.maghrib },
        { key: 'isha', time: state.prayerTimes.isha },
      ];

      const now = new Date();
      const { adhanPreferences } = state;
      let scheduledCount = 0;

      // Helper function to validate Date objects
      const isValidDate = (date: Date): boolean => {
        return date instanceof Date && !isNaN(date.getTime()) && 
               date.getTime() > 0 && date.getTime() < Number.MAX_SAFE_INTEGER;
      };

      // Helper function to safely format date for logging
      const safeDateString = (date: Date): string => {
        if (!isValidDate(date)) {
          return 'Invalid Date';
        }
        try {
          return date.toISOString();
        } catch {
          return 'Date format error';
        }
      };

      for (const prayer of prayers) {
        const prayerSettings = adhanPreferences[prayer.key];
        
        // Skip if this prayer's notifications are disabled
        if (!prayerSettings.enabled) {
          console.log(`Skipping ${prayer.key}: notifications disabled`);
          continue;
        }
        
        // Validate prayer time is valid Date before using it
        if (!isValidDate(prayer.time)) {
          console.warn(`Invalid date for ${prayer.key}, skipping notification`);
          continue;
        }
        
        // Skip if prayer time has passed
        if (prayer.time <= now) {
          console.log(`Skipping ${prayer.key}: prayer time has passed (${safeDateString(prayer.time)})`);
          continue;
        }

        // Validate date is in valid range (prevent invalid date errors)
        const maxDate = new Date(now.getFullYear() + 1, 11, 31); // Max 1 year ahead
        if (prayer.time > maxDate) {
          console.log(`Skipping ${prayer.key}: Date out of valid range (${safeDateString(prayer.time)})`);
          continue;
        }

        // Get notification content
        const content = getNotificationContent(prayer.key, prayerSettings.playSound);
        
        // Determine which channel to use (Android)
        const channelId = prayerSettings.playSound ? 'adhan-sound' : 'prayer-silent';

        // Determine sound to use
        // For Fajr with sound, use fajr_adhan.mp3, otherwise use barakatullah_salim.mp3 or default
        let notificationSound: string | boolean | undefined;
        if (prayerSettings.playSound) {
          if (prayer.key === 'fajr') {
            notificationSound = 'fajr_adhan.mp3';
          } else {
            notificationSound = 'barakatullah_salim.mp3';
          }
        } else {
          notificationSound = false; // Silent
        }

        // Schedule main notification at prayer time
        // Set sound in notification so it plays even if app is killed
        // playAdhan() will also be called when notification is received/tapped for better experience
        await NotificationsModule.scheduleNotificationAsync({
          content: {
            title: content.title,
            body: content.body,
            sound: notificationSound, // Sound file name or false for silent
            data: {
              prayer: prayer.key,
              type: 'adhan',
              playSound: prayerSettings.playSound,
              voice: prayerSettings.selectedVoice,
            },
            ...(Platform.OS === 'android' && { channelId }),
          },
          trigger: {
            type: NotificationsModule.SchedulableTriggerInputTypes.DATE,
            date: prayer.time,
          },
        });
        
        scheduledCount++;
        console.log(`Scheduled ${prayer.key} notification for ${safeDateString(prayer.time)} (sound: ${notificationSound})`);

        // Schedule early reminder if enabled
        if (adhanPreferences.earlyReminder && adhanPreferences.earlyReminderMinutes > 0) {
          const reminderTime = new Date(prayer.time.getTime() - adhanPreferences.earlyReminderMinutes * 60 * 1000);
          
          // Validate reminder date is valid and in valid range
          const maxDate = new Date(now.getFullYear() + 1, 11, 31); // Max 1 year ahead
          if (isValidDate(reminderTime) && reminderTime > now && reminderTime <= maxDate) {
            const reminderContent = getEarlyReminderContent(prayer.key, adhanPreferences.earlyReminderMinutes);
            
            await NotificationsModule.scheduleNotificationAsync({
              content: {
                title: reminderContent.title,
                body: reminderContent.body,
                sound: false, // Early reminders are always silent
                data: {
                  prayer: prayer.key,
                  type: 'reminder',
                },
                ...(Platform.OS === 'android' && { channelId: 'prayer-reminder' }),
              },
              trigger: {
                type: NotificationsModule.SchedulableTriggerInputTypes.DATE,
                date: reminderTime,
              },
            });
            
            console.log(`Scheduled early reminder for ${prayer.key} at ${reminderTime.toISOString()}`);
          }
        }
      }
      
      console.log(`✅ Adhan notifications scheduled successfully. Total: ${scheduledCount} notifications`);
      dispatch({ type: 'SET_ERROR', payload: null }); // Clear any previous errors
    } catch (error) {
      console.error('❌ Adhan notification scheduling error:', error);
      dispatch({ type: 'SET_ERROR', payload: `خطا در زمان‌بندی اعلان‌ها: ${error instanceof Error ? error.message : 'خطای ناشناخته'}` });
    }
  }, [state.adhanPreferences, state.prayerTimes]);

  return (
    <PrayerContext.Provider
      value={{
        state,
        refreshPrayerTimes,
        setCity,
        setCustomLocation,
        updateSettings,
        updateAdhanPreferences,
        requestLocationPermission,
        detectLocation,
        scheduleNotifications,
        scheduleAdhanNotifications,
      }}
    >
      {children}
    </PrayerContext.Provider>
  );
}

// Hook
export function usePrayer() {
  const context = useContext(PrayerContext);
  if (!context) {
    throw new Error('usePrayer must be used within a PrayerProvider');
  }
  return context;
}
