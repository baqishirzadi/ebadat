import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AhadithNotificationPreferences, AhadithSection, DailyHadithSelection, Hadith } from '@/types/hadith';
import {
  getAllHadiths,
  getHadithTopics,
  getHadithsByTopic,
  getMuttafaqHadiths,
} from '@/utils/ahadith/repository';
import { searchHadiths } from '@/utils/ahadith/search';
import { selectDailyHadith } from '@/utils/ahadith/selector';
import {
  requestAhadithNotificationPermission,
  scheduleAhadithNotifications,
} from '@/utils/ahadith/notifications';

const STORAGE_KEYS = {
  bookmarks: '@ebadat/ahadith_bookmarks',
  notifications: '@ebadat/ahadith_notification_prefs',
};

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
}

const AhadithContext = createContext<AhadithContextValue | undefined>(undefined);

function getDateByOffset(offset: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

export function AhadithProvider({ children }: { children: React.ReactNode }) {
  const hadiths = useMemo(() => getAllHadiths(), []);
  const topics = useMemo(() => getHadithTopics(), []);
  const muttafaqHadiths = useMemo(() => getMuttafaqHadiths(), []);

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

  useEffect(() => {
    let cancelled = false;

    const loadPersisted = async () => {
      try {
        const [bookmarksRaw, notificationsRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.bookmarks),
          AsyncStorage.getItem(STORAGE_KEYS.notifications),
        ]);

        if (cancelled) return;

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
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const date = getDateByOffset(dayOffset);
    setDailySelection(selectDailyHadith(hadiths, date));
  }, [dayOffset, hadiths, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    void AsyncStorage.setItem(STORAGE_KEYS.bookmarks, JSON.stringify(bookmarks));
  }, [bookmarks, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    void AsyncStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(notificationPrefs));
    void scheduleAhadithNotifications(hadiths, notificationPrefs).catch((error) => {
      if (__DEV__) {
        console.warn('[Ahadith] Failed to schedule notifications', error);
      }
    });
  }, [notificationPrefs, hadiths, isLoading]);

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
      const date = getDateByOffset(dayOffset);
      setDailySelection(selectDailyHadith(hadiths, date));
    } finally {
      setIsRefreshing(false);
    }
  }, [dayOffset, hadiths]);

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
