import { router } from 'expo-router';
import React from 'react';
import { Linking, Platform, StyleSheet } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { Spacing, Typography } from '@/constants/theme';
import { usePrayer } from '@/context/PrayerContext';
import { openBatteryOptimizationSettings } from '@/utils/adhanHealth';
import { ensurePushRegistrationOnFirstOpen } from '@/utils/pushRegistry';
import { markFirstOpenAdhanSetupDone } from '@/utils/prayerOnboarding';

export default function OnboardingBatteryScreen() {
  const { requestPrayerSchedule } = usePrayer();

  const finish = async () => {
    await markFirstOpenAdhanSetupDone();
    router.replace('/(tabs)');
    requestPrayerSchedule('onboarding-complete').catch(() => {});
    ensurePushRegistrationOnFirstOpen().catch(() => {});
  };

  React.useEffect(() => {
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
      subtitle="برای اطمینان از پخش به‌موقع اذان، بهینه‌سازی باتری را برای عبادت غیرفعال کنید."
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
      <RtlView style={styles.content}>
        <RtlText align="center" style={[styles.highlight, { color: '#b45309' }]}>
          گوشی هواوی: حتماً بهینه‌سازی باتری را برای عبادت غیرفعال کنید
        </RtlText>
        <RtlText align="center" style={styles.bullet}>• این مرحله اختیاری است</RtlText>
        <RtlText align="center" style={styles.bullet}>• در گوشی‌های سامسونگ، شیائومی و هواوی توصیه می‌شود</RtlText>
        <RtlText align="center" style={styles.bullet}>• می‌توانید بعداً از تنظیمات اذان راهنما را ببینید</RtlText>
      </RtlView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  highlight: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    lineHeight: 26,
    marginBottom: Spacing.sm,
  },
  bullet: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    lineHeight: 26,
  },
});
