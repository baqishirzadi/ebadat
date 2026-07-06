import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

import {
  getNativeAdhanHealth,
  NativeAdhanHealth,
  runNativeAdhanMaintenance,
} from '@/utils/nativeAdhanScheduler';
import { triggerPrayerScheduleFromBackground } from '@/utils/prayerScheduleCoordinator';

const BATTERY_NUDGE_SNOOZE_KEY = '@ebadat/battery_nudge_snooze_until';
const BATTERY_NUDGE_SNOOZE_DAYS = 7;
const DELAY_NUDGE_THRESHOLD_SECONDS = 60;

const AGGRESSIVE_OEMS = [
  'xiaomi',
  'redmi',
  'poco',
  'huawei',
  'honor',
  'oppo',
  'vivo',
  'oneplus',
  'meizu',
  'tecno',
  'infinix',
  'itel',
];

export type AdhanHealthIssue =
  | 'notification_denied'
  | 'exact_alarm_missing'
  | 'config_missing'
  | 'master_disabled'
  | 'no_alarms_scheduled'
  | 'battery_optimization_active'
  | 'native_module_unavailable';

export interface AdhanHealthState extends NativeAdhanHealth {
  shouldShowBatteryNudge: boolean;
  shouldShowHealthBanner: boolean;
}

export function isAggressiveOem(manufacturer: string): boolean {
  const normalized = manufacturer.toLowerCase();
  return AGGRESSIVE_OEMS.some((oem) => normalized.includes(oem));
}

function isAdhanPendingNotification(notification: unknown): boolean {
  const identifier = String((notification as any)?.identifier || '');
  const type = (notification as any)?.content?.data?.type;
  return (
    type === 'adhan' ||
    (identifier.startsWith('adhan-') && !identifier.endsWith('-reminder'))
  );
}

async function fetchIOSAdhanHealth(): Promise<AdhanHealthState> {
  const issues: AdhanHealthIssue[] = [];
  let notificationsEnabled = false;
  let scheduledAlarmCount = 0;

  try {
    const Notifications = await import('expo-notifications');
    const permission = await Notifications.getPermissionsAsync();
    notificationsEnabled = permission.status === 'granted';

    if (!notificationsEnabled) {
      issues.push('notification_denied');
    } else {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      scheduledAlarmCount = scheduled.filter(isAdhanPendingNotification).length;
      if (scheduledAlarmCount === 0) {
        issues.push('no_alarms_scheduled');
      }
    }
  } catch {
    issues.push('no_alarms_scheduled');
  }

  const shouldShowHealthBanner = issues.some((issue) =>
    ['notification_denied', 'no_alarms_scheduled'].includes(issue),
  );

  return {
    notificationsEnabled,
    canScheduleExactAlarms: true,
    scheduledAlarmCount,
    nextAlarmAtMs: null,
    configPresent: true,
    masterEnabled: true,
    isIgnoringBatteryOptimizations: true,
    manufacturer: 'apple',
    issues,
    shouldShowBatteryNudge: false,
    shouldShowHealthBanner,
  };
}

export async function fetchAdhanHealth(): Promise<AdhanHealthState> {
  if (Platform.OS === 'ios') {
    return fetchIOSAdhanHealth();
  }

  if (Platform.OS !== 'android') {
    return {
      notificationsEnabled: true,
      canScheduleExactAlarms: true,
      scheduledAlarmCount: 0,
      nextAlarmAtMs: null,
      configPresent: true,
      masterEnabled: true,
      isIgnoringBatteryOptimizations: true,
      manufacturer: '',
      issues: [],
      shouldShowBatteryNudge: false,
      shouldShowHealthBanner: false,
    };
  }

  const health = await getNativeAdhanHealth();
  const shouldShowHealthBanner = health.issues.some((issue) =>
    ['notification_denied', 'no_alarms_scheduled', 'config_missing'].includes(issue),
  );
  const shouldShowBatteryNudge = await shouldPromptBatteryOptimization(health);

  return {
    ...health,
    shouldShowHealthBanner,
    shouldShowBatteryNudge,
  };
}

export async function shouldPromptBatteryOptimization(health: NativeAdhanHealth): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (health.isIgnoringBatteryOptimizations) return false;

  const snoozedUntil = Number(await AsyncStorage.getItem(BATTERY_NUDGE_SNOOZE_KEY)) || 0;
  if (Date.now() < snoozedUntil) return false;

  if (health.issues.includes('no_alarms_scheduled')) return true;
  if (isAggressiveOem(health.manufacturer)) return true;

  const lastDelay = Number(await AsyncStorage.getItem('@ebadat/last_adhan_delay_seconds')) || 0;
  if (lastDelay >= DELAY_NUDGE_THRESHOLD_SECONDS) return true;

  return false;
}

export async function snoozeBatteryNudge(): Promise<void> {
  const until = Date.now() + BATTERY_NUDGE_SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  await AsyncStorage.setItem(BATTERY_NUDGE_SNOOZE_KEY, String(until));
}

export async function openNotificationSettings(): Promise<void> {
  const { Linking } = await import('react-native');
  await Linking.openSettings();
}

export async function openBatteryOptimizationSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const module = (NativeModules as {
    ExactAlarmModule?: {
      openBatteryOptimizationSettings?: () => Promise<boolean>;
      openOemAutostartSettings?: () => Promise<boolean>;
    };
  }).ExactAlarmModule;

  if (typeof module?.openBatteryOptimizationSettings === 'function') {
    return module.openBatteryOptimizationSettings();
  }
  return false;
}

export async function openOemAutostartSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const module = (NativeModules as {
    ExactAlarmModule?: { openOemAutostartSettings?: () => Promise<boolean> };
  }).ExactAlarmModule;

  if (typeof module?.openOemAutostartSettings === 'function') {
    return module.openOemAutostartSettings();
  }
  return false;
}

export async function triggerAdhanMaintenance(): Promise<void> {
  if (Platform.OS === 'android') {
    await runNativeAdhanMaintenance();
    return;
  }

  if (Platform.OS === 'ios') {
    await triggerPrayerScheduleFromBackground('ios-health-maintenance');
  }
}

export function getHealthBannerMessage(issues: string[]): { title: string; body: string } {
  if (issues.includes('notification_denied')) {
    return {
      title: 'اعلان‌ها غیرفعال است',
      body: 'برای دریافت اذان، اجازه اعلان را در تنظیمات گوشی فعال کنید.',
    };
  }
  if (issues.includes('no_alarms_scheduled')) {
    return {
      title: 'اذان زمان‌بندی نشده',
      body: 'برای بازیابی اذان، یک‌بار برنامه را باز کنید یا دکمه زیر را بزنید.',
    };
  }
  if (issues.includes('config_missing')) {
    return {
      title: 'تنظیمات اذان ناقص است',
      body: 'شهر خود را انتخاب کنید تا اذان به‌درستی فعال شود.',
    };
  }
  return {
    title: 'مشکل در اذان',
    body: 'برای رفع مشکل، تنظیمات را بررسی کنید.',
  };
}
