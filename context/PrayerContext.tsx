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
import { getCity } from '@/utils/cities';
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
import { Alert, AppState, Linking, NativeModules, Platform } from 'react-native';

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
  SELECTED_CITY: 'selected_city',
  EXACT_ALARM_PROMPT_SHOWN: '@ebadat/exact_alarm_prompt_shown',
  LAST_ADHAN_DELAY_SECONDS: '@ebadat/last_adhan_delay_seconds',
};

const PRAYER_ROLLING_DAYS_ANDROID = 10;
const PRAYER_ROLLING_DAYS_IOS = 7;
const PRAYER_ROLLING_DAYS_IOS_WITH_REMINDER = 5;
const ADHAN_SOUND_FILENAME = 'barakatullah_salim_18sec.mp3';
const CHANNEL_IDS = {
  ADHAN_FAJR: 'adhan-fajr-v7',
  ADHAN_REGULAR: 'adhan-regular-v7',
  PRAYER_SILENT: 'prayer-silent-v2',
  PRAYER_REMINDER: 'prayer-reminder-v2',
  CALENDAR_QAMARI: 'calendar-qamari',
  JUMMAH_REMINDER: 'jummah-reminder-v2',
} as const;

type ExpectedNotificationType = 'adhan' | 'reminder';

interface ExpectedPrayerNotification {
  id: string;
  type: ExpectedNotificationType;
  prayerKey: PrayerName;
  dayKey: string;
  triggerDate: Date;
  channelId: string;
  title: string;
  body: string;
  sound: string | boolean;
  data: Record<string, unknown>;
}

// Settings
interface PrayerSettings {
  calculationMethod: keyof typeof CalculationMethods;
  asrMethod: AsrMethod;
  use24Hour: boolean;
  notificationsEnabled: boolean;
  notificationMinutesBefore: number;
  selectedCity: string | null; // null means auto-detect
}

type ExactAlarmStatus = 'granted' | 'missing' | 'unknown' | 'not_applicable';

interface PrayerScheduleAudit {
  generatedAt: number;
  reason: string;
  expectedCount: number;
  expectedAdhanCount: number;
  scheduledCount: number;
  scheduledAdhanCount: number;
  duplicateCount: number;
  maxDriftSeconds: number;
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
  exactAlarmStatus: ExactAlarmStatus;
  scheduleAudit: PrayerScheduleAudit | null;
  lastAdhanDelaySeconds: number | null;
  isScheduling: boolean;
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
  | { type: 'SET_EXACT_ALARM_STATUS'; payload: ExactAlarmStatus }
  | { type: 'SET_SCHEDULE_AUDIT'; payload: PrayerScheduleAudit | null }
  | { type: 'SET_LAST_ADHAN_DELAY_SECONDS'; payload: number | null }
  | { type: 'SET_IS_SCHEDULING'; payload: boolean }
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
    case 'SET_EXACT_ALARM_STATUS':
      return { ...state, exactAlarmStatus: action.payload };
    case 'SET_SCHEDULE_AUDIT':
      return { ...state, scheduleAudit: action.payload };
    case 'SET_LAST_ADHAN_DELAY_SECONDS':
      return { ...state, lastAdhanDelaySeconds: action.payload };
    case 'SET_IS_SCHEDULING':
      return { ...state, isScheduling: action.payload };
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
  exactAlarmStatus: Platform.OS === 'android' ? 'unknown' : 'not_applicable',
  scheduleAudit: null,
  lastAdhanDelaySeconds: null,
  isScheduling: false,
  error: null,
};

// Context
interface PrayerContextType {
  state: PrayerState;
  refreshPrayerTimes: () => void;
  setCity: (cityKey: string) => void;
  setCustomLocation: (location: LocationType, name: string, cityKey?: string) => void;
  updateSettings: (settings: Partial<PrayerSettings>) => void;
  updateAdhanPreferences: (preferences: Partial<AdhanPreferences>) => Promise<void>;
  requestLocationPermission: () => Promise<boolean>;
  detectLocation: () => Promise<void>;
  scheduleNotifications: () => Promise<void>;
  scheduleAdhanNotifications: () => Promise<void>;
  requestPrayerSchedule: (reason?: string) => Promise<void>;
  scheduleAdhanSystemTest: () => Promise<boolean>;
  openNotificationSettings: () => Promise<void>;
}

const PrayerContext = createContext<PrayerContextType | undefined>(undefined);

