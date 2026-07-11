import { Platform } from 'react-native';

import type { NativeAdhanHealth } from '@/utils/nativeAdhanScheduler';

export function isAndroidScheduleHealthPlatform(): boolean {
  return Platform.OS === 'android';
}

export function evaluateAndroidActivationReschedule(params: {
  health: NativeAdhanHealth;
  enabledPrayerCount: number;
}): { shouldReschedule: boolean; reason: string } {
  const { health, enabledPrayerCount } = params;

  if (!health.configPresent) {
    return { shouldReschedule: false, reason: 'android-no-config' };
  }

  if (!health.masterEnabled) {
    return { shouldReschedule: false, reason: 'android-master-off' };
  }

  if (health.issues.includes('no_alarms_scheduled')) {
    return { shouldReschedule: true, reason: 'android-no-alarms' };
  }

  if (health.issues.includes('alarms_not_firing')) {
    return { shouldReschedule: true, reason: 'android-alarms-not-firing' };
  }

  if (health.issues.includes('channel_unhealthy')) {
    return { shouldReschedule: true, reason: 'android-channel-unhealthy' };
  }

  if (health.issues.includes('exact_alarm_missing')) {
    return { shouldReschedule: true, reason: 'android-exact-missing' };
  }

  if (health.issues.includes('config_missing')) {
    return { shouldReschedule: true, reason: 'android-config-missing' };
  }

  const minExpected = enabledPrayerCount > 0 ? Math.min(enabledPrayerCount, 5) : 0;
  if (minExpected > 0 && health.scheduledAlarmCount < minExpected) {
    return { shouldReschedule: true, reason: 'android-pending-low' };
  }

  return { shouldReschedule: false, reason: 'android-healthy' };
}

export function shouldRescheduleFromSettingsHealth(
  health: NativeAdhanHealth,
  enabledPrayerCount: number,
): boolean {
  if (
    health.issues.some((issue) =>
      ['no_alarms_scheduled', 'exact_alarm_missing', 'config_missing', 'alarms_not_firing', 'channel_unhealthy'].includes(
        issue,
      ),
    )
  ) {
    return true;
  }

  if (!health.masterEnabled || !health.configPresent) {
    return false;
  }

  const minExpected = enabledPrayerCount > 0 ? Math.min(enabledPrayerCount, 5) : 0;
  return minExpected > 0 && health.scheduledAlarmCount < minExpected;
}
