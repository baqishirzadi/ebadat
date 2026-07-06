/**
 * Legacy first-open helper for existing installs upgrading to route-based onboarding.
 * First-install users are handled by /onboarding routes.
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useStartupPhase } from '@/context/StartupPhaseContext';
import { usePrayer } from '@/context/PrayerContext';
import { useStartupBootstrap } from '@/context/StartupBootstrapContext';
import {
  getSavedPrayerCityKey,
  isFirstOpenAdhanSetupDone,
  markFirstOpenAdhanSetupDone,
} from '@/utils/prayerOnboarding';
import { ensurePushRegistrationOnFirstOpen } from '@/utils/pushRegistry';

export function FirstOpenAdhanSetup() {
  const { isInteractiveReady } = useStartupPhase();
  const { needsOnboarding } = useStartupBootstrap();
  const { state, requestPrayerSchedule } = usePrayer();

  useEffect(() => {
    if (!isInteractiveReady || Platform.OS === 'web' || needsOnboarding) return;

    let cancelled = false;

    const run = async () => {
      const [done, savedCity] = await Promise.all([
        isFirstOpenAdhanSetupDone(),
        getSavedPrayerCityKey(),
      ]);
      if (cancelled) return;

      const hasCity = Boolean(savedCity || state.settings.selectedCity);
      if (hasCity && !done) {
        await markFirstOpenAdhanSetupDone();
        requestPrayerSchedule('first-open-existing-city').catch(() => {});
      }

      if (hasCity || done) {
        ensurePushRegistrationOnFirstOpen().catch(() => {});
      }
    };

    run().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isInteractiveReady, needsOnboarding, requestPrayerSchedule, state.settings.selectedCity]);

  return null;
}
