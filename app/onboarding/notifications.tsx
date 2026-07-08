import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { formatPrayerTime12h } from '@/utils/formatPrayerTime';
import { getNextPrayer, type PrayerTimes } from '@/utils/prayerTimes';
import { requestAdhanNotificationPermission, markFirstOpenAdhanSetupDone } from '@/utils/prayerOnboarding';
import { ensurePushRegistrationOnFirstOpen } from '@/utils/pushRegistry';

const PRAYER_PREVIEW = [
  { key: 'fajr', label: 'صبح', icon: 'wb-twilight' as const },
  { key: 'dhuhr', label: 'ظهر', icon: 'wb-sunny' as const },
  { key: 'asr', label: 'عصر', icon: 'wb-cloudy' as const },
  { key: 'maghrib', label: 'شام', icon: 'nights-stay' as const },
  { key: 'isha', label: 'خفتن', icon: 'bedtime' as const },
];

const THEME_GRADIENT: [string, string, string] = ['#0F1F14', '#1a4d3e', '#2d6a4f'];

export default function OnboardingNotificationsScreen() {
  const { theme } = useApp();
  const { requestPrayerSchedule, state } = usePrayer();
  const [busy, setBusy] = useState(false);

  const prayerTimes = state.prayerTimes;
  const nextKey = useMemo(() => {
    if (!prayerTimes) return 'fajr';
    return getNextPrayer(prayerTimes).name;
  }, [prayerTimes]);

  const goNext = async () => {
    if (Platform.OS !== 'android') {
      await markFirstOpenAdhanSetupDone();
    }
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

  const renderTime = (key: keyof PrayerTimes) => {
    if (prayerTimes?.[key]) {
      return formatPrayerTime12h(prayerTimes[key]);
    }
    return '—';
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

        <View style={[styles.previewShell, styles.shadow]}>
          <LinearGradient colors={THEME_GRADIENT} style={styles.previewHeader}>
            <MaterialIcons name="schedule" size={18} color="rgba(255,255,255,0.9)" />
            <RtlText align="center" style={styles.previewHeaderText}>
              اوقات نماز امروز
            </RtlText>
          </LinearGradient>

          <RtlView style={[styles.previewBody, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {PRAYER_PREVIEW.map((item, index) => {
              const isNext = item.key === nextKey;
              return (
                <RtlView
                  key={item.key}
                  style={[
                    styles.previewRow,
                    isNext && { backgroundColor: `${theme.tint}12` },
                    index < PRAYER_PREVIEW.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.divider,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={item.icon}
                    size={20}
                    color={isNext ? theme.bookmark : theme.textSecondary}
                  />
                  <RtlText
                    align="center"
                    style={[
                      styles.previewLabel,
                      { color: isNext ? theme.tint : theme.text },
                      isNext && styles.previewLabelNext,
                    ]}
                  >
                    {item.label}
                  </RtlText>
                  <RtlText
                    align="center"
                    style={[
                      styles.previewTime,
                      { color: isNext ? theme.bookmark : theme.tint },
                    ]}
                  >
                    {renderTime(item.key as keyof PrayerTimes)}
                  </RtlText>
                </RtlView>
              );
            })}
          </RtlView>
        </View>

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
  previewShell: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  previewHeaderText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    color: '#fff',
  },
  previewBody: {
    borderWidth: 1,
    borderTopWidth: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  previewLabel: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    flex: 1,
    textAlign: 'center',
  },
  previewLabelNext: {
    fontFamily: 'Vazirmatn-Bold',
  },
  previewTime: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    minWidth: 72,
    textAlign: 'center',
  },
  bullet: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 22,
  },
});
