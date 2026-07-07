import { router } from 'expo-router';
import React, { useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { Spacing, Typography } from '@/constants/theme';
import { usePrayer } from '@/context/PrayerContext';
import { requestAdhanNotificationPermission } from '@/utils/prayerOnboarding';
import { ensurePushRegistrationOnFirstOpen } from '@/utils/pushRegistry';

export default function OnboardingNotificationsScreen() {
  const { requestPrayerSchedule } = usePrayer();
  const [busy, setBusy] = useState(false);

  const goNext = () => {
    if (Platform.OS === 'android') {
      router.push('/onboarding/battery' as never);
      return;
    }
    router.replace('/(tabs)');
    requestPrayerSchedule('onboarding-complete').catch(() => {});
    ensurePushRegistrationOnFirstOpen().catch(() => {});
  };

  const handleEnable = async () => {
    setBusy(true);
    try {
      await requestAdhanNotificationPermission();
      goNext();
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      step={4}
      totalSteps={5}
      title="فعال‌سازی اعلان‌ها"
      subtitle="برای دریافت اذان به‌موقع، اجازه اعلان را فعال کنید. این تنها مرحله ضروری پس از انتخاب شهر است."
      primaryLabel={busy ? 'در حال آماده‌سازی...' : 'فعال‌سازی اعلان‌ها'}
      onPrimary={handleEnable}
      primaryDisabled={busy}
      secondaryLabel="ادامه بدون اعلان"
      onSecondary={goNext}
      showBack
      onBack={() => router.back()}
    >
      <RtlView style={styles.content}>
        <RtlText style={styles.bullet}>• اذان پنج وقت نماز در زمان دقیق</RtlText>
        <RtlText style={styles.bullet}>• یادآوری مناسبت‌های اسلامی</RtlText>
        <RtlText style={styles.bullet}>• می‌توانید بعداً از تنظیمات گوشی تغییر دهید</RtlText>
      </RtlView>
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
  },
});
