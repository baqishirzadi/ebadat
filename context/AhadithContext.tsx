import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, InteractionManager } from 'react-native';
import { AhadithNotificationPreferences, AhadithSection, DailyHadithSelection, Hadith } from '@/types/hadith';
import {
  getAllHadiths,
  getHadithTopics,
  getHadithsByTopic,
  getMuttafaqHadiths,
  setRemoteHadiths,
} from '@/utils/ahadith/repository';
import { searchHadiths } from '@/utils/ahadith/search';
import { resolveCanonicalDailyHadith } from '@/utils/ahadith/daily';
import { useApp } from '@/context/AppContext';
import {
  requestAhadithNotificationPermission,
  scheduleAhadithNotifications,
} from '@/utils/ahadith/notifications';
import { getCachedRemoteHadiths, syncPublishedHadiths } from '@/utils/ahadithRemoteService';
import { useStartupPhase } from '@/context/StartupPhaseContext';
import { addDaysToKabulDate, getKabulNoon } from '@/utils/afghanistanCalendar';

const STORAGE_KEYS = {
  bookmarks: '@ebadat/ahadith_bookmarks',
  notifications: '@ebadat/ahadith_notification_prefs',
};
const REMOTE_SYNC_COOLDOWN_MS = 2 * 60 * 1000;

const DEFAULT_NOTIFICATION_PREFS: AhadithNotificationPreferences = {
  enabled: true,
  hour: 8,
  minute: 0,
};

interface AhadithContextValue {
  hadiths: Hadith[];
  dailySelection: DailyHadithSelection | null;
  dayOffset: number;
  section: AhadithSection;
  bookmarks: number[];
  isLoading: boolean;
  isRefreshing: boolean;
  selectedTopic: string | null;
  topics: string[];
  topicHadiths: Hadith[];
  muttafaqHadiths: Hadith[];
  searchQuery: string;
  searchResults: Hadith[];
  notificationPrefs: AhadithNotificationPreferences;
  setSection: (section: AhadithSection) => void;
  goToNextDay: () => void;
  goToPreviousDay: () => void;
  refreshDaily: () => Promise<void>;
  setSelectedTopic: (topic: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleBookmark: (hadithId: number) => Promise<void>;
  isBookmarked: (hadithId: number) => boolean;
  setNotificationTime: (hour: number, minute: number) => Promise<boolean>;
  setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
  syncRemoteHadiths: (force?: boolean) => Promise<void>;
}

const AhadithContext = createContext<AhadithContextValue | undefined>(undefined);

function getDateByOffset(offset: number): Date {
  return addDaysToKabulDate(getKabulNoon(), offset);
}

export function AhadithProvider({ children }: { children: React.ReactNode }) {
  const { state: appState } = useApp();
  const dailyLanguage = appState.preferences.appLanguage;
  const { isInteractiveReady, isAdhanSettled } = useStartupPhase();
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const topics = useMemo(() => (hadiths.length ? getHadithTopics() : []), [hadiths]);
  const muttafaqHadiths = useMemo(() => (hadiths.length ? getMuttafaqHadiths() : []), [hadiths]);

  const [section, setSection] = useState<AhadithSection>('daily');
  const [dayOffset, setDayOffset] = useState(0);
  const [dailySelection, setDailySelection] = useState<DailyHadithSelection | null>(null);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationPrefs, setNotificationPrefsState] =
    useState<AhadithNotificationPreferences>(DEFAULT_NOTIFICATION_PREFS);
  const syncInFlightRef = React.useRef<Promise<void> | null>(null);
  const lastSyncAtRef = React.useRef(0);
  const localSeedLoadedRef = React.useRef(false);

  const applyRemoteHadiths = useCallback((remoteHadiths: Hadith[]) => {
    setRemoteHadiths(remoteHadiths);
    setHadiths(getAllHadiths());
  }, []);

