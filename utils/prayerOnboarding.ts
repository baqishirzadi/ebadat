import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, NativeModules, Platform } from 'react-native';

const ONBOARDING_KEY = '@ebadat/adhan_first_open_guided_setup_done_v1';

interface FirstOpenPrayerOnboardingOptions {
  onAfterSetup?: () => Promise<void> | void;
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
