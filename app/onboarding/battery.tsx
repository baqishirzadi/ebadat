import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { Spacing, Typography } from '@/constants/theme';
import { usePrayer } from '@/context/PrayerContext';
import { openBatteryOptimizationSettings } from '@/utils/adhanHealth';
import { ensurePushRegistrationOnFirstOpen } from '@/utils/pushRegistry';

export default function OnboardingBatteryScreen() {
  const { requestPrayerSchedule } = usePrayer();

  const finish = () => {
    router.replace('/(tabs)');
    requestPrayerSchedule('onboarding-complete').catch(() => {});
    ensurePushRegistrationOnFirstOpen().catch(() => {});
  };

  useEffect(() => {
    if (Platform.OS !== 'android') {
      finish();
    }
  }, []);

  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <OnboardingShell
      step={5}
      totalSteps={5}
      title="بهینه‌سازی باتری (اختیاری)"
      subtitle="برای اطمینان از پخش به‌موقع اذان در برخی گوشی‌ها، بهینه‌سازی باتری را برای عبادت غیرفعال کنید."
      primaryLabel="باز کردن تنظیمات باتری"
      onPrimary={async () => {
        const opened = await openBatteryOptimizationSettings();
        if (!opened) {
          await Linking.openSettings();
        }
        finish();
      }}
      secondaryLabel="بعداً"
      onSecondary={finish}
      showBack
      onBack={() => router.back()}
    >
      <View style={styles.content}>
        <Text style={styles.bullet}>• این مرحله اختیاری است</Text>
        <Text style={styles.bullet}>• در گوشی‌های سامسونگ، شیائومی و هواوی توصیه می‌شود</Text>
        <Text style={styles.bullet}>• می‌توانید بعداً از تنظیمات اذان راهنما را ببینید</Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  bullet: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    lineHeight: 26,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
