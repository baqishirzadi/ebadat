import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { AhadithNotificationPreferences, Hadith } from '@/types/hadith';
import { selectDailyHadith } from '@/utils/ahadith/selector';

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

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function truncatePreview(text: string, maxLength = 84): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

function getContextualTitle(selection: ReturnType<typeof selectDailyHadith>): string {
  if (selection.context.specialDayKeys.includes('laylat_al_qadr')) return "Laylat al-Qadr Hadith";
  if (selection.context.specialDayKeys.includes('eid_al_fitr')) return "Eid al-Fitr Hadith";
  if (selection.context.specialDayKeys.includes('eid_al_adha')) return "Eid al-Adha Hadith";
  if (selection.context.specialDayKeys.includes('ramadan')) return 'Ramadan Hadith';
  if (selection.context.isFriday) return "Jumu'ah Hadith";
  return 'Daily Hadith';
}

async function ensureChannel(NotificationsModule: typeof import('expo-notifications')): Promise<void> {
  if (Platform.OS !== 'android') return;

  await NotificationsModule.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Ahadith Daily',
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
  hadiths: Hadith[],
  prefs: AhadithNotificationPreferences,
  daysAhead = 30
): Promise<{ scheduled: number; enabled: boolean }> {
  const NotificationsModule = await loadNotificationsIfAvailable();
  if (!NotificationsModule) return { scheduled: 0, enabled: false };

  await clearPreviousScheduled(NotificationsModule);

  if (!prefs.enabled) {
    return { scheduled: 0, enabled: false };
  }

  await ensureChannel(NotificationsModule);

  const now = new Date();
  let scheduledCount = 0;

  for (let offset = 0; offset < daysAhead; offset += 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);

    const selection = selectDailyHadith(hadiths, date);
    const triggerDate = new Date(date);
    triggerDate.setHours(prefs.hour, prefs.minute, 0, 0);

    if (triggerDate.getTime() <= now.getTime()) {
      continue;
    }

    const identifier = `${IDENTIFIER_PREFIX}${dateKey(date)}`;
    const title = getContextualTitle(selection);
    const body = truncatePreview(selection.hadith.dari_translation);

    await NotificationsModule.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        data: {
          type: 'ahadith_daily',
          dateKey: dateKey(date),
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
