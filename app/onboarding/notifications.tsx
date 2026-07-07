import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { formatPrayerTime12h } from '@/utils/formatPrayerTime';
import { requestAdhanNotificationPermission } from '@/utils/prayerOnboarding';
import { ensurePushRegistrationOnFirstOpen } from '@/utils/pushRegistry';

const SAMPLE_TIMES = [
  { label: 'صبح', time: new Date(2026, 0, 1, 5, 3) },
  { label: 'ظهر', time: new Date(2026, 0, 1, 12, 18) },
  { label: 'عصر', time: new Date(2026, 0, 1, 16, 59) },
  { label: 'شام', time: new Date(2026, 0, 1, 19, 13) },
  { label: 'خفتن', time: new Date(2026, 0, 1, 20, 53) },
];

export default function OnboardingNotificationsScreen() {
  const { theme } = useApp();
  const { requestPrayerSchedule } = usePrayer();
  const [busy, setBusy] = useState(false);

  const goNext = () => {
    requestPrayerSchedule('onboarding-complete').catch(() => {});
    ensurePushRegistrationOnFirstOpen().catch(() => {});
    if (Platform.OS === 'android') {
      router.push('/onboarding/battery' as never);
      return;
    }
    router.replace('/(tabs)');
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
      title="فعال‌سازی اذان"
      subtitle="برای شنیدن اذان به‌موقع، اجازه اعلان را فعال کنید. این مرحله برای همه کاربران ضروری است."
      primaryLabel={busy ? 'در حال آماده‌سازی...' : 'فعال‌سازی اعلان‌ها'}
      onPrimary={handleEnable}
      primaryDisabled={busy}
      secondaryLabel="ادامه بدون اعلان"
      onSecondary={goNext}
      showBack
      onBack={() => router.back()}
    >
      <RtlView style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: `${theme.tint}18` }]}>
          <MaterialIcons name="notifications-active" size={48} color={theme.tint} />
        </View>

        <RtlText align="center" style={[styles.lead, { color: theme.text }]}>
          اذان پنج وقت نماز در زمان دقیق
        </RtlText>

        <RtlView style={[styles.previewCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {SAMPLE_TIMES.map((item) => (
            <RtlView key={item.label} style={styles.previewRow}>
              <RtlText align="center" style={[styles.previewLabel, { color: theme.text }]}>
                {item.label}
              </RtlText>
              <RtlText align="center" style={[styles.previewTime, { color: theme.tint }]}>
                {formatPrayerTime12h(item.time)}
              </RtlText>
            </RtlView>
          ))}
        </RtlView>

        <RtlText align="center" style={[styles.bullet, { color: theme.textSecondary }]}>
          • می‌توانید بعداً از تنظیمات اذان صدا را تغییر دهید
        </RtlText>
        <RtlText align="center" style={[styles.bullet, { color: theme.textSecondary }]}>
          • در گوشی‌های هواوی، بهینه‌سازی باتری را در مرحله بعد غیرفعال کنید
        </RtlText>
      </RtlView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  lead: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  previewCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: 4,
    width: '100%',
  },
  previewLabel: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
  },
  previewTime: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
  },
  bullet: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 22,
  },
});
