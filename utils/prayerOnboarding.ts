import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const FIRST_OPEN_SETUP_DONE_KEY = '@ebadat/adhan_first_open_guided_setup_done_v3';
export const SELECTED_CITY_STORAGE_KEY = 'selected_city';

export async function isFirstOpenAdhanSetupDone(): Promise<boolean> {
  const value = await AsyncStorage.getItem(FIRST_OPEN_SETUP_DONE_KEY);
  return value === '1';
}

export async function markFirstOpenAdhanSetupDone(): Promise<void> {
  await AsyncStorage.setItem(FIRST_OPEN_SETUP_DONE_KEY, '1');
}

export async function getSavedPrayerCityKey(): Promise<string | null> {
  const value = await AsyncStorage.getItem(SELECTED_CITY_STORAGE_KEY);
  return value?.trim() || null;
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