  useEffect(() => {
    if (!isInteractiveReady) return;

    let cancelled = false;

    const loadPersisted = async () => {
      try {
        if (!localSeedLoadedRef.current) {
          localSeedLoadedRef.current = true;
          setHadiths(getAllHadiths());
        }

        const [bookmarksRaw, notificationsRaw, remoteCached] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.bookmarks),
          AsyncStorage.getItem(STORAGE_KEYS.notifications),
          getCachedRemoteHadiths(),
        ]);

        if (cancelled) return;
        applyRemoteHadiths(remoteCached);

        if (bookmarksRaw) {
          const parsed = JSON.parse(bookmarksRaw);
          if (Array.isArray(parsed)) {
            setBookmarks(parsed.filter((id) => Number.isInteger(id) && id > 0));
          }
        }

        if (notificationsRaw) {
          const parsed = JSON.parse(notificationsRaw);
          const normalized: AhadithNotificationPreferences = {
            enabled:
              typeof parsed?.enabled === 'boolean'
                ? parsed.enabled
                : DEFAULT_NOTIFICATION_PREFS.enabled,
            hour:
              Number.isInteger(parsed?.hour) && parsed.hour >= 0 && parsed.hour <= 23
                ? parsed.hour
                : DEFAULT_NOTIFICATION_PREFS.hour,
            minute:
              Number.isInteger(parsed?.minute) && parsed.minute >= 0 && parsed.minute <= 59
                ? parsed.minute
                : DEFAULT_NOTIFICATION_PREFS.minute,
          };
          setNotificationPrefsState(normalized);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[Ahadith] Failed to load persisted state', error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPersisted();

    return () => {
      cancelled = true;
    };
  }, [applyRemoteHadiths, isInteractiveReady]);

  // Defer bundled dataset parse/index until after interactive (seed also loaded in loadPersisted).
  useEffect(() => {
    if (!isInteractiveReady || localSeedLoadedRef.current) return;
    localSeedLoadedRef.current = true;
    const handle = InteractionManager.runAfterInteractions(() => {
      try {
        setHadiths(getAllHadiths());
      } catch (error) {
        if (__DEV__) {
          console.warn('[Ahadith] Failed to load local hadiths', error);
        }
      }
    });
    return () => handle.cancel();
  }, [isInteractiveReady]);

  const syncRemoteHadiths = useCallback(
    async (force = false): Promise<void> => {
      if (syncInFlightRef.current) {
        await syncInFlightRef.current;
        return;
      }

      if (!force && Date.now() - lastSyncAtRef.current < REMOTE_SYNC_COOLDOWN_MS) {
        return;
      }

      const job = (async () => {
        const remoteItems = await syncPublishedHadiths();
        applyRemoteHadiths(remoteItems);
        lastSyncAtRef.current = Date.now();
      })().catch((error) => {
        if (__DEV__) {
          console.warn('[Ahadith] Remote sync failed', error);
        }
      });

      syncInFlightRef.current = job;
      try {
        await job;
      } finally {
        syncInFlightRef.current = null;
      }
    },
    [applyRemoteHadiths]
  );

  useEffect(() => {
    // Local seed stays on hydrate; force remote sync waits for adhan so Hermes isn't stampeded.
    if (!isAdhanSettled || isLoading) return;

    const timer = setTimeout(() => {
      void syncRemoteHadiths(true);
    }, 16_000);
    return () => clearTimeout(timer);
  }, [isAdhanSettled, isLoading, syncRemoteHadiths]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && !isLoading && isAdhanSettled) {
        void syncRemoteHadiths(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAdhanSettled, isLoading, syncRemoteHadiths]);

  useEffect(() => {
    if (isLoading) return;
    const date = getDateByOffset(dayOffset);
    setDailySelection(resolveCanonicalDailyHadith(date, dailyLanguage));
  }, [dayOffset, hadiths, isLoading, dailyLanguage]);

  useEffect(() => {
    if (isLoading) return;
    void AsyncStorage.setItem(STORAGE_KEYS.bookmarks, JSON.stringify(bookmarks));
  }, [bookmarks, isLoading]);

