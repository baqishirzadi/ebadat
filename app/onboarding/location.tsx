import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { CitySelectorModal } from '@/components/prayer/CitySelectorModal';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { CityKey, getCity } from '@/utils/cities';
import { detectLocationAndFindCity } from '@/utils/gpsLocation';
import {
  markFirstOpenAdhanSetupDone,
  SELECTED_CITY_STORAGE_KEY,
  shouldShowNotificationOnboardingStep,
} from '@/utils/prayerOnboarding';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUICK_CITIES: CityKey[] = [
  'afghanistan_kabul',
  'afghanistan_herat',
  'afghanistan_mazar',
  'afghanistan_kandahar',
];

export default function OnboardingLocationScreen() {
  const { theme } = useApp();
  const { setCustomLocation, requestPrayerSchedule } = usePrayer();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const finalizeCity = useCallback(
    async (cityKey: CityKey) => {
      const city = getCity(cityKey);
      if (!city) {
        Alert.alert('خطا', 'شهر انتخاب‌شده پیدا نشد.');
        return;
      }

      setBusy(true);
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

        const showNotifications = await shouldShowNotificationOnboardingStep();
        if (showNotifications) {
          router.push('/onboarding/notifications' as never);
        } else if (Platform.OS === 'android') {
          router.push('/onboarding/battery' as never);
        } else {
          router.replace('/(tabs)');
          requestPrayerSchedule('onboarding-complete').catch(() => {});
        }
      } catch {
        Alert.alert('خطا', 'تنظیم شهر انجام نشد. لطفاً دوباره تلاش کنید.');
      } finally {
        setBusy(false);
      }
    },
    [requestPrayerSchedule, setCustomLocation],
  );

  const handleGps = async () => {
    setBusy(true);
    try {
      const result = await detectLocationAndFindCity();
      if (result.success && result.cityKey) {
        await finalizeCity(result.cityKey as CityKey);
        return;
      }
      Alert.alert('موقعیت پیدا نشد', result.error || 'لطفاً شهر را دستی انتخاب کنید.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      step={3}
      totalSteps={5}
      title="انتخاب شهر"
      subtitle="برای محاسبه دقیق اوقات نماز و اذان، شهر خود را انتخاب کنید."
      primaryLabel="انتخاب از فهرست شهرها"
      onPrimary={() => setPickerVisible(true)}
      primaryDisabled={busy}
      secondaryLabel="تشخیص موقعیت من"
      onSecondary={() => handleGps()}
      showBack
      onBack={() => router.back()}
    >
      {busy ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>در حال آماده‌سازی...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.quickList}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>شهرهای پرکاربرد</Text>
          {QUICK_CITIES.map((cityKey) => {
            const city = getCity(cityKey);
            if (!city) return null;
            return (
              <Pressable
                key={cityKey}
                onPress={() => finalizeCity(cityKey)}
                style={[styles.cityChip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              >
                <Text style={[styles.cityName, { color: theme.text }]}>{city.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <CitySelectorModal
        visible={pickerVisible}
        selectedCity={null}
        onClose={() => setPickerVisible(false)}
        onSelectCity={(key) => {
          setPickerVisible(false);
          finalizeCity(key as CityKey);
        }}
        title="شهر خود را انتخاب کنید"
      />
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  quickList: {
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: Spacing.xs,
  },
  cityChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  cityName: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
