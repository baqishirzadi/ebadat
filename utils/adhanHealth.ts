import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

import {
  forceNativeAdhanReschedule,
  getNativeAdhanChannelHealth,
  getNativeAdhanFiredEvents,
  getNativeAdhanHealth,
  NativeAdhanChannelHealth,
  NativeAdhanFiredEvent,
  NativeAdhanHealth,
  openNativeAdhanChannelSettings,
  runNativeAdhanMaintenance,
  scheduleNativeSystemTestAlarm,
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
  | 'native_module_unavailable'
  | 'alarms_not_firing'
  | 'channel_unhealthy';

export interface AdhanHealthState extends NativeAdhanHealth {
  shouldShowBatteryNudge: boolean;
  shouldShowHealthBanner: boolean;
}

export interface AdhanHealthCheckItem {
  id: string;
  title: string;
  body: string;
  status: 'pass' | 'fail' | 'warn' | 'info';
  fixLabel?: string;
}

export interface AdhanHealthReport {
  health: AdhanHealthState;
  channelHealth: NativeAdhanChannelHealth | null;
  firedEvents: NativeAdhanFiredEvent[];
  checks: AdhanHealthCheckItem[];
  overallStatus: 'healthy' | 'warning' | 'critical';
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
    lastMaintenanceFiredAtMs: null,
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
      lastMaintenanceFiredAtMs: null,
      shouldShowBatteryNudge: false,
      shouldShowHealthBanner: false,
    };
  }

  const health = await getNativeAdhanHealth();
  const shouldShowHealthBanner = health.issues.some((issue) =>
    [
      'notification_denied',
      'no_alarms_scheduled',
      'config_missing',
      'exact_alarm_missing',
      'alarms_not_firing',
      'channel_unhealthy',
    ].includes(issue),
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

export async function openExactAlarmSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const module = (NativeModules as {
    ExactAlarmModule?: { openExactAlarmSettings?: () => Promise<boolean> };
  }).ExactAlarmModule;

  if (typeof module?.openExactAlarmSettings === 'function') {
    return module.openExactAlarmSettings();
  }
  return false;
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

export async function repairAdhanScheduling(): Promise<void> {
  if (Platform.OS !== 'android') {
    await triggerAdhanMaintenance();
    return;
  }
  await forceNativeAdhanReschedule();
}

export async function openAdhanChannelSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return openNativeAdhanChannelSettings();
}

function formatRelativeTime(timestampMs: number | null): string {
  if (timestampMs == null) return 'هنوز ثبت نشده';
  const diffMs = Date.now() - timestampMs;
  if (diffMs < 60_000) return 'همین الان';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  return `${days} روز پیش`;
}

