import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCity } from '@/utils/cities';
import { AFGHAN_CITIES } from '@/utils/prayerTimes';
import { Alert, Linking, NativeModules, Platform } from 'react-native';

const ONBOARDING_KEY = '@ebadat/adhan_first_open_guided_setup_done_v1';
const PRAYER_SETTINGS_KEY = '@ebadat/prayer_settings';
const SELECTED_CITY_KEY = 'selected_city';

interface FirstOpenPrayerOnboardingOptions {
  onAfterSetup?: () => Promise<void> | void;
}

function normalizeStoredCityKey(selectedCity: string | null): string | null {
  if (!selectedCity) return null;
  if (selectedCity.startsWith('afghanistan_')) {
    return getCity(selectedCity) ? selectedCity : null;
  }
  if (AFGHAN_CITIES[selectedCity]) {
    return `afghanistan_${selectedCity}`;
  }
  return getCity(selectedCity) ? selectedCity : null;
}

export async function hasResolvedPrayerCitySelection(): Promise<boolean> {
  try {
    const [settingsJson, globallySelectedCity] = await Promise.all([
      AsyncStorage.getItem(PRAYER_SETTINGS_KEY),
      AsyncStorage.getItem(SELECTED_CITY_KEY),
    ]);

    const settings = settingsJson ? JSON.parse(settingsJson) : null;
    const fromSettings = normalizeStoredCityKey(settings?.selectedCity || null);
    const fromGlobal = normalizeStoredCityKey(globallySelectedCity);

    return Boolean(fromSettings || fromGlobal);
  } catch {
    return false;
  }
}

export async function runFirstOpenPrayerOnboarding(
  options: FirstOpenPrayerOnboardingOptions = {}
): Promise<void> {
  if (Platform.OS === 'web') return;

  const alreadyDone = await AsyncStorage.getItem(ONBOARDING_KEY);
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

  await AsyncStorage.setItem(ONBOARDING_KEY, '1');

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
