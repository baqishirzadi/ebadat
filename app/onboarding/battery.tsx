import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { usePermissionStepResume } from '@/hooks/usePermissionStepResume';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { checkBatteryOptimizationExempt, openBatteryOptimizationSettings } from '@/utils/adhanHealth';
import { adhanPermissionLocale, tAdhanPermission } from '@/utils/i18n/adhanPermissions';
import { ensurePushRegistrationOnFirstOpen } from '@/utils/pushRegistry';
import {
  getAndroidPermissionStepCount,
  getNextPermissionStep,
  markFirstOpenAdhanSetupDone,
  setPermissionOnboardingProgress,
} from '@/utils/prayerOnboarding';

export default function OnboardingBatteryScreen() {
  const { theme, state: appState } = useApp();
  const locale = adhanPermissionLocale(appState.preferences.appLanguage);
  const { requestPrayerSchedule } = usePrayer();
  const [totalSteps, setTotalSteps] = useState(6);
  const [busy, setBusy] = useState(false);
  const { status: exempt, refresh } = usePermissionStepResume(checkBatteryOptimizationExempt, false);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      router.replace('/(tabs)');
      return;
    }
    getAndroidPermissionStepCount()
      .then((count) => setTotalSteps(3 + count))
      .catch(() => {});
    setPermissionOnboardingProgress('battery').catch(() => {});
  }, []);

  const goNext = useCallback(async () => {
    const next = await getNextPermissionStep('battery');
    if (next === 'complete') {
      await markFirstOpenAdhanSetupDone();
      requestPrayerSchedule('onboarding-complete').catch(() => {});
      ensurePushRegistrationOnFirstOpen().catch(() => {});
      router.replace('/(tabs)');
      return;
    }
    router.push(`/onboarding/${next}` as never);
  }, [requestPrayerSchedule]);

  const handleOpenSettings = async () => {
    setBusy(true);
    try {
      const opened = await openBatteryOptimizationSettings();
      if (!opened) {
        await Linking.openSettings();
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  if (Platform.OS !== 'android') {
    return null;
  }

  const permissionStepIndex = Number(Platform.Version) >= 31 ? 6 : 5;

  return (
    <OnboardingShell
      testID="android-onboarding-battery"
      step={permissionStepIndex}
      totalSteps={totalSteps}
      title={tAdhanPermission('adhanPermissions.battery.title', locale)}
      subtitle={tAdhanPermission('adhanPermissions.battery.body', locale)}
      primaryLabel={
        exempt
          ? tAdhanPermission('adhanPermissions.continue', locale)
          : busy
            ? '...'
            : tAdhanPermission('adhanPermissions.battery.button', locale)
      }
      onPrimary={exempt ? goNext : handleOpenSettings}
      primaryDisabled={busy}
      secondaryLabel={tAdhanPermission('adhanPermissions.battery.skip', locale)}
      onSecondary={goNext}
      showBack
      contentAlign="center"
    >
      <RtlView style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: `${theme.warning}18` }]}>
          <MaterialIcons name="battery-alert" size={48} color={theme.warning} />
        </View>
        <RtlText align="center" style={[styles.status, { color: exempt ? '#1b7f4d' : theme.textSecondary }]}>
          {exempt
            ? (locale === 'ps' ? 'د بیټرۍ محدودیت نشته.' : 'محدودیت باتری اعمال نشده است')
            : (locale === 'ps' ? 'دا ګام اختیاري دی؛ وروسته یې د اذان د حالت له برخې هم برابرولای شئ.' : 'این مرحله اختیاری است؛ بعداً از بخش سلامت اذان هم می‌توانید تنظیم کنید.')}
        </RtlText>
      </RtlView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    lineHeight: 26,
  },
});
