import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  InteractionManager,
  Linking,
} from 'react-native';

import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { useStartupPhase } from '@/context/StartupPhaseContext';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { CitySelectorModal } from '@/components/prayer/CitySelectorModal';
import { CityKey, getCity } from '@/utils/cities';
import { detectLocationAndFindCity } from '@/utils/gpsLocation';
import { ensurePushRegistrationOnFirstOpen } from '@/utils/pushRegistry';
import {
  getSavedPrayerCityKey,
  isFirstOpenAdhanSetupDone,
  markFirstOpenAdhanSetupDone,
  SELECTED_CITY_STORAGE_KEY,
} from '@/utils/prayerOnboarding';

const DEFAULT_CITY_KEY: CityKey = 'afghanistan_kabul';

function resolveCity(cityKey: string) {
  return getCity(cityKey) ?? getCity(DEFAULT_CITY_KEY);
}

export function FirstOpenAdhanSetup() {
  const { theme } = useApp();
  const { isInteractiveReady } = useStartupPhase();
  const {
    state,
    setCustomLocation,
    refreshPrayerTimes,
    requestPrayerSchedule,
  } = usePrayer();
  const [visible, setVisible] = useState(false);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [shouldRedirectHome, setShouldRedirectHome] = useState(false);

  const currentSelectedCity = state.settings.selectedCity;

  const navigateToTabs = useCallback(() => {
    try {
      router.dismissAll();
    } catch {
      // The stack may already be at root.
    }
    router.replace('/');
    Linking.openURL('ebadat://').catch(() => {});
  }, []);

  useEffect(() => {
    if (!shouldRedirectHome) return;

    navigateToTabs();
    const interval = setInterval(navigateToTabs, 250);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setShouldRedirectHome(false);
    }, 2200);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [navigateToTabs, shouldRedirectHome]);

  useEffect(() => {
    if (!isInteractiveReady || Platform.OS === 'web') return;

    let cancelled = false;
    const run = async () => {
      const [done, savedCity] = await Promise.all([
        isFirstOpenAdhanSetupDone(),
        getSavedPrayerCityKey(),
      ]);

      if (cancelled) return;

      if (savedCity || currentSelectedCity) {
        if (!done) {
          await markFirstOpenAdhanSetupDone();
          requestPrayerSchedule('first-open-existing-city').catch(() => {});
        }
        ensurePushRegistrationOnFirstOpen().catch(() => {});
        return;
      }

      setVisible(true);
    };

    run().catch((error) => {
      if (__DEV__) {
        console.log('[FirstOpenAdhanSetup] Startup check failed:', error);
      }
      if (!cancelled) {
        setVisible(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentSelectedCity, isInteractiveReady, requestPrayerSchedule]);

  const completeWithCity = useCallback(
    async (cityKey: CityKey) => {
      const city = resolveCity(cityKey);
      if (!city) {
        Alert.alert('خطا', 'شهر انتخاب‌شده پیدا نشد.');
        return;
      }

      setIsBusy(true);
      setStatusText('در حال آماده‌سازی اذان...');

      try {
        await AsyncStorage.setItem(SELECTED_CITY_STORAGE_KEY, city.key);
        await setCustomLocation(
          {
            latitude: city.lat,
            longitude: city.lon,
            altitude: city.altitude || 0,
            timezone: city.timezone,
          },
          city.name,
          city.key,
        );
        await markFirstOpenAdhanSetupDone();

        setVisible(false);
        setCityPickerVisible(false);
        setShouldRedirectHome(true);
        setTimeout(() => {
          navigateToTabs();
        }, 0);
        InteractionManager.runAfterInteractions(() => {
          navigateToTabs();
        });
        refreshPrayerTimes();

        setTimeout(() => {
          requestPrayerSchedule('first-open-city-selected')
            .then(() => ensurePushRegistrationOnFirstOpen())
            .catch((error) => {
              if (__DEV__) {
                console.log('[FirstOpenAdhanSetup] Schedule after city selection failed:', error);
              }
            });
        }, 1200);
      } catch (error) {
        if (__DEV__) {
          console.log('[FirstOpenAdhanSetup] City setup failed:', error);
        }
        Alert.alert('خطا', 'تنظیم شهر انجام نشد. لطفاً دوباره تلاش کنید.');
      } finally {
        setIsBusy(false);
        setStatusText('');
      }
    },
    [navigateToTabs, refreshPrayerTimes, requestPrayerSchedule, setCustomLocation],
  );

  const handleDetectLocation = useCallback(async () => {
    setIsBusy(true);
    setStatusText('در حال تشخیص موقعیت...');
    try {
      const result = await detectLocationAndFindCity();
      if (result.success && result.cityKey) {
        await completeWithCity(result.cityKey as CityKey);
        return;
      }
      Alert.alert('موقعیت پیدا نشد', result.error || 'لطفاً شهر را دستی انتخاب کنید.');
    } catch {
      Alert.alert('موقعیت پیدا نشد', 'لطفاً شهر را دستی انتخاب کنید.');
    } finally {
      setIsBusy(false);
      setStatusText('');
    }
  }, [completeWithCity]);

  const actions = useMemo(
    () => [
      {
        testID: 'first-open-use-kabul',
        icon: 'location-city',
        title: 'کابل را انتخاب کن',
        subtitle: 'انتخاب سریع برای افغانستان',
        onPress: () => completeWithCity(DEFAULT_CITY_KEY),
      },
      {
        testID: 'first-open-select-city',
        icon: 'travel-explore',
        title: 'انتخاب شهر',
        subtitle: 'افغانستان، اروپا، آمریکا و شهرهای دیگر',
        onPress: () => setCityPickerVisible(true),
      },
      {
        testID: 'first-open-detect-location',
        icon: 'my-location',
        title: 'تشخیص موقعیت',
        subtitle: 'پیدا کردن نزدیک‌ترین شهر با GPS',
        onPress: handleDetectLocation,
      },
    ],
    [completeWithCity, handleDetectLocation],
  );

  return (
    <>
      <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
        <View
          testID="first-open-adhan-setup"
          style={[styles.container, { backgroundColor: theme.background }]}
        >
          <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
            <View style={styles.headerIcon}>
              <MaterialIcons name="notifications-active" size={34} color="#D4AF37" />
            </View>
            <Text style={styles.title}>تنظیم اذان</Text>
            <Text style={styles.subtitle}>
              برای اینکه اعلان اذان دقیق و مطابق شهر شما فعال شود، اول شهر را انتخاب کنید.
            </Text>
          </View>

          <View style={styles.content}>
            {actions.map((action) => (
              <Pressable
                key={action.testID}
                testID={action.testID}
                disabled={isBusy}
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.actionCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.cardBorder,
                    opacity: isBusy ? 0.65 : 1,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.actionIcon, { backgroundColor: theme.backgroundSecondary }]}>
                  <MaterialIcons name={action.icon as any} size={24} color={theme.tint} />
                </View>
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>{action.title}</Text>
                  <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
                    {action.subtitle}
                  </Text>
                </View>
                <MaterialIcons name="chevron-left" size={24} color={theme.icon} />
              </Pressable>
            ))}

            {isBusy && (
              <View testID="first-open-setup-progress" style={styles.busyRow}>
                <ActivityIndicator size="small" color={theme.tint} />
                <Text style={[styles.busyText, { color: theme.textSecondary }]}>
                  {statusText || 'در حال آماده‌سازی...'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <CitySelectorModal
        visible={cityPickerVisible}
        selectedCity={(currentSelectedCity as CityKey | null) ?? null}
        allowClose={false}
        title="شهر اذان را انتخاب کنید"
        testID="first-open-city-selector"
        onSelectCity={(cityKey) => {
          completeWithCity(cityKey).catch(() => {});
        }}
        onClose={() => setCityPickerVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 76,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(212,175,55,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.display,
    color: '#fff',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  subtitle: {
    marginTop: Spacing.sm,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    lineHeight: 26,
    color: 'rgba(255,255,255,0.84)',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  actionCard: {
    minHeight: 86,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  actionSubtitle: {
    marginTop: 4,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 21,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  busyRow: {
    minHeight: 44,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  busyText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
