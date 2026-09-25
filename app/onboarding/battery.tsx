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
import { useI18n } from '@/utils/i18n/useI18n';
import { ensurePushRegistrationOnFirstOpen } from '@/utils/pushRegistry';
import {
  getNextPermissionStep,
  getOnboardingStepIndex,
  getOnboardingTotalSteps,
  markFirstOpenAdhanSetupDone,
  setPermissionOnboardingProgress,
} from '@/utils/prayerOnboarding';

export default function OnboardingBatteryScreen() {
  const { theme, state: appState } = useApp();
  const locale = adhanPermissionLocale(appState.preferences.appLanguage);
  const { t } = useI18n();
  const { requestPrayerSchedule } = usePrayer();
  const [totalSteps, setTotalSteps] = useState(4);
  const [busy, setBusy] = useState(false);
  const { status: exempt, refresh } = usePermissionStepResume(checkBatteryOptimizationExempt, false);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      router.replace('/(tabs)');
      return;
    }
    getOnboardingTotalSteps()
      .then(setTotalSteps)
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

  return (
    <OnboardingShell
      testID="android-onboarding-battery"
      step={getOnboardingStepIndex('battery')}
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
          {exempt ? t('onboarding.battery.exempt') : t('onboarding.battery.optional')}
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
