import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, NativeModules, Platform } from 'react-native';

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
import { tAdhanPermission, type AdhanPermissionLocale } from '@/utils/i18n/adhanPermissions';
import { isOemAutostartAcknowledged } from '@/utils/prayerOnboarding';

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
  | 'exact_alarm_degraded'
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
  shouldShowExactAlarmBanner: boolean;
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

/**
 * The Home card is intentionally a small readiness summary. On Android only
 * the OS gates that can prevent delivery altogether belong here; detailed
 * channel, autostart, schedule, and delivery diagnostics remain in Adhan
 * Health. The app master switch is shown as a non-critical warning when the
 * user has explicitly disabled Adhan.
 */
export function homeCardStatusFromReport(
  report: AdhanHealthReport | null,
): 'healthy' | 'warning' | 'critical' {
  if (!report) return 'warning';
  if (Platform.OS !== 'android') return report.overallStatus;

  const { health } = report;
  const sdkInt = typeof Platform.Version === 'number' ? Platform.Version : 0;
  if (!health.notificationsEnabled) return 'critical';
  if (sdkInt >= 31 && !health.canScheduleExactAlarms) return 'critical';
  if (!health.isIgnoringBatteryOptimizations || !health.masterEnabled) return 'warning';
  return 'healthy';
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
    maghribOffsetMinutes: 5,
    shouldShowBatteryNudge: false,
    shouldShowHealthBanner,
    shouldShowExactAlarmBanner: false,
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
      shouldShowExactAlarmBanner: false,
    };
  }

  const health = await getNativeAdhanHealth();
  const sdkInt = typeof Platform.Version === 'number' ? Platform.Version : 0;
  const shouldShowExactAlarmBanner =
    sdkInt >= 31 &&
    !health.canScheduleExactAlarms &&
    health.issues.includes('exact_alarm_missing');
  const shouldShowHealthBanner = false;
  const shouldShowBatteryNudge = await shouldPromptBatteryOptimization(health);

  return {
    ...health,
    shouldShowHealthBanner,
    shouldShowBatteryNudge,
    shouldShowExactAlarmBanner,
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

export async function checkCanScheduleExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const module = (NativeModules as {
    ExactAlarmModule?: { canScheduleExactAlarms?: () => Promise<boolean> };
  }).ExactAlarmModule;
  if (typeof module?.canScheduleExactAlarms === 'function') {
    return module.canScheduleExactAlarms();
  }
  return false;
}

export async function checkBatteryOptimizationExempt(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const module = (NativeModules as {
    ExactAlarmModule?: { isIgnoringBatteryOptimizations?: () => Promise<boolean> };
  }).ExactAlarmModule;
  if (typeof module?.isIgnoringBatteryOptimizations === 'function') {
    return module.isIgnoringBatteryOptimizations();
  }
  return true;
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

export async function openNotificationSettings(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const widgetModule = (NativeModules as {
      WidgetDataModule?: { openAppNotificationSettings?: () => Promise<boolean> };
    }).WidgetDataModule;

    try {
      return Boolean(await widgetModule?.openAppNotificationSettings?.());
    } catch {
      // Never throw — settings deep-link failures must not crash the app.
      return false;
    }
  }

  try {
    await Linking.openSettings();
    return true;
  } catch {
    // Never throw — settings deep-link failures must not crash the app.
    return false;
  }
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

function healthText(
  locale: AdhanPermissionLocale,
  dari: string,
  pashto: string,
  english?: string,
): string {
  if (locale === 'en') return english ?? dari;
  return locale === 'ps' ? pashto : dari;
}

function formatRelativeTime(timestampMs: number | null, locale: AdhanPermissionLocale = 'fa'): string {
  if (timestampMs == null) return healthText(locale, 'هنوز ثبت نشده', 'لا نه دی ثبت شوی', 'not recorded yet');
  const diffMs = Date.now() - timestampMs;
  if (diffMs < 60_000) return healthText(locale, 'همین الان', 'همدا اوس', 'just now');
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) {
    return healthText(locale, `${minutes} دقیقه پیش`, `${minutes} دقیقې مخکې`, `${minutes} min ago`);
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return healthText(locale, `${hours} ساعت پیش`, `${hours} ساعته مخکې`, `${hours} h ago`);
  }
  const days = Math.floor(hours / 24);
  return healthText(locale, `${days} روز پیش`, `${days} ورځې مخکې`, `${days} days ago`);
}