function formatClockTime(timestampMs: number | null): string {
  if (timestampMs == null) return '—';
  return new Date(timestampMs).toLocaleTimeString('fa-AF', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function buildAdhanHealthReport(): Promise<AdhanHealthReport> {
  const health = await fetchAdhanHealth();
  const channelHealth = Platform.OS === 'android' ? await getNativeAdhanChannelHealth() : null;
  const firedEvents = Platform.OS === 'android' ? await getNativeAdhanFiredEvents() : [];
  const checks: AdhanHealthCheckItem[] = [];

  checks.push({
    id: 'notifications',
    title: 'اجازه اعلان',
    body: health.notificationsEnabled
      ? 'اعلان‌ها در سطح سیستم فعال است.'
      : 'اعلان‌ها غیرفعال است؛ بدون آن اذان زمان‌بندی نمی‌شود.',
    status: health.notificationsEnabled ? 'pass' : 'fail',
    fixLabel: health.notificationsEnabled ? undefined : 'باز کردن تنظیمات',
  });

  if (Platform.OS === 'android' && channelHealth) {
    const channelsOk = channelHealth.fajrHealthy && channelHealth.regularHealthy;
    checks.push({
      id: 'channels',
      title: 'کانال‌های اذان',
      body: channelsOk
        ? 'کانال‌های اذان با صدا و اولویت بالا فعال هستند.'
        : 'کانال اذان خاموش، بی‌صدا یا با اولویت پایین است.',
      status: channelsOk ? 'pass' : 'fail',
      fixLabel: channelsOk ? undefined : 'تنظیم کانال‌ها',
    });
  }

  if (Platform.OS === 'android') {
    const sdkInt = typeof Platform.Version === 'number' ? Platform.Version : 0;
    if (health.canScheduleExactAlarms) {
      checks.push({
        id: 'exact_alarm',
        title: 'زمان‌بندی دقیق',
        body: 'دستگاه اجازه زمان‌بندی دقیق اذان را دارد.',
        status: 'pass',
      });
    } else if (sdkInt >= 33) {
      checks.push({
        id: 'exact_alarm',
        title: 'زمان‌بندی دقیق',
        body: 'حالت عادی فعال است؛ اذان ممکن است کمی تأخیر داشته باشد.',
        status: 'warn',
      });
    } else {
      checks.push({
        id: 'exact_alarm',
        title: 'زمان‌بندی دقیق',
        body: 'اجازه «زنگ هشدار و ساعت» فعال نیست؛ اذان ممکن است دقیق نباشد.',
        status: 'fail',
        fixLabel: 'فعال‌سازی',
      });
    }
  }

  if (Platform.OS === 'android') {
    checks.push({
      id: 'battery',
      title: 'بهینه‌سازی باتری',
      body: health.isIgnoringBatteryOptimizations
        ? 'محدودیت باتری برای عبادت اعمال نشده است.'
        : 'بهینه‌سازی باتری ممکن است اذان را متوقف کند.',
      status: health.isIgnoringBatteryOptimizations ? 'pass' : 'warn',
      fixLabel: health.isIgnoringBatteryOptimizations ? undefined : 'تنظیمات باتری',
    });
  }

  checks.push({
    id: 'config',
    title: 'تنظیمات اذان',
    body: health.configPresent && health.masterEnabled
      ? 'اذان در برنامه فعال است.'
      : health.configPresent
        ? 'اذان در برنامه غیرفعال است.'
        : 'تنظیمات اذان هنوز همگام نشده؛ شهر را انتخاب کنید.',
    status: health.configPresent && health.masterEnabled ? 'pass' : health.configPresent ? 'info' : 'fail',
  });

  if (Platform.OS === 'android' && health.masterEnabled) {
    const alarmsOk = health.scheduledAlarmCount > 0;
    checks.push({
      id: 'scheduled',
      title: 'اذان‌های زمان‌بندی‌شده',
      body: alarmsOk
        ? `${health.scheduledAlarmCount} اذان آینده ثبت شده${health.nextAlarmAtMs ? `؛ بعدی ساعت ${formatClockTime(health.nextAlarmAtMs)}` : ''}.`
        : 'هیچ اذانی زمان‌بندی نشده است.',
      status: alarmsOk ? 'pass' : 'fail',
      fixLabel: alarmsOk ? undefined : 'بازیابی',
    });
  }

  if (Platform.OS === 'android' && health.masterEnabled) {
    const lastAdhan = firedEvents.find((event) => event.type === 'adhan' || event.type === 'system_test');
    const maintenanceStale = health.issues.includes('alarms_not_firing');
    checks.push({
      id: 'delivery',
      title: 'تحویل واقعی اذان',
      body: maintenanceStale
        ? 'سیستم بیش از ۲۶ ساعت هیچ نگهداری/اذانی اجرا نکرده؛ ممکن است زنگ‌ها واقعاً نرسند.'
        : lastAdhan
          ? `آخرین اجرا ${formatRelativeTime(lastAdhan.actualFireAtMs)}${lastAdhan.delaySeconds > 0 ? ` (تأخیر ${lastAdhan.delaySeconds} ثانیه)` : ''}.`
          : health.lastMaintenanceFiredAtMs
            ? `نگهداری سیستم ${formatRelativeTime(health.lastMaintenanceFiredAtMs)} اجرا شد؛ هنوز اذانی ثبت نشده.`
            : 'هنوز اذانی اجرا نشده؛ تست زنده را امتحان کنید.',
      status: maintenanceStale ? 'fail' : lastAdhan ? 'pass' : 'info',
      fixLabel: maintenanceStale || !lastAdhan ? 'تست زنده' : undefined,
    });
  }

  const hasFail = checks.some((check) => check.status === 'fail');
  const hasWarn = checks.some((check) => check.status === 'warn');
  const overallStatus: AdhanHealthReport['overallStatus'] = hasFail
    ? 'critical'
    : hasWarn
      ? 'warning'
      : 'healthy';

  return {
    health,
    channelHealth,
    firedEvents,
    checks,
    overallStatus,
  };
}

export async function runVerifiedAdhanSystemTest(
  delayMs = 25000,
  pollTimeoutMs = delayMs + 15000,
): Promise<{ passed: boolean; event: NativeAdhanFiredEvent | null }> {
  if (Platform.OS !== 'android') {
    return { passed: false, event: null };
  }

  const before = await getNativeAdhanFiredEvents();
  const beforeLatest = before[0]?.actualFireAtMs ?? 0;
  await scheduleNativeSystemTestAlarm(delayMs);

  const deadline = Date.now() + pollTimeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const events = await getNativeAdhanFiredEvents();
    const match = events.find(
      (event) =>
        event.type === 'system_test' &&
        event.actualFireAtMs > beforeLatest &&
        event.actualFireAtMs >= Date.now() - pollTimeoutMs,
    );
    if (match) {
      return { passed: true, event: match };
    }
  }

  return { passed: false, event: null };
}

export function getHealthBannerMessage(issues: string[]): { title: string; body: string } {
  if (issues.includes('notification_denied')) {
    return {
      title: 'اعلان‌ها غیرفعال است',
      body: 'برای دریافت اذان، اجازه اعلان را در تنظیمات گوشی فعال کنید.',
    };
  }
  if (issues.includes('exact_alarm_missing')) {
    return {
      title: 'اذان دقیق غیرفعال است',
      body: 'برای پخش به‌موقع اذان، اجازه «زنگ هشدار و ساعت» را در تنظیمات اندروید فعال کنید.',
    };
  }
  if (issues.includes('no_alarms_scheduled')) {
    return {
      title: 'اذان زمان‌بندی نشده',
      body: 'برای بازیابی اذان، یک‌بار برنامه را باز کنید یا دکمه زیر را بزنید.',
    };
  }
  if (issues.includes('alarms_not_firing')) {
    return {
      title: 'اذان ممکن است نرسد',
      body: 'سیستم چند روز است اذان را اجرا نکرده. بررسی سلامت را باز کنید و «بازیابی» را بزنید.',
    };
  }
  if (issues.includes('channel_unhealthy')) {
    return {
      title: 'کانال اذان مشکل دارد',
      body: 'صدا یا اولویت کانال اذان در تنظیمات گوشی تغییر کرده است.',
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
