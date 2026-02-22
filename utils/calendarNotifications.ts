/**
 * Calendar (Qamari) Notifications
 * Schedules notifications for lunar Islamic special days, 12 hours before each occasion
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { gregorianToHijri, hijriToGregorian } from './islamicCalendar';
import { SPECIAL_DAYS } from './islamicCalendar';

export const CALENDAR_QAMARI_STORAGE_KEY = '@ebadat/calendar_qamari_notifications';

export interface CalendarQamariNotificationsPreferences {
  enabled: boolean;
}

export const DEFAULT_CALENDAR_QAMARI_PREFERENCES: CalendarQamariNotificationsPreferences = {
  enabled: false,
};

let Notifications: typeof import('expo-notifications') | null = null;

const isExpoGo = (): boolean => {
  try {
    const Constants = require('expo-constants').default;
    return (
      Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === Constants.ExecutionEnvironment?.StoreClient
    );
  } catch {
    return false;
  }
};

async function loadNotificationsIfAvailable(): Promise<typeof import('expo-notifications') | null> {
  if (Platform.OS === 'web') return null;
  if (isExpoGo()) return null;
  if (Notifications) return Notifications;
  try {
    Notifications = await import('expo-notifications');
    return Notifications;
  } catch {
    return null;
  }
}

export async function loadCalendarNotificationPreferences(): Promise<CalendarQamariNotificationsPreferences> {
  try {
    const stored = await AsyncStorage.getItem(CALENDAR_QAMARI_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_CALENDAR_QAMARI_PREFERENCES, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load calendar notification preferences:', error);
  }
  return DEFAULT_CALENDAR_QAMARI_PREFERENCES;
}

export async function saveCalendarNotificationPreferences(
  prefs: CalendarQamariNotificationsPreferences
): Promise<void> {
  try {
    await AsyncStorage.setItem(CALENDAR_QAMARI_STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Failed to save calendar notification preferences:', error);
  }
}

/**
 * Schedule notifications for Qamari SPECIAL_DAYS, 12 hours before each occasion.
 * Only runs when enabled. Cancels previous calendar-qamari-* notifications first.
 */
export async function scheduleCalendarNotifications(
  enabled: boolean
): Promise<{ scheduled: number }> {
  const NotificationsModule = await loadNotificationsIfAvailable();
  if (!NotificationsModule) return { scheduled: 0 };
  if (!enabled) {
    // Cancel existing calendar notifications
    try {
      const scheduled = await NotificationsModule.getAllScheduledNotificationsAsync();
      for (const n of scheduled) {
        const id = (n as any)?.identifier || '';
        const dataType = (n as any)?.content?.data?.type;
        if (id.startsWith('calendar-qamari-') || dataType === 'calendar_qamari') {
          await NotificationsModule.cancelScheduledNotificationAsync(id);
        }
      }
    } catch (e) {
      console.warn('Failed to cancel calendar notifications:', e);
    }
    return { scheduled: 0 };
  }

  const now = new Date();
  const todayH = gregorianToHijri(now);
  const years = [todayH.year, todayH.year + 1];

  let scheduledCount = 0;
  const HOURS_BEFORE = 12;

  try {
    if (Platform.OS === 'android') {
      try {
        await NotificationsModule.setNotificationChannelAsync('calendar-qamari', {
          name: 'مناسبت‌های قمری',
          importance: NotificationsModule.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 100],
          enableVibrate: true,
          showBadge: true,
        });
      } catch {
        // Channel may already exist (created in PrayerContext)
      }
    }

    // Cancel previous calendar-qamari-* notifications
    const scheduled = await NotificationsModule.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      const id = (n as any)?.identifier || '';
      if (id.startsWith('calendar-qamari-')) {
        await NotificationsModule.cancelScheduledNotificationAsync(id);
      }
    }

    for (const hijriYear of years) {
      for (const specialDay of SPECIAL_DAYS) {
        const gregDate = hijriToGregorian(hijriYear, specialDay.month, specialDay.day);
        if (!gregDate) continue;

        gregDate.setHours(0, 0, 0, 0);
        const triggerDate = new Date(gregDate.getTime() - HOURS_BEFORE * 60 * 60 * 1000);

        if (triggerDate.getTime() <= now.getTime()) continue;

        const identifier = `calendar-qamari-${specialDay.month}-${specialDay.day}-${hijriYear}`;

        await NotificationsModule.scheduleNotificationAsync({
          identifier,
          content: {
            title: 'مناسبت قمری',
            body: `فردا: ${specialDay.nameDari}\n${specialDay.descriptionDari}`,
            data: { type: 'calendar_qamari', month: specialDay.month, day: specialDay.day },
            sound: true,
            ...(Platform.OS === 'android' && { channelId: 'calendar-qamari' }),
          },
          trigger: {
            type: NotificationsModule.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
        scheduledCount++;
      }
    }

    if (__DEV__ && scheduledCount > 0) {
      console.log(`Scheduled ${scheduledCount} calendar (Qamari) notifications`);
    }
  } catch (error) {
    console.error('Failed to schedule calendar notifications:', error);
  }

  return { scheduled: scheduledCount };
}