// Provider
export function PrayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(prayerReducer, initialState);
  const scheduleRunIdRef = useRef(0);
  const scheduleInFlightRef = useRef(false);
  const schedulePendingRef = useRef(false);
  const schedulePendingReasonRef = useRef<string | null>(null);
  const requestPrayerScheduleRef = useRef<(reason?: string) => Promise<void>>(async () => { });
  const scheduleAdhanNotificationsRef = useRef<() => Promise<void>>(async () => { });
  const scheduleJummahNotificationsRef = useRef<() => Promise<void>>(async () => { });
  const adhanChannelMigrationDoneRef = useRef(false);
  const lastScheduleRef = useRef<{ dateKey: string; locationKey: string } | null>(null);

  const getExactAlarmModule = useCallback(() => {
    const module = (NativeModules as {
      ExactAlarmModule?: {
        canScheduleExactAlarms?: () => Promise<boolean>;
        openExactAlarmSettings?: () => Promise<boolean>;
      };
    }).ExactAlarmModule;
    return module || null;
  }, []);

  const checkExactAlarmCapability = useCallback(async (): Promise<ExactAlarmStatus> => {
    if (Platform.OS !== 'android') return 'not_applicable';
    if (typeof Platform.Version !== 'number' || Platform.Version < 31) return 'granted';
    try {
      const module = getExactAlarmModule();
      if (!module?.canScheduleExactAlarms) return 'unknown';
      const canSchedule = await module.canScheduleExactAlarms();
      return canSchedule ? 'granted' : 'missing';
    } catch {
      return 'unknown';
    }
  }, [getExactAlarmModule]);

  // Initialize
  useEffect(() => {
    loadSavedData();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      const status = await checkExactAlarmCapability();
      if (isMounted) {
        dispatch({ type: 'SET_EXACT_ALARM_STATUS', payload: status });
      }
    };
    run().catch(() => {
      if (isMounted) {
        dispatch({ type: 'SET_EXACT_ALARM_STATUS', payload: Platform.OS === 'android' ? 'unknown' : 'not_applicable' });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [checkExactAlarmCapability]);

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

  // One-time migration on app open: cancel prayer-related notifications, recreate channels, reschedule (Android)
  useEffect(() => {
    if (Platform.OS !== 'android' || adhanChannelMigrationDoneRef.current || !state.prayerTimes) return;
    adhanChannelMigrationDoneRef.current = true;
    const run = async () => {
      const NotificationsModule = await loadNotificationsIfAvailable();
      if (!NotificationsModule) return;
      await cancelScheduledNotificationsByPredicate(
        NotificationsModule,
        (notification, identifier) => {
          const dataType = (notification as any)?.content?.data?.type;
          return (
            identifier.startsWith('adhan-') ||
            dataType === 'adhan' ||
            dataType === 'reminder' ||
            identifier.startsWith('jummah-') ||
            dataType === 'jummah'
          );
        }
      );
      await configureAndroidNotificationChannels(NotificationsModule);
      await requestPrayerScheduleRef.current('startup-migration');
    };
    run().catch((e) => console.warn('Adhan channel migration failed:', e));
  }, [state.prayerTimes]);

  // Listen for notification received events (foreground) and play Adhan audio
  useEffect(() => {
    let subscription: any = null;

    const setupListener = async () => {
      const NotificationsModule = await loadNotificationsIfAvailable();
      if (!NotificationsModule) return;

      subscription = NotificationsModule.addNotificationReceivedListener(async (notification: any) => {
        const { prayer, playSound, voice, type, expectedFireAtMs } = notification.request.content.data || {};

        console.log('Notification received (foreground):', { prayer, playSound, voice, type });

        if (type === 'adhan' && typeof expectedFireAtMs === 'number') {
          const delaySeconds = Math.max(0, Math.round((Date.now() - expectedFireAtMs) / 1000));
          dispatch({ type: 'SET_LAST_ADHAN_DELAY_SECONDS', payload: delaySeconds });
          void AsyncStorage.setItem(STORAGE_KEYS.LAST_ADHAN_DELAY_SECONDS, String(delaySeconds)).catch(() => {
            // ignore storage errors
          });
          if (delaySeconds > 90 && __DEV__) {
            console.warn(`[AdhanDelay] expected=${expectedFireAtMs} actual=${Date.now()} delaySeconds=${delaySeconds}`);
          }
        }

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
      requestPrayerScheduleRef.current('state-change').catch((error) => {
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
      const deleteChannel = (NotificationsModule as unknown as {
        deleteNotificationChannelAsync?: (channelId: string) => Promise<void>;
      }).deleteNotificationChannelAsync;

      const getChannel = (NotificationsModule as unknown as {
        getNotificationChannelAsync?: (channelId: string) => Promise<{ sound?: string | null } | null>;
      }).getNotificationChannelAsync;

      const normalizeSound = (value?: string | null): string => {
        return (value || '')
          .toLowerCase()
          .trim()
          .replace(/\.mp3$/, '');
      };

      const ensureChannel = async (
        channelId: string,
        config: Parameters<typeof NotificationsModule.setNotificationChannelAsync>[1],
        expectedSound: string | null,
      ) => {
        if (typeof getChannel === 'function') {
          try {
            const existing = await getChannel(channelId);
            if (existing && typeof deleteChannel === 'function') {
              const existingSound = normalizeSound(existing.sound);
              const expectedNormalized = normalizeSound(expectedSound);
              if (existingSound !== expectedNormalized) {
                await deleteChannel(channelId);
              }
            }
          } catch {
            // Continue and recreate channel below.
          }
        }

        await NotificationsModule.setNotificationChannelAsync(channelId, config);
      };

      // Channel for Fajr Adhan (custom sound)
      await ensureChannel(CHANNEL_IDS.ADHAN_FAJR, {
        name: 'اذان صبح',
        importance: NotificationsModule.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1a4d3e',
        sound: ADHAN_SOUND_FILENAME,
        enableVibrate: true,
        showBadge: true,
      }, ADHAN_SOUND_FILENAME);

      // Channel for other Adhans (custom sound)
      await ensureChannel(CHANNEL_IDS.ADHAN_REGULAR, {
        name: 'اذان (سایر نمازها)',
        importance: NotificationsModule.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1a4d3e',
        sound: ADHAN_SOUND_FILENAME,
        enableVibrate: true,
        showBadge: true,
      }, ADHAN_SOUND_FILENAME);

      // Channel for silent prayer notifications
      await ensureChannel(CHANNEL_IDS.PRAYER_SILENT, {
        name: 'یادآوری نماز (بی‌صدا)',
        importance: NotificationsModule.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 100],
        lightColor: '#1a4d3e',
        sound: null,
        enableVibrate: true,
        showBadge: true,
      }, null);

      // Channel for early reminders
      await ensureChannel(CHANNEL_IDS.PRAYER_REMINDER, {
        name: 'یادآوری قبل از نماز',
        importance: NotificationsModule.AndroidImportance.LOW,
        vibrationPattern: [0, 50],
        lightColor: '#D4AF37',
        sound: null,
        enableVibrate: true,
        showBadge: false,
      }, null);

      // Channel for calendar (Qamari) event notifications
      await ensureChannel(CHANNEL_IDS.CALENDAR_QAMARI, {
        name: 'مناسبت‌های قمری',
        importance: NotificationsModule.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 100],
        enableVibrate: true,
        showBadge: true,
      }, null);

      // Channel for weekly Jummah reminder
      await ensureChannel(CHANNEL_IDS.JUMMAH_REMINDER, {
        name: 'یادآوری نماز جمعه',
        importance: NotificationsModule.AndroidImportance.HIGH,
        vibrationPattern: [0, 180, 120, 180],
        lightColor: '#1a4d3e',
        sound: null,
        enableVibrate: true,
        showBadge: true,
      }, null);

      if (typeof deleteChannel === 'function') {
        await Promise.allSettled([
          deleteChannel('adhan-fajr'),
          deleteChannel('adhan-regular'),
          deleteChannel('adhan-fajr-v1'),
          deleteChannel('adhan-regular-v1'),
          deleteChannel('adhan-fajr-v2'),
          deleteChannel('adhan-regular-v2'),
          deleteChannel('adhan-fajr-v3'),
          deleteChannel('adhan-regular-v3'),
          deleteChannel('adhan-fajr-v4'),
          deleteChannel('adhan-regular-v4'),
          deleteChannel('adhan-fajr-v5'),
          deleteChannel('adhan-regular-v5'),
          deleteChannel('adhan-fajr-v6'),
          deleteChannel('adhan-regular-v6'),
          deleteChannel('prayer-silent'),
          deleteChannel('prayer-silent-v1'),
          deleteChannel('prayer-reminder'),
          deleteChannel('prayer-reminder-v1'),
          deleteChannel('jummah-reminder'),
          deleteChannel('jummah-reminder-v1'),
        ]);
      }
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
    if (getCity(selectedCity)) {
      return selectedCity;
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
      const [locationJson, settingsJson, adhanPrefs, globallySelectedCity, lastDelaySecondsRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LOCATION),
        AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
        loadAdhanPreferences(),
        AsyncStorage.getItem(STORAGE_KEYS.SELECTED_CITY),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_ADHAN_DELAY_SECONDS),
      ]);

      const settings = settingsJson ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsJson) } : DEFAULT_SETTINGS;
      let effectiveSettings = settings;
      let shouldPersistSettings = false;

      let location = DEFAULT_LOCATION;
      let name = 'کابل';

      const normalizedSettingsCityKey = toCityKey(settings.selectedCity);
      const normalizedGlobalCityKey = toCityKey(globallySelectedCity);
      const resolvedCityKey = normalizedSettingsCityKey || normalizedGlobalCityKey;

      if (resolvedCityKey) {
        const selected = getCity(resolvedCityKey);
        if (selected) {
          location = {
            latitude: selected.lat,
            longitude: selected.lon,
            altitude: selected.altitude || 0,
            timezone: selected.timezone,
          };
          name = selected.name;

          if (settings.selectedCity !== resolvedCityKey) {
            effectiveSettings = { ...settings, selectedCity: resolvedCityKey };
            shouldPersistSettings = true;
          }
        }
      } else if (locationJson) {
        const saved = JSON.parse(locationJson);
        location = saved.location;
        name = saved.name;
      }

      dispatch({ type: 'INITIALIZE', payload: { location, settings: effectiveSettings, adhanPreferences: adhanPrefs, name } });
      const parsedDelay = Number.parseInt(lastDelaySecondsRaw || '', 10);
      if (Number.isFinite(parsedDelay) && parsedDelay >= 0) {
        dispatch({ type: 'SET_LAST_ADHAN_DELAY_SECONDS', payload: parsedDelay });
      }
      await loadPrayerTimesFor(location, effectiveSettings.selectedCity, effectiveSettings);
      if (shouldPersistSettings) {
        await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(effectiveSettings));
      }

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

  const getTimezoneOffsetMinutes = useCallback((timeZone: string | undefined, date: Date): number => {
    if (!timeZone) return date.getTimezoneOffset() * -1;
    try {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const parts = dtf.formatToParts(date);
      const lookup = (type: string) => parts.find((p) => p.type === type)?.value || '00';
      const y = lookup('year');
      const m = lookup('month');
      const d = lookup('day');
      const hh = lookup('hour');
      const mm = lookup('minute');
      const ss = lookup('second');
      const asUTC = new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}Z`);
      return Math.round((asUTC.getTime() - date.getTime()) / 60000);
    } catch {
      return date.getTimezoneOffset() * -1;
    }
  }, []);

  const buildDateFromLocalTimeInTimezone = useCallback(
    (anchorDate: Date, time: string, timeZone: string | undefined): Date => {
      const [hh, mm] = time.split(':').map((v) => parseInt(v, 10));
      const tzOffsetMinutes = getTimezoneOffsetMinutes(timeZone, anchorDate);
      const utcMillis =
        Date.UTC(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate(), hh, mm) -
        tzOffsetMinutes * 60 * 1000;
      return new Date(utcMillis);
    },
    [getTimezoneOffsetMinutes]
  );

  const isFridayInTimezone = useCallback((date: Date, timeZone: string | undefined): boolean => {
    try {
      const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
      }).format(date);
      return weekday === 'Fri';
    } catch {
      return date.getDay() === 5;
    }
  }, []);

  const getLocationKey = useCallback(() => {
    const cityKey = state.settings.selectedCity;
    if (cityKey) return `city:${cityKey}`;
    const { latitude, longitude } = state.location;
    return `gps:${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  }, [state.location, state.settings.selectedCity]);

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
            await requestPrayerScheduleRef.current('midnight-refresh');
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
          await requestPrayerScheduleRef.current('app-resume');
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

  const setCustomLocation = useCallback(async (location: LocationType, name: string, cityKey?: string) => {
    const resolvedCityKey = toCityKey(cityKey || null) || null;
    dispatch({ type: 'SET_LOCATION', payload: { location, name } });
    dispatch({ type: 'SET_SETTINGS', payload: { selectedCity: resolvedCityKey } });

    await AsyncStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify({ location, name }));
    await AsyncStorage.setItem(
      STORAGE_KEYS.SETTINGS,
      JSON.stringify({ ...state.settings, selectedCity: resolvedCityKey })
    );
  }, [state.settings]);

  const updateSettings = useCallback(async (settings: Partial<PrayerSettings>) => {
    dispatch({ type: 'SET_SETTINGS', payload: settings });

    const newSettings = { ...state.settings, ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
  }, [state.settings]);

  const updateAdhanPreferences = useCallback(async (preferences: Partial<AdhanPreferences>) => {
    const newPreferences = { ...state.adhanPreferences, ...preferences };
    dispatch({ type: 'SET_ADHAN_PREFERENCES', payload: newPreferences });
    await saveAdhanPreferences(newPreferences);

    // One-time prompt when enabling adhan with sound for Fajr or Maghrib (Android)
    if (Platform.OS === 'android') {
      const newFajr = { ...state.adhanPreferences.fajr, ...(preferences.fajr || {}) };
      const newMaghrib = { ...state.adhanPreferences.maghrib, ...(preferences.maghrib || {}) };
      const fajrSoundJustEnabled = !state.adhanPreferences.fajr.playSound && newFajr.playSound;
      const maghribSoundJustEnabled = !state.adhanPreferences.maghrib.playSound && newMaghrib.playSound;
      if (fajrSoundJustEnabled || maghribSoundJustEnabled) {
        try {
          const alreadyShown = await AsyncStorage.getItem(STORAGE_KEYS.EXACT_ALARM_PROMPT_SHOWN);
          if (!alreadyShown) {
            await AsyncStorage.setItem(STORAGE_KEYS.EXACT_ALARM_PROMPT_SHOWN, '1');
            Alert.alert(
              'اذان به موقع',
              'برای اذان به موقع، لطفاً در تنظیمات برنامه دسترسی «ساعت و یادآوری» را فعال کنید.',
              [
                { text: 'بعداً' },
                { text: 'تنظیمات', onPress: () => Linking.openSettings() },
              ]
            );
          }
        } catch {
          // Ignore storage errors
        }
      }
    }

    // Reschedule notifications with new preferences
    if (state.prayerTimes) {
      try {
        await requestPrayerScheduleRef.current('preferences-update');
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
              ...(Platform.OS === 'android' && { channelId: CHANNEL_IDS.PRAYER_REMINDER }),
            },
            trigger: {
              type: NotificationsModule.SchedulableTriggerInputTypes.DATE,
              date: notificationTime,
              ...(Platform.OS === 'android' && { channelId: CHANNEL_IDS.PRAYER_REMINDER }),
            },
          });
        }
      }
    } catch (error) {
      console.error('Notification scheduling error:', error);
    }
  }, [state.settings.notificationsEnabled, state.settings.notificationMinutesBefore, state.prayerTimes]);

  const isValidDate = useCallback((date: Date): boolean => {
    return date instanceof Date && !isNaN(date.getTime()) && date.getTime() > 0;
  }, []);

  const areTimesOrdered = useCallback((times: PrayerTimes): boolean => {
    const ordered = [times.fajr, times.sunrise, times.dhuhr, times.asr, times.maghrib, times.isha];
    if (ordered.some((t) => !isValidDate(t))) return false;
    for (let i = 1; i < ordered.length; i++) {
      if (ordered[i].getTime() <= ordered[i - 1].getTime()) return false;
    }
    return true;
  }, [isValidDate]);

  const extractTriggerMs = useCallback((trigger: any): number | null => {
    if (!trigger) return null;
    const candidate = trigger.date ?? trigger.value ?? trigger.timestamp;
    if (candidate instanceof Date) return candidate.getTime();
    if (typeof candidate === 'number') return candidate;
    if (typeof candidate === 'string') {
      const parsed = Date.parse(candidate);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  }, []);

  const isPrayerRelatedNotification = useCallback((notification: any): boolean => {
    const identifier = String(notification?.identifier || '');
    const type = (notification?.content?.data?.type as string | undefined) || '';
    return (
      identifier.startsWith('adhan-') ||
      identifier.startsWith('jummah-') ||
      type === 'adhan' ||
      type === 'reminder' ||
      type === 'jummah'
    );
  }, []);

  const buildExpectedPrayerNotifications = useCallback(async (now: Date): Promise<ExpectedPrayerNotification[]> => {
    if (!state.prayerTimes || !state.adhanPreferences.masterEnabled) return [];

    const cityKey = toCityKey(state.settings.selectedCity);
    if (!cityKey) {
      return [];
    }
    const { adhanPreferences } = state;
    const fallbackTimeZone =
      state.location.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const rollingDays =
      Platform.OS === 'android'
        ? PRAYER_ROLLING_DAYS_ANDROID
        : adhanPreferences.earlyReminder
          ? PRAYER_ROLLING_DAYS_IOS_WITH_REMINDER
          : PRAYER_ROLLING_DAYS_IOS;

    const prayerKeys: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const enabledPrayers = prayerKeys.filter((prayer) => adhanPreferences[prayer].enabled);
    const expected: ExpectedPrayerNotification[] = [];

    for (let dayOffset = 0; dayOffset < rollingDays; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setHours(12, 0, 0, 0);
      targetDate.setDate(now.getDate() + dayOffset);

      let dayTimes: PrayerTimes;
      let dayTimeZone = fallbackTimeZone;
      try {
        const result = await getPrayerTimesForDate({
          cityKey,
          location: state.location,
          date: targetDate,
        });
        dayTimes = result.times;
        dayTimeZone = result.timezone || dayTimeZone;
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

      const fridayAnchor = isValidDate(dayTimes.dhuhr) ? dayTimes.dhuhr : targetDate;
      const isFriday = isFridayInTimezone(fridayAnchor, dayTimeZone);

      for (const prayerKey of enabledPrayers) {
        const prayerSettings = adhanPreferences[prayerKey];
        const isFridayJummah = prayerKey === 'dhuhr' && isFriday;
        const scheduleTime = isFridayJummah
          ? buildDateFromLocalTimeInTimezone(fridayAnchor, '13:00', dayTimeZone)
          : new Date(dayTimes[prayerKey]);
        if (!isValidDate(scheduleTime) || scheduleTime <= now) continue;

        const content = isFridayJummah
          ? { title: 'نماز جمعه', body: 'وقت نماز جمعه است' }
          : getNotificationContent(prayerKey, true);
        const channelId = prayerKey === 'fajr' ? CHANNEL_IDS.ADHAN_FAJR : CHANNEL_IDS.ADHAN_REGULAR;
        const dayKey = getDateKey(scheduleTime);
        const adhanId = isFridayJummah
          ? `adhan-jummah-${dayKey}`
          : `adhan-${prayerKey}-${dayKey}`;

        expected.push({
          id: adhanId,
          type: 'adhan',
          prayerKey,
          dayKey,
          triggerDate: scheduleTime,
          channelId,
          title: content.title,
          body: content.body,
          sound: ADHAN_SOUND_FILENAME,
          data: {
            prayer: prayerKey,
            type: 'adhan',
            playSound: true,
            voice: prayerSettings.selectedVoice,
            dayKey,
            isJummah: isFridayJummah,
            expectedFireAtMs: scheduleTime.getTime(),
          },
        });

        if (adhanPreferences.earlyReminder && adhanPreferences.earlyReminderMinutes > 0) {
          const reminderTime = new Date(
            scheduleTime.getTime() - adhanPreferences.earlyReminderMinutes * 60 * 1000
          );
          if (reminderTime > now && isValidDate(reminderTime)) {
            const reminderContent = isFridayJummah
              ? {
                title: 'یادآوری نماز',
                body: `${adhanPreferences.earlyReminderMinutes} دقیقه تا نماز جمعه`,
              }
              : getEarlyReminderContent(prayerKey, adhanPreferences.earlyReminderMinutes);
            const reminderId = isFridayJummah
              ? `adhan-jummah-${dayKey}-reminder`
              : `adhan-${prayerKey}-${dayKey}-reminder`;
            expected.push({
              id: reminderId,
              type: 'reminder',
              prayerKey,
              dayKey,
              triggerDate: reminderTime,
              channelId: CHANNEL_IDS.PRAYER_REMINDER,
              title: reminderContent.title,
              body: reminderContent.body,
              sound: false,
              data: {
                prayer: prayerKey,
                type: 'reminder',
                dayKey,
                expectedFireAtMs: reminderTime.getTime(),
              },
            });
          }
        }
      }
    }

    return expected;
  }, [
    areTimesOrdered,
    buildDateFromLocalTimeInTimezone,
    getDateKey,
    isFridayInTimezone,
    isValidDate,
    state,
  ]);

  const runPrayerScheduleNow = useCallback(async (reason: string, runId: number) => {
    const NotificationsModule = await loadNotificationsIfAvailable();
    if (!NotificationsModule) {
      console.log('Skipping notification scheduling: Expo Go, web platform or Notifications unavailable');
      return;
    }

    if (!state.prayerTimes) {
      console.log('Skipping notification scheduling: prayer times not available');
      return;
    }

    const resolvedCityKey = toCityKey(state.settings.selectedCity);
    if (!resolvedCityKey) {
      const scheduledAll = await NotificationsModule.getAllScheduledNotificationsAsync();
      const prayerScheduled = scheduledAll.filter(isPrayerRelatedNotification);
      await Promise.allSettled(
        prayerScheduled
          .map((notification) => String((notification as any)?.identifier || ''))
          .filter((id) => id.length > 0)
          .map((id) => NotificationsModule.cancelScheduledNotificationAsync(id))
      );
      dispatch({
        type: 'SET_SCHEDULE_AUDIT',
        payload: {
          generatedAt: Date.now(),
          reason,
          expectedCount: 0,
          expectedAdhanCount: 0,
          scheduledCount: 0,
          scheduledAdhanCount: 0,
          duplicateCount: 0,
          maxDriftSeconds: 0,
        },
      });
      dispatch({
        type: 'SET_ERROR',
        payload: 'برای فعال شدن اذان، اول شهر را انتخاب یا موقعیت را فعال کنید.',
      });
      lastScheduleRef.current = {
        dateKey: getDateKey(new Date()),
        locationKey: getLocationKey(),
      };
      return;
    }

    if (Platform.OS === 'android') {
      await configureAndroidNotificationChannels(NotificationsModule);
    }

    const exactStatus = await checkExactAlarmCapability();
    dispatch({ type: 'SET_EXACT_ALARM_STATUS', payload: exactStatus });
    if (Platform.OS === 'android' && exactStatus === 'missing') {
      dispatch({
        type: 'SET_ERROR',
        payload: 'دسترسی «آلارم دقیق» غیرفعال است؛ ممکن است اعلان‌ها با تاخیر برسند.',
      });
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
    const expected = await buildExpectedPrayerNotifications(now);

    const scheduledAll = await NotificationsModule.getAllScheduledNotificationsAsync();
    const prayerScheduled = scheduledAll.filter(isPrayerRelatedNotification);

    if (!state.adhanPreferences.masterEnabled) {
      await Promise.allSettled(
        prayerScheduled
          .map((notification) => String((notification as any)?.identifier || ''))
          .filter((id) => id.length > 0)
          .map((id) => NotificationsModule.cancelScheduledNotificationAsync(id))
      );
      dispatch({
        type: 'SET_SCHEDULE_AUDIT',
        payload: {
          generatedAt: Date.now(),
          reason,
          expectedCount: 0,
          expectedAdhanCount: 0,
          scheduledCount: 0,
          scheduledAdhanCount: 0,
          duplicateCount: 0,
          maxDriftSeconds: 0,
        },
      });
      lastScheduleRef.current = {
        dateKey: getDateKey(new Date()),
        locationKey: getLocationKey(),
      };
      dispatch({ type: 'SET_ERROR', payload: null });
      return;
    }

    const expectedById = new Map(expected.map((item) => [item.id, item]));
    const existingById = new Map<string, any[]>();
    for (const notification of prayerScheduled) {
      const id = String((notification as any)?.identifier || '');
      if (!id) continue;
      const list = existingById.get(id) || [];
      list.push(notification);
      existingById.set(id, list);
    }

    const idsToCancel = new Set<string>();
    const toCreate: ExpectedPrayerNotification[] = [];
    let duplicateCount = 0;
    let maxDriftSeconds = 0;

    for (const [id, notifications] of existingById.entries()) {
      const expectedItem = expectedById.get(id);
      if (!expectedItem) {
        notifications.forEach((n) => idsToCancel.add(String((n as any)?.identifier || '')));
        continue;
      }

      let keeper = notifications[0];
      let keeperDrift = Number.MAX_SAFE_INTEGER;
      const expectedMs = expectedItem.triggerDate.getTime();

      for (const notification of notifications) {
        const triggerMs = extractTriggerMs((notification as any)?.trigger);
        const drift = triggerMs === null ? Number.MAX_SAFE_INTEGER : Math.abs(triggerMs - expectedMs);
        if (drift < keeperDrift) {
          keeper = notification;
          keeperDrift = drift;
        }
      }

      for (const notification of notifications) {
        if (notification !== keeper) {
          duplicateCount += 1;
          idsToCancel.add(String((notification as any)?.identifier || ''));
        }
      }

      if (keeperDrift === Number.MAX_SAFE_INTEGER || keeperDrift > 30_000) {
        idsToCancel.add(String((keeper as any)?.identifier || id));
        toCreate.push(expectedItem);
      } else {
        maxDriftSeconds = Math.max(maxDriftSeconds, Math.round(keeperDrift / 1000));
      }
    }

    for (const expectedItem of expected) {
      if (!existingById.has(expectedItem.id)) {
        toCreate.push(expectedItem);
      }
    }

    await Promise.allSettled(
      Array.from(idsToCancel)
        .filter((id) => id.length > 0)
        .map((id) => NotificationsModule.cancelScheduledNotificationAsync(id))
    );

    for (const item of toCreate) {
      if (__DEV__) {
        console.log(
          `[AdhanSchedule] run=${runId} reason=${reason} identifier=${item.id} prayer=${item.prayerKey} channelId=${item.channelId} type=${item.type}`
        );
      }
      await NotificationsModule.scheduleNotificationAsync({
        identifier: item.id,
        content: {
          title: item.title,
          body: item.body,
          sound: item.sound,
          ...(Platform.OS === 'android' && item.type === 'adhan' ? { vibrate: [] } : {}),
          data: item.data,
          ...(Platform.OS === 'android' && { channelId: item.channelId }),
          ...(Platform.OS === 'android' && item.type === 'adhan'
            ? { priority: NotificationsModule.AndroidNotificationPriority.HIGH }
            : {}),
        },
        trigger: {
          type: NotificationsModule.SchedulableTriggerInputTypes.DATE,
          date: item.triggerDate,
          ...(Platform.OS === 'android' && { channelId: item.channelId }),
        },
      });
    }

    const afterAll = await NotificationsModule.getAllScheduledNotificationsAsync();
    const afterPrayer = afterAll.filter(isPrayerRelatedNotification);
    const scheduledAdhanCount = afterPrayer.filter((n) => {
      const type = (n as any)?.content?.data?.type;
      return type === 'adhan';
    }).length;

    dispatch({
      type: 'SET_SCHEDULE_AUDIT',
      payload: {
        generatedAt: Date.now(),
        reason,
        expectedCount: expected.length,
        expectedAdhanCount: expected.filter((item) => item.type === 'adhan').length,
        scheduledCount: afterPrayer.length,
        scheduledAdhanCount,
        duplicateCount,
        maxDriftSeconds,
      },
    });

    lastScheduleRef.current = {
      dateKey: getDateKey(new Date()),
      locationKey: getLocationKey(),
    };
    if (!(Platform.OS === 'android' && exactStatus === 'missing')) {
      dispatch({ type: 'SET_ERROR', payload: null });
    }
  }, [
    buildExpectedPrayerNotifications,
    checkExactAlarmCapability,
    checkNotificationPermission,
    extractTriggerMs,
    getDateKey,
    getLocationKey,
    isPrayerRelatedNotification,
    state.adhanPreferences.masterEnabled,
    state.prayerTimes,
    state.settings.selectedCity,
  ]);

  const requestPrayerSchedule = useCallback(async (reason = 'manual') => {
    if (scheduleInFlightRef.current) {
      schedulePendingRef.current = true;
      schedulePendingReasonRef.current = reason;
      return;
    }

    scheduleInFlightRef.current = true;
    dispatch({ type: 'SET_IS_SCHEDULING', payload: true });
    let nextReason = reason;

    try {
      do {
        schedulePendingRef.current = false;
        schedulePendingReasonRef.current = null;
        const runId = ++scheduleRunIdRef.current;
        await runPrayerScheduleNow(nextReason, runId);
        nextReason = schedulePendingReasonRef.current || 'coalesced';
      } while (schedulePendingRef.current);
    } catch (error) {
      console.error('❌ Adhan notification scheduling error:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: `خطا در زمان‌بندی اعلان‌ها: ${error instanceof Error ? error.message : 'خطای ناشناخته'}`,
      });
    } finally {
      scheduleInFlightRef.current = false;
      dispatch({ type: 'SET_IS_SCHEDULING', payload: false });
    }
  }, [runPrayerScheduleNow]);

  const scheduleAdhanNotifications = useCallback(async () => {
    await requestPrayerSchedule('manual');
  }, [requestPrayerSchedule]);

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
    } catch (error) {
      console.warn('Failed to schedule Jummah notifications:', error);
    }
  }, [
    cancelScheduledNotificationsByPredicate,
  ]);

  requestPrayerScheduleRef.current = requestPrayerSchedule;
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
        const exactModule = getExactAlarmModule();
        if (state.exactAlarmStatus === 'missing' && exactModule?.openExactAlarmSettings) {
          const opened = await exactModule.openExactAlarmSettings();
          if (opened) {
            return;
          }
        }
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
  }, [getExactAlarmModule, state.exactAlarmStatus]);

  const scheduleAdhanSystemTest = useCallback(async (): Promise<boolean> => {
    const NotificationsModule = await loadNotificationsIfAvailable();
    if (!NotificationsModule) {
      return false;
    }

    try {
      if (Platform.OS === 'android') {
        await configureAndroidNotificationChannels(NotificationsModule);
      }

      const permissionStatus = await checkNotificationPermission();
      if (permissionStatus !== 'granted') {
        const { status } = await NotificationsModule.requestPermissionsAsync();
        if (status !== 'granted') {
          return false;
        }
      }

      await NotificationsModule.scheduleNotificationAsync({
        identifier: `adhan-system-test-${Date.now()}`,
        content: {
          title: 'تست اذان',
          body: 'اگر این اعلان با صدا رسید، تنظیمات سیستم درست است.',
          sound: ADHAN_SOUND_FILENAME,
          data: {
            type: 'adhan_test',
            playSound: true,
            voice: 'barakatullah',
          },
          ...(Platform.OS === 'android' && { channelId: CHANNEL_IDS.ADHAN_REGULAR }),
          ...(Platform.OS === 'android'
            ? { priority: NotificationsModule.AndroidNotificationPriority.HIGH, vibrate: [] }
            : {}),
        },
        trigger: {
          type: NotificationsModule.SchedulableTriggerInputTypes.DATE,
          date: new Date(Date.now() + 25 * 1000),
          ...(Platform.OS === 'android' && { channelId: CHANNEL_IDS.ADHAN_REGULAR }),
        },
      });

      return true;
    } catch (error) {
      console.error('Failed to schedule system adhan test:', error);
      return false;
    }
  }, [checkNotificationPermission]);

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
        requestPrayerSchedule,
        scheduleAdhanSystemTest,
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