function formatClockTime(timestampMs: number | null, locale: AdhanPermissionLocale = 'fa'): string {
  if (timestampMs == null) return '—';
  const tag = locale === 'ps' ? 'ps-AF' : locale === 'en' ? 'en' : 'fa-AF';
  return new Date(timestampMs).toLocaleTimeString(tag, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function buildAdhanHealthReport(locale: AdhanPermissionLocale = 'fa'): Promise<AdhanHealthReport> {
  const health = await fetchAdhanHealth();
  const channelHealth = Platform.OS === 'android' ? await getNativeAdhanChannelHealth() : null;
  const firedEvents = Platform.OS === 'android' ? await getNativeAdhanFiredEvents() : [];
  const checks: AdhanHealthCheckItem[] = [];

  checks.push({
    id: 'notifications',
    title: tAdhanPermission('adhanPermissions.health.notifications', locale),
    body: health.notificationsEnabled
      ? healthText(locale, 'اعلان‌ها در سطح سیستم فعال است.', 'خبرتیاوې په سیسټم کې فعالې دي.', 'Notifications are enabled at the system level.')
      : healthText(locale, 'اعلان‌ها غیرفعال است؛ بدون آن اذان زمان‌بندی نمی‌شود.', 'خبرتیاوې بندې دي؛ له هغو پرته اذان نه شي مهالوېش کېدای.', 'Notifications are off; without them the adhan cannot be scheduled.'),
    status: health.notificationsEnabled ? 'pass' : 'fail',
    fixLabel: health.notificationsEnabled ? undefined : tAdhanPermission('adhanPermissions.health.fix', locale),
  });

  if (Platform.OS === 'android' && channelHealth) {
    const channelsOk = channelHealth.fajrHealthy && channelHealth.regularHealthy;
    checks.push({
      id: 'channels',
      title: healthText(locale, 'کانال‌های اذان', 'د اذان چینلونه', 'Adhan channels'),
      body: channelsOk
        ? healthText(locale, 'کانال‌های اذان با صدا و اولویت بالا فعال هستند.', 'د اذان چینلونه له غږ او لوړ لومړیتوب سره فعال دي.', 'Adhan channels are active with sound and high priority.')
        : healthText(locale, 'کانال اذان خاموش، بی‌صدا یا با اولویت پایین است.', 'د اذان چینل بند، بې‌غږه یا ټیټ لومړیتوب لري.', 'The adhan channel is off, silent, or set to low priority.'),
      status: channelsOk ? 'pass' : 'fail',
      fixLabel: channelsOk ? undefined : healthText(locale, 'تنظیم کانال‌ها', 'د چینلونو امستنې', 'Channel settings'),
    });
  }

  if (Platform.OS === 'android') {
    const sdkInt = typeof Platform.Version === 'number' ? Platform.Version : 0;
    const isDegraded = health.issues.includes('exact_alarm_degraded');
    if (health.canScheduleExactAlarms) {
      checks.push({
        id: 'exact_alarm',
        title: tAdhanPermission('adhanPermissions.health.exactAlarm', locale),
        body: healthText(locale, 'دستگاه اجازه زمان‌بندی دقیق اذان را دارد.', 'وسیله د اذان د دقیق مهالوېش اجازه لري.', 'This device allows exact adhan scheduling.'),
        status: 'pass',
      });
    } else if (isDegraded || (sdkInt >= 33 && health.scheduledAlarmCount > 0)) {
      checks.push({
        id: 'exact_alarm',
        title: tAdhanPermission('adhanPermissions.health.exactAlarm', locale),
        body: healthText(locale, 'اذان با تأخیر احتمالی زمان‌بندی شده؛ برای دقت کامل «زنگ دقیق» را فعال کنید.', 'اذان ښايي په ځنډ مهالوېش شوی وي؛ د کره وخت لپاره «دقیق زنګ» فعال کړئ.', 'The adhan may fire late; enable "exact alarms" for full accuracy.'),
        status: 'warn',
        fixLabel: tAdhanPermission('adhanPermissions.health.fix', locale),
      });
    } else {
      checks.push({
        id: 'exact_alarm',
        title: tAdhanPermission('adhanPermissions.health.exactAlarm', locale),
        body: healthText(locale, 'اجازه «زنگ‌ها و یادآوری‌ها» فعال نیست؛ اذان ممکن است دقیق نباشد.', 'د «الارمونو او یادونو» اجازه فعاله نه ده؛ د اذان وخت ښايي دقیق نه وي.', 'The "alarms and reminders" permission is off; adhan times may not be exact.'),
        status: 'fail',
        fixLabel: tAdhanPermission('adhanPermissions.health.fix', locale),
      });
    }
  }

  if (Platform.OS === 'android') {
    checks.push({
      id: 'battery',
      title: tAdhanPermission('adhanPermissions.health.battery', locale),
      body: health.isIgnoringBatteryOptimizations
        ? healthText(locale, 'محدودیت باتری برای عبادت اعمال نشده است.', 'په عبادت اپ د بیټرۍ محدودیت نشته.', 'No battery restriction is applied to Ebadat.')
        : healthText(locale, 'بهینه‌سازی باتری ممکن است اذان را متوقف کند.', 'د بیټرۍ سپما ښايي اذان ودروي.', 'Battery optimization may stop the adhan.'),
      status: health.isIgnoringBatteryOptimizations ? 'pass' : 'warn',
      fixLabel: health.isIgnoringBatteryOptimizations ? undefined : tAdhanPermission('adhanPermissions.health.fix', locale),
    });

    const autostartAck = await isOemAutostartAcknowledged();
    const needsAutostart = isAggressiveOem(health.manufacturer) && !autostartAck;
    if (isAggressiveOem(health.manufacturer)) {
      checks.push({
        id: 'autostart',
        title: tAdhanPermission('adhanPermissions.health.autostart', locale),
        body: autostartAck
          ? healthText(locale, 'راهنمای شروع خودکار بررسی شد.', 'د اتومات پیل لارښود وکتل شو.', 'The autostart guide has been reviewed.')
          : healthText(locale, 'گوشی شما ممکن است اجرای پس‌زمینه را محدود کند.', 'ستاسو موبایل ښايي په شالید کې چلول محدود کړي.', 'Your phone may restrict background execution.'),
        status: needsAutostart ? 'warn' : 'pass',
        fixLabel: needsAutostart ? tAdhanPermission('adhanPermissions.health.fix', locale) : undefined,
      });
    }
  }

  checks.push({
    id: 'config',
    title: healthText(locale, 'تنظیمات اذان', 'د اذان امستنې', 'Adhan settings'),
    body: health.configPresent && health.masterEnabled
      ? healthText(locale, 'اذان در برنامه فعال است.', 'اذان په اپ کې فعال دی.', 'The adhan is enabled in the app.')
      : health.configPresent
        ? healthText(locale, 'اذان در برنامه غیرفعال است.', 'اذان په اپ کې بند دی.', 'The adhan is disabled in the app.')
        : healthText(locale, 'تنظیمات اذان هنوز همگام نشده؛ شهر را انتخاب کنید.', 'د اذان امستنې لا همغږې شوې نه دي؛ ښار وټاکئ.', 'Adhan settings are not synced yet; choose your city.'),
    status: health.configPresent && health.masterEnabled ? 'pass' : health.configPresent ? 'info' : 'fail',
  });

  if (Platform.OS === 'android' && health.masterEnabled) {
    const alarmsOk = health.scheduledAlarmCount > 0;
    checks.push({
      id: 'scheduled',
      title: healthText(locale, 'اذان‌های زمان‌بندی‌شده', 'مهالوېش شوي اذانونه', 'Scheduled adhans'),
      body: alarmsOk
        ? healthText(
            locale,
            `${health.scheduledAlarmCount} اذان آینده ثبت شده${health.nextAlarmAtMs ? `؛ بعدی ساعت ${formatClockTime(health.nextAlarmAtMs, locale)}` : ''}.`,
            `${health.scheduledAlarmCount} راتلونکي اذانونه ثبت شوي${health.nextAlarmAtMs ? `؛ بل یې په ${formatClockTime(health.nextAlarmAtMs, locale)}` : ''}.`,
            `${health.scheduledAlarmCount} upcoming adhans registered${health.nextAlarmAtMs ? `; next at ${formatClockTime(health.nextAlarmAtMs, locale)}` : ''}.`,
          )
        : healthText(locale, 'هیچ اذانی زمان‌بندی نشده است.', 'هېڅ اذان نه دی مهالوېش شوی.', 'No adhan is scheduled.'),
      status: alarmsOk ? 'pass' : 'fail',
      fixLabel: alarmsOk ? undefined : healthText(locale, 'بازیابی', 'بیا رغول', 'Repair'),
    });
  }

  checks.push({
    id: 'maghrib_policy',
    title: healthText(locale, 'تأخیر نماز شام', 'د ماښام لمانځه ځنډ', 'Maghrib delay'),
    body: health.maghribOffsetMinutes === 5
      ? healthText(locale, 'اذان شام در همهٔ موقعیت‌ها دقیقاً ۵ دقیقه پس از وقت محاسبه‌شده زمان‌بندی می‌شود.', 'د ماښام اذان په ټولو ځایونو کې د حساب شوي وخت څخه دقیقې ۵ دقیقې وروسته مهالوېش کېږي.', 'The Maghrib adhan is scheduled exactly 5 minutes after the calculated time everywhere.')
      : healthText(locale, 'سیاست تأخیر ۵ دقیقه‌ای نماز شام فعال نیست؛ زمان‌بندی را بازیابی کنید.', 'د ماښام لمانځه د ۵ دقیقو ځنډ تګلاره فعاله نه ده؛ مهالوېش بیا جوړ کړئ.', 'The 5-minute Maghrib delay is not applied; repair the schedule.'),
    status: health.maghribOffsetMinutes === 5 ? 'pass' : 'fail',
    fixLabel: health.maghribOffsetMinutes === 5 ? undefined : healthText(locale, 'بازیابی', 'بیا رغول', 'Repair'),
  });

  if (Platform.OS === 'android' && health.masterEnabled) {
    const lastAdhan = firedEvents.find((event) => event.type === 'adhan' || event.type === 'system_test');
    const maintenanceStale = health.issues.includes('alarms_not_firing');
    checks.push({
      id: 'delivery',
      title: healthText(locale, 'تحویل واقعی اذان', 'د اذان واقعي رسېدل', 'Actual adhan delivery'),
      body: maintenanceStale
        ? healthText(locale, 'سیستم بیش از ۲۶ ساعت هیچ نگهداری/اذانی اجرا نکرده؛ ممکن است زنگ‌ها واقعاً نرسند.', 'سیسټم له ۲۶ ساعتونو ډېر هېڅ ساتنه یا اذان نه دی اجرا کړی؛ ښايي زنګونه ونه رسېږي.', 'The system has run no maintenance or adhan for over 26 hours; alarms may not actually arrive.')
        : lastAdhan
          ? healthText(
              locale,
              `آخرین اجرا ${formatRelativeTime(lastAdhan.actualFireAtMs, locale)}${lastAdhan.delaySeconds > 0 ? ` (تأخیر ${lastAdhan.delaySeconds} ثانیه)` : ''}.`,
              `وروستی اجرا ${formatRelativeTime(lastAdhan.actualFireAtMs, locale)}${lastAdhan.delaySeconds > 0 ? ` (ځنډ ${lastAdhan.delaySeconds} ثانیې)` : ''}.`,
              `Last fired ${formatRelativeTime(lastAdhan.actualFireAtMs, locale)}${lastAdhan.delaySeconds > 0 ? ` (${lastAdhan.delaySeconds}s late)` : ''}.`,
            )
          : health.lastMaintenanceFiredAtMs
            ? healthText(locale, `نگهداری سیستم ${formatRelativeTime(health.lastMaintenanceFiredAtMs, locale)} اجرا شد؛ هنوز اذانی ثبت نشده.`, `د سیسټم ساتنه ${formatRelativeTime(health.lastMaintenanceFiredAtMs, locale)} اجرا شوه؛ لا اذان نه دی ثبت شوی.`, `System maintenance ran ${formatRelativeTime(health.lastMaintenanceFiredAtMs, locale)}; no adhan recorded yet.`)
            : healthText(locale, 'هنوز اذانی اجرا نشده؛ تست زنده را امتحان کنید.', 'تر اوسه اذان نه دی اجرا شوی؛ ژوندۍ ازموینه وکړئ.', 'No adhan has fired yet; try the live test.'),
      status: maintenanceStale ? 'fail' : lastAdhan ? 'pass' : 'info',
      fixLabel: maintenanceStale || !lastAdhan ? healthText(locale, 'تست زنده', 'ژوندۍ ازموینه', 'Live test') : undefined,
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

export function getHealthBannerMessage(
  issues: string[],
  locale: AdhanPermissionLocale = 'fa',
): { title: string; body: string } {
  if (issues.includes('notification_denied')) {
    return {
      title: healthText(locale, 'اعلان‌ها غیرفعال است', 'خبرتیاوې بندې دي', 'Notifications are off'),
      body: healthText(
        locale,
        'برای دریافت اذان، اجازه اعلان را در تنظیمات گوشی فعال کنید.',
        'د اذان د اورېدو لپاره د خبرتیا اجازه په امستنو کې فعاله کړئ.',
        'To receive the adhan, allow notifications in your phone settings.',
      ),
    };
  }
  if (issues.includes('exact_alarm_missing')) {
    return {
      title: healthText(locale, 'اذان دقیق غیرفعال است', 'دقیق اذان بند دی', 'Exact adhan is off'),
      body: healthText(
        locale,
        'برای پخش به‌موقع اذان، اجازه «زنگ هشدار و ساعت» را در تنظیمات اندروید فعال کنید.',
        'د اذان د پر وخت غږولو لپاره د «الارم او ساعت» اجازه په اندروید امستنو کې فعاله کړئ.',
        'To play the adhan on time, allow "alarms and reminders" in Android settings.',
      ),
    };
  }
  if (issues.includes('no_alarms_scheduled')) {
    return {
      title: healthText(locale, 'اذان زمان‌بندی نشده', 'اذان مهالوېش شوی نه دی', 'Adhan is not scheduled'),
      body: healthText(
        locale,
        'برای بازیابی اذان، یک‌بار برنامه را باز کنید یا دکمه زیر را بزنید.',
        'د اذان د بیا رغولو لپاره یو ځل اپ پرانیزئ یا لاندې تڼۍ کېکاږئ.',
        'Open the app once or tap the button below to restore the adhan.',
      ),
    };
  }
  if (issues.includes('alarms_not_firing')) {
    return {
      title: healthText(locale, 'اذان ممکن است نرسد', 'اذان ښايي ونه رسېږي', 'The adhan may not arrive'),
      body: healthText(
        locale,
        'سیستم چند روز است اذان را اجرا نکرده. بررسی سلامت را باز کنید و «بازیابی» را بزنید.',
        'سیسټم څو ورځې کیږي اذان نه دی اجرا کړی. روغتیا وګورئ او «بیا رغول» کېکاږئ.',
        'The system has not fired the adhan for days. Open the health check and tap "Repair".',
      ),
    };
  }
  if (issues.includes('channel_unhealthy')) {
    return {
      title: healthText(locale, 'کانال اذان مشکل دارد', 'د اذان چینل ستونزه لري', 'The adhan channel has a problem'),
      body: healthText(
        locale,
        'صدا یا اولویت کانال اذان در تنظیمات گوشی تغییر کرده است.',
        'د اذان د چینل غږ یا لومړیتوب په امستنو کې بدل شوی دی.',
        'The adhan channel sound or priority was changed in phone settings.',
      ),
    };
  }
  if (issues.includes('config_missing')) {
    return {
      title: healthText(locale, 'تنظیمات اذان ناقص است', 'د اذان امستنې بشپړې نه دي', 'Adhan settings are incomplete'),
      body: healthText(
        locale,
        'شهر خود را انتخاب کنید تا اذان به‌درستی فعال شود.',
        'خپل ښار وټاکئ څو اذان سم فعال شي.',
        'Choose your city so the adhan works correctly.',
      ),
    };
  }
  return {
    title: healthText(locale, 'مشکل در اذان', 'د اذان ستونزه', 'Adhan problem'),
    body: healthText(
      locale,
      'برای رفع مشکل، تنظیمات را بررسی کنید.',
      'د ستونزې د حل لپاره امستنې وګورئ.',
      'Check your settings to resolve the problem.',
    ),
  };
}
