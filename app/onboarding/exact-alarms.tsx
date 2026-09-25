import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { usePermissionStepResume } from '@/hooks/usePermissionStepResume';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { checkCanScheduleExactAlarms, openExactAlarmSettings } from '@/utils/adhanHealth';
import { adhanPermissionLocale, tAdhanPermission } from '@/utils/i18n/adhanPermissions';
import { useI18n } from '@/utils/i18n/useI18n';
import {
  getNextPermissionStep,
  getOnboardingStepIndex,
  getOnboardingTotalSteps,
  setPermissionOnboardingProgress,
} from '@/utils/prayerOnboarding';

export default function OnboardingExactAlarmsScreen() {
  const { theme, state: appState } = useApp();
  const locale = adhanPermissionLocale(appState.preferences.appLanguage);
  const { t } = useI18n();
  const [totalSteps, setTotalSteps] = useState(4);
  const [busy, setBusy] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const { status: granted, refresh } = usePermissionStepResume(checkCanScheduleExactAlarms, false);

  useEffect(() => {
    if (Platform.OS !== 'android' || Number(Platform.Version) < 31) {
      router.replace('/onboarding/battery' as never);
      return;
    }
    setShouldRender(true);
    getOnboardingTotalSteps()
      .then(setTotalSteps)
      .catch(() => {});
    setPermissionOnboardingProgress('exact-alarms').catch(() => {});
  }, []);

  const goNext = useCallback(async () => {
    const next = await getNextPermissionStep('exact-alarms');
    router.push(`/onboarding/${next}` as never);
  }, []);

  const handleEnable = async () => {
    setBusy(true);
    try {
      await openExactAlarmSettings();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <OnboardingShell
      testID="android-onboarding-exact-alarms"
      step={getOnboardingStepIndex('exact-alarms')}
      totalSteps={totalSteps}
      title={tAdhanPermission('adhanPermissions.exactAlarm.title', locale)}
      subtitle={tAdhanPermission('adhanPermissions.exactAlarm.body', locale)}
      primaryLabel={
        granted
          ? tAdhanPermission('adhanPermissions.continue', locale)
          : busy
            ? '...'
            : tAdhanPermission('adhanPermissions.exactAlarm.button', locale)
      }
      onPrimary={granted ? goNext : handleEnable}
      primaryDisabled={busy}
      secondaryLabel={granted ? undefined : tAdhanPermission('adhanPermissions.exactAlarm.skip', locale)}
      onSecondary={granted ? undefined : goNext}
      secondaryMuted
      showBack
      contentAlign="center"
    >
      <RtlView style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: `${theme.warning}18` }]}>
          <MaterialIcons name="alarm" size={48} color={theme.warning} />
        </View>
        <RtlText align="center" style={[styles.status, { color: granted ? '#1b7f4d' : theme.warning }]}>
          {granted
            ? `${tAdhanPermission('adhanPermissions.exactAlarm.granted', locale)} ✅`
            : `${tAdhanPermission('adhanPermissions.exactAlarm.denied', locale)} ⚠️`}
        </RtlText>
        {!granted ? (
          <RtlText align="center" style={[styles.hint, { color: theme.textSecondary }]}>
            {t('onboarding.exactAlarm.returnHint')}
          </RtlText>
        ) : null}
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
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  hint: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 22,
  },
});
