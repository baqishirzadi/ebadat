import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { OemAutostartGuide } from '@/components/prayer/OemAutostartGuide';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { openOemAutostartSettings } from '@/utils/adhanHealth';
import { tAdhanPermission } from '@/utils/i18n/adhanPermissions';
import { ensurePushRegistrationOnFirstOpen } from '@/utils/pushRegistry';
import {
  getAndroidPermissionStepCount,
  getDeviceManufacturer,
  markFirstOpenAdhanSetupDone,
  markOemAutostartAcknowledged,
  setPermissionOnboardingProgress,
  shouldShowAutostartOnboardingStep,
} from '@/utils/prayerOnboarding';

export default function OnboardingAutostartScreen() {
  const { theme } = useApp();
  const { requestPrayerSchedule } = usePrayer();
  const [totalSteps, setTotalSteps] = useState(7);
  const [manufacturer, setManufacturer] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const finish = useCallback(async () => {
    await markFirstOpenAdhanSetupDone();
    await markOemAutostartAcknowledged();
    requestPrayerSchedule('onboarding-complete').catch(() => {});
    ensurePushRegistrationOnFirstOpen().catch(() => {});
    router.replace('/(tabs)');
  }, [requestPrayerSchedule]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (Platform.OS !== 'android') {
        await finish();
        return;
      }
      const [count, showAutostart, mfr] = await Promise.all([
        getAndroidPermissionStepCount(),
        shouldShowAutostartOnboardingStep(),
        getDeviceManufacturer(),
      ]);
      if (cancelled) return;
      if (!showAutostart) {
        await finish();
        return;
      }
      setTotalSteps(3 + count);
      setManufacturer(mfr);
      await setPermissionOnboardingProgress('autostart');
      setReady(true);
    };
    init().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [finish]);

  const handleOpenSettings = async () => {
    setBusy(true);
    try {
      const opened = await openOemAutostartSettings();
      if (!opened) {
        await Linking.openSettings();
      }
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return null;
  }

  return (
    <OnboardingShell
      step={totalSteps}
      totalSteps={totalSteps}
      title={tAdhanPermission('adhanPermissions.autostart.title')}
      subtitle={tAdhanPermission('adhanPermissions.autostart.body')}
      primaryLabel={busy ? '...' : tAdhanPermission('adhanPermissions.autostart.button')}
      onPrimary={handleOpenSettings}
      primaryDisabled={busy}
      secondaryLabel={tAdhanPermission('adhanPermissions.autostart.skip')}
      onSecondary={finish}
      showBack
      contentAlign="center"
    >
      <RtlView style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: `${theme.accent}18` }]}>
          <MaterialIcons name="settings-suggest" size={48} color={theme.accent} />
        </View>
        <OemAutostartGuide manufacturer={manufacturer} />
        <RtlText align="center" style={[styles.hint, { color: theme.textSecondary }]}>
          پس از انجام مراحل، «بعداً» را بزنید تا وارد برنامه شوید.
        </RtlText>
      </RtlView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
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
  hint: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 22,
  },
});
