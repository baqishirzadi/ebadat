import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { formatPrayerTime12h } from '@/utils/formatPrayerTime';
import { tAdhanPermission } from '@/utils/i18n/adhanPermissions';
import { getNextPrayer, type PrayerTimes } from '@/utils/prayerTimes';
import {
  getAndroidPermissionStepCount,
  requestAdhanNotificationPermission,
  setPermissionOnboardingProgress,
} from '@/utils/prayerOnboarding';

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
  const { state } = usePrayer();
  const [busy, setBusy] = useState(false);
  const [totalSteps, setTotalSteps] = useState(6);

  useEffect(() => {
    setPermissionOnboardingProgress('notifications').catch(() => {});
    if (Platform.OS === 'android') {
      getAndroidPermissionStepCount()
        .then((count) => setTotalSteps(3 + count))
        .catch(() => {});
    }
  }, []);

  const prayerTimes = state.prayerTimes;
  const nextKey = useMemo(() => {
    if (!prayerTimes) return 'fajr';
    return getNextPrayer(prayerTimes).name;
  }, [prayerTimes]);

  const goNext = async () => {
    if (Platform.OS !== 'android') {
      const { markFirstOpenAdhanSetupDone } = await import('@/utils/prayerOnboarding');
      const { ensurePushRegistrationOnFirstOpen } = await import('@/utils/pushRegistry');
      await markFirstOpenAdhanSetupDone();
      ensurePushRegistrationOnFirstOpen().catch(() => {});
      router.replace('/(tabs)');
      return;
    }
    const next = Number(Platform.Version) >= 31 ? 'exact-alarms' : 'battery';
    router.push(`/onboarding/${next}` as never);
  };

  const handleEnable = async () => {
    setBusy(true);
    try {
      const result = await requestAdhanNotificationPermission();
      if (result === 'granted' || result === 'skipped') {
        await goNext();
        return;
      }

      if (result === 'blocked') {
        Alert.alert(
          'اجازه اعلان غیرفعال است',
          'برای پخش به‌موقع اذان، اعلان‌های عبادت را از Settings دوباره فعال کنید.',
        );
        return;
      }

      Alert.alert(
        'اعلان‌ها فعال نشد',
        'بدون اجازه اعلان، اذان به‌موقع پخش نمی‌شود. می‌توانید دوباره تلاش کنید یا بدون اعلان ادامه دهید.',
      );
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
      totalSteps={totalSteps}
      title={tAdhanPermission('adhanPermissions.notifications.title')}
      subtitle={tAdhanPermission('adhanPermissions.notifications.body')}
      primaryLabel={busy ? 'در حال آماده‌سازی...' : tAdhanPermission('adhanPermissions.notifications.button')}
      onPrimary={handleEnable}
      primaryDisabled={busy}
      secondaryLabel={tAdhanPermission('adhanPermissions.notifications.skip')}
      onSecondary={goNext}
      showBack
      scrollable={false}
      compactHeader
      contentAlign="center"
    >
      <RtlView style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: `${theme.tint}18` }]}>
          <MaterialIcons name="notifications-active" size={36} color={theme.tint} />
        </View>

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
      </RtlView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.sm,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
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
    paddingVertical: Spacing.xs,
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
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  previewLabel: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    flex: 1,
    textAlign: 'center',
  },
  previewLabelNext: {
    fontFamily: 'Vazirmatn-Bold',
  },
  previewTime: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    minWidth: 64,
    textAlign: 'center',
  },
});
