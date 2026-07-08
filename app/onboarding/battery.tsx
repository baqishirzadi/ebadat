import { router } from 'expo-router';
import React, { useCallback } from 'react';
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

  const finish = useCallback(async () => {
    await markFirstOpenAdhanSetupDone();
    router.replace('/(tabs)');
    requestPrayerSchedule('onboarding-complete').catch(() => {});
    ensurePushRegistrationOnFirstOpen().catch(() => {});
  }, [requestPrayerSchedule]);

  React.useEffect(() => {
    if (Platform.OS !== 'android') {
      finish();
    }
  }, [finish]);

  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <OnboardingShell
      step={5}
      totalSteps={5}
      title="تنظیمات باتری (اختیاری)"
      subtitle="در بعضی گوشی‌ها، محدودیت‌های باتری ممکن است پخش به‌موقع اذان را مختل کند."
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
    >
      <RtlView style={styles.content}>
        <RtlText align="center" style={[styles.highlight, { color: '#b45309' }]}>
          اگر اذان با تاخیر پخش می‌شود، محدودیت‌های باتری را برای عبادت کمتر کنید
        </RtlText>
        <RtlText align="center" style={styles.bullet}>• این مرحله اختیاری است</RtlText>
        <RtlText align="center" style={styles.bullet}>• بعضی گوشی‌ها اعلان‌ها و پخش پس‌زمینه را محدود می‌کنند</RtlText>
        <RtlText align="center" style={styles.bullet}>• می‌توانید بعداً هم این راهنما را از تنظیمات اذان باز کنید</RtlText>
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
