import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, NativeModules, Platform } from 'react-native';

export const FIRST_OPEN_ADHAN_ONBOARDING_KEY = '@ebadat/adhan_first_open_guided_setup_done_v3';
export const SELECTED_CITY_STORAGE_KEY = 'selected_city';
const PRAYER_SETTINGS_STORAGE_KEY = '@ebadat/prayer_settings';

interface FirstOpenPrayerOnboardingOptions {
  onAfterSetup?: () => Promise<void> | void;
}

export async function isFirstOpenAdhanSetupDone(): Promise<boolean> {
  return (await AsyncStorage.getItem(FIRST_OPEN_ADHAN_ONBOARDING_KEY)) === '1';
}

export async function markFirstOpenAdhanSetupDone(): Promise<void> {
  await AsyncStorage.setItem(FIRST_OPEN_ADHAN_ONBOARDING_KEY, '1');
}

export async function getSavedPrayerCityKey(): Promise<string | null> {
  const selectedCity = await AsyncStorage.getItem(SELECTED_CITY_STORAGE_KEY);
  if (selectedCity) return selectedCity;

  const settingsRaw = await AsyncStorage.getItem(PRAYER_SETTINGS_STORAGE_KEY);
  if (!settingsRaw) return null;

  try {
    const settings = JSON.parse(settingsRaw) as { selectedCity?: unknown };
    return typeof settings.selectedCity === 'string' && settings.selectedCity.trim()
      ? settings.selectedCity
      : null;
  } catch {
    return null;
  }
}

export async function runFirstOpenPrayerOnboarding(
  options: FirstOpenPrayerOnboardingOptions = {}
): Promise<void> {
  if (Platform.OS === 'web') return;

  const alreadyDone = await AsyncStorage.getItem(FIRST_OPEN_ADHAN_ONBOARDING_KEY);
  if (alreadyDone === '1') return;

  let notificationsGranted = false;
  try {
    const Notifications = await import('expo-notifications');
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') {
      notificationsGranted = true;
    } else {
      const requested = await Notifications.requestPermissionsAsync();
      notificationsGranted = requested.status === 'granted';
    }
  } catch {
    notificationsGranted = false;
  }

  await AsyncStorage.setItem(FIRST_OPEN_ADHAN_ONBOARDING_KEY, '1');

  if (Platform.OS === 'android') {
    const exactModule = (NativeModules as {
      ExactAlarmModule?: { openExactAlarmSettings?: () => Promise<boolean> };
    }).ExactAlarmModule;

    Alert.alert(
      'تنظیم سریع اذان',
      notificationsGranted
        ? 'اذان در حالت عادی فعال شد. برای پخش دقیق در همان ثانیه، دسترسی «ساعت و یادآوری» را هم فعال کنید.'
        : 'برای دریافت اذان، لطفاً اجازه اعلان را فعال کنید. سپس برای دقت بیشتر، دسترسی «ساعت و یادآوری» را نیز روشن کنید.',
      [
        { text: 'بعداً' },
        {
          text: 'فعال‌سازی دقت بالا',
          onPress: async () => {
            try {
              if (typeof exactModule?.openExactAlarmSettings === 'function') {
                const opened = await exactModule.openExactAlarmSettings();
                if (opened) return;
              }
              await Linking.openSettings();
            } catch {
              await Linking.openSettings();
            }
          },
        },
      ]
    );
  }

  if (options.onAfterSetup) {
    await options.onAfterSetup();
  }
}
