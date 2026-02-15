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
import {
  loadCalendarNotificationPreferences,
  scheduleCalendarNotifications,
} from '@/utils/calendarNotifications';
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
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { Alert, Linking, Platform, AppState } from 'react-native';

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

const PRAYER_ROLLING_DAYS_ANDROID = 10;
const PRAYER_ROLLING_DAYS_IOS = 7;
const PRAYER_ROLLING_DAYS_IOS_WITH_REMINDER = 5;
const JUMMAH_WEEKS_ANDROID = 12;
const JUMMAH_WEEKS_IOS = 12;
const JUMMAH_WEEKS_IOS_WITH_REMINDER = 10;

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
  notificationPermission: 'granted' | 'denied' | 'blocked' | 'undetermined';
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
  | { type: 'SET_NOTIFICATION_PERMISSION'; payload: 'granted' | 'denied' | 'blocked' | 'undetermined' }
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
    case 'SET_NOTIFICATION_PERMISSION':
      return { ...state, notificationPermission: action.payload };
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
  notificationPermission: 'undetermined',
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
  openNotificationSettings: () => Promise<void>;
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
          const { playSound } = notification.request.content.data || {};
          
          // For adhan notifications with sound, ensure audio plays
          return {
            shouldShowAlert: true,
            shouldPlaySound: playSound === true,
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

  // Schedule prayer notifications when prayer times or preferences change
  useEffect(() => {
    if (state.prayerTimes) {
      Promise.all([
        scheduleAdhanNotificationsRef.current(),
        scheduleJummahNotificationsRef.current(),
      ]).catch((error) => {
        console.warn('Failed to schedule prayer/Jummah notifications:', error);
      });
    }
  }, [state.prayerTimes, state.adhanPreferences]);

  // Schedule calendar (Qamari) notifications when app has loaded
  useEffect(() => {
    if (!state.isLoading) {
      loadCalendarNotificationPreferences().then((prefs) => {
        scheduleCalendarNotifications(prefs.enabled).catch((err) => {
          if (__DEV__) console.warn('Calendar notification schedule:', err);
        });
      });
    }
  }, [state.isLoading]);

  async function configureAndroidNotificationChannels(NotificationsModule: typeof import('expo-notifications')) {
    if (Platform.OS !== 'android') return;
    
    try {
      // Channel for Fajr Adhan (custom sound)
      await NotificationsModule.setNotificationChannelAsync('adhan-fajr', {
        name: 'اذان صبح',
        importance: NotificationsModule.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1a4d3e',
        sound: 'fajr_adhan',
        enableVibrate: true,
        showBadge: true,
      });

      // Channel for other Adhans (custom sound)
      await NotificationsModule.setNotificationChannelAsync('adhan-regular', {
        name: 'اذان (سایر نمازها)',
        importance: NotificationsModule.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1a4d3e',
        sound: 'barakatullah_salim',
        enableVibrate: true,
        showBadge: true,
      });
      
      // Channel for silent prayer notifications
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

      // Channel for calendar (Qamari) event notifications
      await NotificationsModule.setNotificationChannelAsync('calendar-qamari', {
        name: 'مناسبت‌های قمری',
        importance: NotificationsModule.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 100],
        enableVibrate: true,
        showBadge: true,
      });

      // Channel for weekly Jummah reminder
      await NotificationsModule.setNotificationChannelAsync('jummah-reminder', {
        name: 'یادآوری نماز جمعه',
        importance: NotificationsModule.AndroidImportance.HIGH,
        vibrationPattern: [0, 180, 120, 180],
        lightColor: '#1a4d3e',
        sound: undefined,
        enableVibrate: true,
        showBadge: true,
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

  const getDateKey = useCallback((date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const getLocationKey = useCallback(() => {
    const cityKey = state.settings.selectedCity;
    if (cityKey) return `city:${cityKey}`;
    const { latitude, longitude } = state.location;
    return `gps:${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  }, [state.location, state.settings.selectedCity]);

  const lastScheduleRef = useRef<{ dateKey: string; locationKey: string } | null>(null);
  const scheduleAdhanNotificationsRef = useRef<() => Promise<void>>(async () => {});
  const scheduleJummahNotificationsRef = useRef<() => Promise<void>>(async () => {});

  const cancelScheduledNotificationsByPredicate = useCallback(
    async (
      NotificationsModule: typeof import('expo-notifications'),
      shouldCancel: (notification: any, identifier: string) => boolean
    ) => {
      const scheduled = await NotificationsModule.getAllScheduledNotificationsAsync();
      for (const notification of scheduled) {
        const identifier = (notification as any)?.identifier || '';
        if (!identifier) continue;
        if (shouldCancel(notification, identifier)) {
          await NotificationsModule.cancelScheduledNotificationAsync(identifier);
        }
      }
    },
    []
  );

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

  // Reschedule Adhan notifications on app resume and day change
  useEffect(() => {
    let midnightTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 5, 0);
      const delay = nextMidnight.getTime() - now.getTime();
      if (delay > 0) {
        midnightTimeout = setTimeout(async () => {
          refreshPrayerTimes();
          try {
            await Promise.all([
              scheduleAdhanNotificationsRef.current(),
              scheduleJummahNotificationsRef.current(),
            ]);
          } catch (error) {
            console.warn('Failed to reschedule at midnight:', error);
          }
          scheduleMidnightRefresh();
        }, delay);
      }
    };

    scheduleMidnightRefresh();

    const subscription = AppState.addEventListener('change', async (stateStatus) => {
      if (stateStatus !== 'active') return;
      const currentKey = getDateKey(new Date());
      const locationKey = getLocationKey();
      const last = lastScheduleRef.current;
      if (!last || last.dateKey !== currentKey || last.locationKey !== locationKey) {
        refreshPrayerTimes();
        try {
          await Promise.all([
            scheduleAdhanNotificationsRef.current(),
            scheduleJummahNotificationsRef.current(),
          ]);
        } catch (error) {
          console.warn('Failed to reschedule on resume:', error);
        }
      }
    });

    return () => {
      if (midnightTimeout) clearTimeout(midnightTimeout);
      subscription.remove();
    };
  }, [getDateKey, getLocationKey, refreshPrayerTimes]);

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
      try {
        await Promise.all([
          scheduleAdhanNotificationsRef.current(),
          scheduleJummahNotificationsRef.current(),
        ]);
      } catch (error) {
        console.warn('Failed to reschedule prayer/Jummah notifications:', error);
      }
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

  const checkNotificationPermission = useCallback(async (): Promise<'granted' | 'denied' | 'blocked' | 'undetermined'> => {
    const NotificationsModule = await loadNotificationsIfAvailable();
    if (!NotificationsModule) {
      return 'undetermined';
    }
    
    try {
      const permissionStatus = await NotificationsModule.getPermissionsAsync();
      const status = permissionStatus?.status;
      if (status === 'granted') return 'granted';
      if (status === 'denied') {
        const canAskAgain = (permissionStatus as any)?.canAskAgain;
        return canAskAgain === false ? 'blocked' : 'denied';
      }
      return 'undetermined';
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return 'undetermined';
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

  // Enhanced Adhan notification scheduling (rolling window)
  const scheduleAdhanNotifications = useCallback(async () => {
    const NotificationsModule = await loadNotificationsIfAvailable();
    if (!NotificationsModule) {
      console.log('Skipping notification scheduling: Expo Go, web platform or Notifications unavailable');
      return;
    }

    if (!state.prayerTimes) {
      console.log('Skipping notification scheduling: prayer times not available');
      return;
    }

    try {
      const isValidDate = (date: Date): boolean => {
        return date instanceof Date && !isNaN(date.getTime()) && date.getTime() > 0;
      };

      const areTimesOrdered = (times: PrayerTimes): boolean => {
        const ordered = [times.fajr, times.sunrise, times.dhuhr, times.asr, times.maghrib, times.isha];
        if (ordered.some((t) => !isValidDate(t))) return false;
        for (let i = 1; i < ordered.length; i++) {
          if (ordered[i].getTime() <= ordered[i - 1].getTime()) return false;
        }
        return true;
      };

      // Clear only Adhan-related notifications
      await cancelScheduledNotificationsByPredicate(
        NotificationsModule,
        (notification, identifier) => {
          const dataType = (notification as any)?.content?.data?.type;
          return identifier.startsWith('adhan-') || dataType === 'adhan' || dataType === 'reminder';
        }
      );

      if (!state.adhanPreferences.masterEnabled) {
        lastScheduleRef.current = {
          dateKey: getDateKey(new Date()),
          locationKey: getLocationKey(),
        };
        dispatch({ type: 'SET_ERROR', payload: null });
        console.log('Skipping notification scheduling: master toggle is disabled');
        return;
      }

      if (Platform.OS === 'android') {
        await configureAndroidNotificationChannels(NotificationsModule);
      }

      const currentStatus = await checkNotificationPermission();
      dispatch({ type: 'SET_NOTIFICATION_PERMISSION', payload: currentStatus });

      if (currentStatus === 'blocked') {
        dispatch({
          type: 'SET_ERROR',
          payload: 'اعلان‌ها بلاک شده‌اند. لطفاً در تنظیمات دستگاه اجازه دهید.',
        });
        return;
      }

      if (currentStatus !== 'granted') {
        const { status } = await NotificationsModule.requestPermissionsAsync();
        const newStatus =
          status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
        dispatch({ type: 'SET_NOTIFICATION_PERMISSION', payload: newStatus });
        if (status !== 'granted') {
          dispatch({
            type: 'SET_ERROR',
            payload: 'اجازه اعلان داده نشد. لطفاً در تنظیمات دستگاه اجازه دهید.',
          });
          return;
        }
      }

      const now = new Date();
      const cityKey = toCityKey(state.settings.selectedCity);
      const { adhanPreferences } = state;
      const rollingDays =
        Platform.OS === 'android'
          ? PRAYER_ROLLING_DAYS_ANDROID
          : adhanPreferences.earlyReminder
          ? PRAYER_ROLLING_DAYS_IOS_WITH_REMINDER
          : PRAYER_ROLLING_DAYS_IOS;

      const prayerKeys: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
      const enabledPrayers = prayerKeys.filter((prayer) => adhanPreferences[prayer].enabled);

      let scheduledCount = 0;

      for (let dayOffset = 0; dayOffset < rollingDays; dayOffset++) {
        const targetDate = new Date(now);
        targetDate.setHours(12, 0, 0, 0);
        targetDate.setDate(now.getDate() + dayOffset);

        let dayTimes: PrayerTimes;
        try {
          const result = await getPrayerTimesForDate({
            cityKey,
            location: state.location,
            date: targetDate,
          });
          dayTimes = result.times;
        } catch {
          dayTimes = calculatePrayerTimes(
            targetDate,
            state.location,
            state.settings.calculationMethod,
            state.settings.asrMethod
          );
        }

        if (!areTimesOrdered(dayTimes)) {
          dayTimes = calculatePrayerTimes(
            targetDate,
            state.location,
            state.settings.calculationMethod,
            state.settings.asrMethod
          );
        }

        for (const prayerKey of enabledPrayers) {
          const prayerSettings = adhanPreferences[prayerKey];
          const scheduleTime = new Date(dayTimes[prayerKey]);
          if (!isValidDate(scheduleTime) || scheduleTime <= now) continue;

          const content = getNotificationContent(prayerKey, prayerSettings.playSound);
          const playSound = prayerSettings.playSound;
          const channelId =
            playSound && prayerKey === 'fajr'
              ? 'adhan-fajr'
              : playSound
              ? 'adhan-regular'
              : 'prayer-silent';
          const notificationSound: string | boolean | undefined =
            playSound && prayerKey === 'fajr'
              ? 'fajr_adhan'
              : playSound
              ? 'barakatullah_salim'
              : false;
          const dayKey = getDateKey(scheduleTime);
          const adhanId = `adhan-${prayerKey}-${dayKey}`;

          await NotificationsModule.scheduleNotificationAsync({
            identifier: adhanId,
            content: {
              title: content.title,
              body: content.body,
              sound: notificationSound,
              ...(Platform.OS === 'android' && playSound && { vibrate: [] }),
              data: {
                prayer: prayerKey,
                type: 'adhan',
                playSound,
                voice: prayerSettings.selectedVoice,
                dayKey,
              },
              ...(Platform.OS === 'android' && { channelId }),
              ...(Platform.OS === 'android' && playSound
                ? { priority: NotificationsModule.AndroidNotificationPriority.HIGH }
                : {}),
            },
            trigger: {
              type: NotificationsModule.SchedulableTriggerInputTypes.DATE,
              date: scheduleTime,
            },
          });
          scheduledCount++;

          if (adhanPreferences.earlyReminder && adhanPreferences.earlyReminderMinutes > 0) {
            const reminderTime = new Date(
              scheduleTime.getTime() - adhanPreferences.earlyReminderMinutes * 60 * 1000
            );
            if (reminderTime > now && isValidDate(reminderTime)) {
              const reminderContent = getEarlyReminderContent(
                prayerKey,
                adhanPreferences.earlyReminderMinutes
              );
              const reminderId = `adhan-${prayerKey}-${dayKey}-reminder`;
              await NotificationsModule.scheduleNotificationAsync({
                identifier: reminderId,
                content: {
                  title: reminderContent.title,
                  body: reminderContent.body,
                  sound: false,
                  data: {
                    prayer: prayerKey,
                    type: 'reminder',
                    dayKey,
                  },
                  ...(Platform.OS === 'android' && { channelId: 'prayer-reminder' }),
                },
                trigger: {
                  type: NotificationsModule.SchedulableTriggerInputTypes.DATE,
                  date: reminderTime,
                },
              });
              scheduledCount++;
            }
          }
        }
      }

      if (__DEV__) {
        console.log(`✅ Adhan notifications scheduled successfully. Total: ${scheduledCount}`);
      }
      lastScheduleRef.current = {
        dateKey: getDateKey(new Date()),
        locationKey: getLocationKey(),
      };
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      console.error('❌ Adhan notification scheduling error:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: `خطا در زمان‌بندی اعلان‌ها: ${
          error instanceof Error ? error.message : 'خطای ناشناخته'
        }`,
      });
    }
  }, [
    cancelScheduledNotificationsByPredicate,
    checkNotificationPermission,
    getDateKey,
    getLocationKey,
    state,
  ]);

  const scheduleJummahNotifications = useCallback(async () => {
    const NotificationsModule = await loadNotificationsIfAvailable();
    if (!NotificationsModule) return;

    try {
      await cancelScheduledNotificationsByPredicate(
        NotificationsModule,
        (notification, identifier) => {
          const dataType = (notification as any)?.content?.data?.type;
          return identifier.startsWith('jummah-friday-') || dataType === 'jummah';
        }
      );

      if (!state.adhanPreferences.masterEnabled) return;

      if (Platform.OS === 'android') {
        await configureAndroidNotificationChannels(NotificationsModule);
      }

      const currentStatus = await checkNotificationPermission();
      dispatch({ type: 'SET_NOTIFICATION_PERMISSION', payload: currentStatus });
      if (currentStatus === 'blocked') return;

      if (currentStatus !== 'granted') {
        const { status } = await NotificationsModule.requestPermissionsAsync();
        const newStatus =
          status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
        dispatch({ type: 'SET_NOTIFICATION_PERMISSION', payload: newStatus });
        if (status !== 'granted') return;
      }

      const now = new Date();
      const weeksToSchedule =
        Platform.OS === 'android'
          ? JUMMAH_WEEKS_ANDROID
          : state.adhanPreferences.earlyReminder
          ? JUMMAH_WEEKS_IOS_WITH_REMINDER
          : JUMMAH_WEEKS_IOS;
      const firstFriday = new Date(now);
      const daysUntilFriday = (5 - firstFriday.getDay() + 7) % 7;
      firstFriday.setDate(firstFriday.getDate() + daysUntilFriday);
      firstFriday.setHours(13, 0, 0, 0);
      if (firstFriday <= now) {
        firstFriday.setDate(firstFriday.getDate() + 7);
      }

      for (let i = 0; i < weeksToSchedule; i++) {
        const triggerDate = new Date(firstFriday);
        triggerDate.setDate(firstFriday.getDate() + i * 7);
        const dayKey = getDateKey(triggerDate);
        await NotificationsModule.scheduleNotificationAsync({
          identifier: `jummah-friday-${dayKey}`,
          content: {
            title: 'نماز جمعه',
            body: 'وقت نماز جمعه است',
            sound: true,
            data: {
              type: 'jummah',
              dayKey,
            },
            ...(Platform.OS === 'android' && { channelId: 'jummah-reminder' }),
          },
          trigger: {
            type: NotificationsModule.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
      }
    } catch (error) {
      console.warn('Failed to schedule Jummah notifications:', error);
    }
  }, [
    cancelScheduledNotificationsByPredicate,
    checkNotificationPermission,
    getDateKey,
    state.adhanPreferences.earlyReminder,
    state.adhanPreferences.masterEnabled,
  ]);

  scheduleAdhanNotificationsRef.current = scheduleAdhanNotifications;
  scheduleJummahNotificationsRef.current = scheduleJummahNotifications;

  const openNotificationSettings = useCallback(async () => {
    const NotificationsModule = await loadNotificationsIfAvailable();
    if (!NotificationsModule) {
      Alert.alert('خطا', 'ماژول اعلان در دسترس نیست');
      return;
    }
    
    try {
      if (Platform.OS === 'ios') {
        await Linking.openSettings();
      } else {
        // Try to open notification settings directly (Android 13+)
        try {
          const maybeOpenSettings = (NotificationsModule as any).openSettingsAsync;
          if (typeof maybeOpenSettings === 'function') {
            await maybeOpenSettings();
          } else {
            await Linking.openSettings();
          }
        } catch {
          // Fallback to general settings
          await Linking.openSettings();
        }
      }
    } catch (error) {
      console.error('Failed to open settings:', error);
      // Fallback to general settings
      try {
        await Linking.openSettings();
      } catch {
        Alert.alert('خطا', 'نمی‌توان تنظیمات را باز کرد. لطفاً دستی به تنظیمات دستگاه بروید.');
      }
    }
  }, []);

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
        openNotificationSettings,
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
