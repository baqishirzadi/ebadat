import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

import { isAggressiveOem } from '@/utils/adhanHealth';

const FIRST_OPEN_SETUP_DONE_KEY = '@ebadat/adhan_first_open_guided_setup_done_v3';
const PERMISSION_ONBOARDING_V4_PROGRESS_KEY = '@ebadat/permission_onboarding_v4_progress';
const OEM_AUTOSTART_ACK_KEY = '@ebadat/oem_autostart_ack';

export const SELECTED_CITY_STORAGE_KEY = 'selected_city';

export type PermissionOnboardingStep =
  | 'language'
  | 'location'
  | 'notifications'
  | 'exact-alarms'
  | 'battery'
  | 'autostart'
  | 'complete';

const ANDROID_PERMISSION_STEPS: PermissionOnboardingStep[] = [
  'notifications',
  'exact-alarms',
  'battery',
  'autostart',
];

export async function isFirstOpenAdhanSetupDone(): Promise<boolean> {
  const value = await AsyncStorage.getItem(FIRST_OPEN_SETUP_DONE_KEY);
  return value === '1';
}

export async function markFirstOpenAdhanSetupDone(): Promise<void> {
  await AsyncStorage.setItem(FIRST_OPEN_SETUP_DONE_KEY, '1');
  await setPermissionOnboardingProgress('complete');
}

export async function getSavedPrayerCityKey(): Promise<string | null> {
  const value = await AsyncStorage.getItem(SELECTED_CITY_STORAGE_KEY);
  return value?.trim() || null;
}

export async function getPermissionOnboardingProgress(): Promise<PermissionOnboardingStep | null> {
  const value = await AsyncStorage.getItem(PERMISSION_ONBOARDING_V4_PROGRESS_KEY);
  if (!value) return null;
  return value as PermissionOnboardingStep;
}

export async function setPermissionOnboardingProgress(step: PermissionOnboardingStep): Promise<void> {
  await AsyncStorage.setItem(PERMISSION_ONBOARDING_V4_PROGRESS_KEY, step);
}

export async function runPermissionOnboardingGrandfatherMigration(): Promise<void> {
  const setupDone = await isFirstOpenAdhanSetupDone();
  if (!setupDone) return;
  const progress = await getPermissionOnboardingProgress();
  if (progress !== 'complete') {
    await setPermissionOnboardingProgress('complete');
  }
}

export async function getDeviceManufacturer(): Promise<string> {
  if (Platform.OS !== 'android') return '';
  try {
    const module = (NativeModules as {
      ExactAlarmModule?: { getExactAlarmDebugState?: () => Promise<{ manufacturer?: string }> };
    }).ExactAlarmModule;
    if (typeof module?.getExactAlarmDebugState === 'function') {
      const state = await module.getExactAlarmDebugState();
      return String(state?.manufacturer || '');
    }
  } catch {
    // ignore
  }
  return '';
}

export async function shouldShowAutostartOnboardingStep(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const manufacturer = await getDeviceManufacturer();
  return isAggressiveOem(manufacturer);
}

export async function getAndroidPermissionStepCount(): Promise<number> {
  const showAutostart = await shouldShowAutostartOnboardingStep();
  return showAutostart ? 4 : 3;
}

export async function getOnboardingResumeRoute(): Promise<string> {
  const progress = await getPermissionOnboardingProgress();
  if (!progress || progress === 'language' || progress === 'location') {
    return '/onboarding/notifications';
  }
  if (progress === 'complete') {
    return '/(tabs)';
  }
  return `/onboarding/${progress}`;
}

export async function getNextPermissionStep(
  current: PermissionOnboardingStep,
): Promise<PermissionOnboardingStep | 'complete'> {
  if (Platform.OS !== 'android') {
    return current === 'notifications' ? 'complete' : 'notifications';
  }

  if (current === 'notifications') {
    return Number(Platform.Version) >= 31 ? 'exact-alarms' : 'battery';
  }
  if (current === 'exact-alarms') {
    return 'battery';
  }
  if (current === 'battery') {
    const showAutostart = await shouldShowAutostartOnboardingStep();
    return showAutostart ? 'autostart' : 'complete';
  }
  if (current === 'autostart') {
    return 'complete';
  }
  return 'complete';
}

export function isAndroidPermissionStep(step: PermissionOnboardingStep): boolean {
  return ANDROID_PERMISSION_STEPS.includes(step);
}

export async function isOemAutostartAcknowledged(): Promise<boolean> {
  const value = await AsyncStorage.getItem(OEM_AUTOSTART_ACK_KEY);
  return value === '1';
}

export async function markOemAutostartAcknowledged(): Promise<void> {
  await AsyncStorage.setItem(OEM_AUTOSTART_ACK_KEY, '1');
}

export type NotificationPermissionResult = 'granted' | 'denied' | 'blocked' | 'skipped';

export async function requestAdhanNotificationPermission(): Promise<NotificationPermissionResult> {
  if (Platform.OS === 'web') return 'skipped';

  try {
    const Notifications = await import('expo-notifications');
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return 'granted';
    if (current.status === 'denied' && !current.canAskAgain) return 'blocked';

    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    if (requested.status === 'granted') return 'granted';
    if (requested.status === 'denied' && !requested.canAskAgain) return 'blocked';
    return 'denied';
  } catch {
    return 'skipped';
  }
}

export async function shouldShowNotificationOnboardingStep(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return Number(Platform.Version) >= 33;
  }

  if (Platform.OS === 'ios') {
    try {
      const Notifications = await import('expo-notifications');
      const current = await Notifications.getPermissionsAsync();
      return current.status === 'undetermined';
    } catch {
      return true;
    }
  }

  return false;
}