  useEffect(() => {
    if (isLoading || !isAdhanSettled) return;
    void AsyncStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(notificationPrefs));
    const timer = setTimeout(() => {
      void scheduleAhadithNotifications(
        hadiths,
        notificationPrefs,
        appState.preferences.appLanguage === 'pashto' ? 'pashto' : 'dari',
      ).catch((error) => {
        if (__DEV__) {
          console.warn('[Ahadith] Failed to schedule notifications', error);
        }
      });
    }, 19_000);
    return () => clearTimeout(timer);
  }, [notificationPrefs, hadiths, isAdhanSettled, isLoading, appState.preferences.appLanguage]);

  const topicHadiths = useMemo(() => {
    if (!selectedTopic) return [];
    return getHadithsByTopic(selectedTopic);
  }, [selectedTopic]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchHadiths(hadiths, searchQuery, 120).map((result) => result.hadith);
  }, [hadiths, searchQuery]);

  const goToNextDay = useCallback(() => {
    setDayOffset((prev) => prev + 1);
  }, []);

  const goToPreviousDay = useCallback(() => {
    setDayOffset((prev) => prev - 1);
  }, []);

  const refreshDaily = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await syncRemoteHadiths(true);
      const date = getDateByOffset(dayOffset);
      setDailySelection(resolveCanonicalDailyHadith(date, dailyLanguage));
    } finally {
      setIsRefreshing(false);
    }
  }, [dayOffset, hadiths, syncRemoteHadiths, dailyLanguage]);

  const toggleBookmark = useCallback(async (hadithId: number) => {
    setBookmarks((prev) =>
      prev.includes(hadithId) ? prev.filter((id) => id !== hadithId) : [...prev, hadithId]
    );
  }, []);

  const isBookmarked = useCallback(
    (hadithId: number) => bookmarks.includes(hadithId),
    [bookmarks]
  );

  const setNotificationTime = useCallback(async (hour: number, minute: number): Promise<boolean> => {
    const normalizedHour = Math.max(0, Math.min(23, hour));
    const normalizedMinute = Math.max(0, Math.min(59, minute));

    const permissionGranted = await requestAhadithNotificationPermission();
    if (!permissionGranted) return false;

    setNotificationPrefsState((prev) => ({
      ...prev,
      enabled: true,
      hour: normalizedHour,
      minute: normalizedMinute,
    }));

    return true;
  }, []);

  const setNotificationsEnabled = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (!enabled) {
      setNotificationPrefsState((prev) => ({ ...prev, enabled: false }));
      return true;
    }

    const permissionGranted = await requestAhadithNotificationPermission();
    if (!permissionGranted) {
      return false;
    }

    setNotificationPrefsState((prev) => ({ ...prev, enabled: true }));
    return true;
  }, []);

  const value = useMemo<AhadithContextValue>(
    () => ({
      hadiths,
      dailySelection,
      dayOffset,
      section,
      bookmarks,
      isLoading,
      isRefreshing,
      selectedTopic,
      topics,
      topicHadiths,
      muttafaqHadiths,
      searchQuery,
      searchResults,
      notificationPrefs,
      setSection,
      goToNextDay,
      goToPreviousDay,
      refreshDaily,
      setSelectedTopic,
      setSearchQuery,
      toggleBookmark,
      isBookmarked,
      setNotificationTime,
      setNotificationsEnabled,
      syncRemoteHadiths,
    }),
    [
      hadiths,
      dailySelection,
      dayOffset,
      section,
      bookmarks,
      isLoading,
      isRefreshing,
      selectedTopic,
      topics,
      topicHadiths,
      muttafaqHadiths,
      searchQuery,
      searchResults,
      notificationPrefs,
      goToNextDay,
      goToPreviousDay,
      refreshDaily,
      toggleBookmark,
      isBookmarked,
      setNotificationTime,
      setNotificationsEnabled,
      syncRemoteHadiths,
    ]
  );

  return <AhadithContext.Provider value={value}>{children}</AhadithContext.Provider>;
}

export function useAhadith(): AhadithContextValue {
  const context = useContext(AhadithContext);
  if (!context) {
    throw new Error('useAhadith must be used within AhadithProvider');
  }
  return context;
}
