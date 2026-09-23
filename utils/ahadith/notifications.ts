import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { AhadithNotificationPreferences, Hadith } from '@/types/hadith';
import { resolveCanonicalDailyHadith } from '@/utils/ahadith/daily';
import type { DailyHadithLanguage } from '@/utils/ahadith/daily';
import { getContextTitleFa } from '@/utils/ahadith/labels';
import { IOS_AHADITH_DAYS_AHEAD } from '@/utils/notificationBudget';
import { KABUL_TIME_ZONE, getKabulDateKey } from '@/utils/afghanistanCalendar';
import { addDaysToDateKey, buildDateFromLocalTimeInTimezone } from '@/utils/prayerTimezone';

const CHANNEL_ID = 'ahadith-daily-v1';
const IDENTIFIER_PREFIX = 'ahadith-daily-';

let Notifications: typeof import('expo-notifications') | null = null;

function isExpoGo(): boolean {
  try {
    return (
      Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === Constants.ExecutionEnvironment?.StoreClient
    );
  } catch {
    return false;
  }
}

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

function truncatePreview(text: string, maxLength = 84): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

async function ensureChannel(NotificationsModule: typeof import('expo-notifications')): Promise<void> {
  if (Platform.OS !== 'android') return;

  await NotificationsModule.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'احادیث روزانه',
    importance: NotificationsModule.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180, 120, 180],
    showBadge: true,
    sound: 'default',
  });
}

async function clearPreviousScheduled(NotificationsModule: typeof import('expo-notifications')): Promise<void> {
  const scheduled = await NotificationsModule.getAllScheduledNotificationsAsync();
  for (const item of scheduled) {
    const identifier = (item as any)?.identifier as string;
    if (identifier?.startsWith(IDENTIFIER_PREFIX)) {
      await NotificationsModule.cancelScheduledNotificationAsync(identifier);
    }
  }
}

export async function scheduleAhadithNotifications(
  _hadiths: Hadith[],
  prefs: AhadithNotificationPreferences,
  language: DailyHadithLanguage = 'dari',
  daysAhead = Platform.OS === 'ios' ? IOS_AHADITH_DAYS_AHEAD : 30,
): Promise<{ scheduled: number; enabled: boolean }> {
  const NotificationsModule = await loadNotificationsIfAvailable();
  if (!NotificationsModule) return { scheduled: 0, enabled: false };

  await clearPreviousScheduled(NotificationsModule);

  if (!prefs.enabled) {
    return { scheduled: 0, enabled: false };
  }

  await ensureChannel(NotificationsModule);

  const now = new Date();
  const todayKey = getKabulDateKey(now);
  let scheduledCount = 0;

  for (let offset = 0; offset < daysAhead; offset += 1) {
    const dateKey = addDaysToDateKey(todayKey, offset);
    const selection = resolveCanonicalDailyHadith(dateKey, language);
    const triggerDate = buildDateFromLocalTimeInTimezone(
      dateKey,
      `${String(prefs.hour).padStart(2, '0')}:${String(prefs.minute).padStart(2, '0')}`,
      KABUL_TIME_ZONE,
    );

    if (triggerDate.getTime() <= now.getTime()) {
      continue;
    }

    const identifier = `${IDENTIFIER_PREFIX}${dateKey}`;
    const title = getContextTitleFa(selection.context);
    const body = truncatePreview(selection.text);

    await NotificationsModule.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        data: {
          type: 'ahadith_daily',
          dateKey,
          hadithId: selection.hadith.id,
          sourceBook: selection.hadith.source_book,
        },
        sound: true,
      },
      trigger: {
        type: NotificationsModule.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    scheduledCount += 1;
  }

  return { scheduled: scheduledCount, enabled: true };
}

export async function requestAhadithNotificationPermission(): Promise<boolean> {
  const NotificationsModule = await loadNotificationsIfAvailable();
  if (!NotificationsModule) return false;

  const current = await NotificationsModule.getPermissionsAsync();
  if (current.status === 'granted') return true;

  const requested = await NotificationsModule.requestPermissionsAsync();
  return requested.status === 'granted';
}
