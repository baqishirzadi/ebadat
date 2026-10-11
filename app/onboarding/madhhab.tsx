import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { MadhhabOptionList } from '@/components/madhhab/MadhhabPicker';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { useI18n } from '@/utils/i18n/useI18n';
import { getActiveMadhhab, type MadhhabKey } from '@/utils/madhhab';
import { hydrateMadhhab, persistMadhhab } from '@/utils/madhhabStorage';
import {
  getOnboardingStepIndex,
  getOnboardingTotalSteps,
  setPermissionOnboardingProgress,
} from '@/utils/prayerOnboarding';

export default function OnboardingMadhhabScreen() {
  const { t } = useI18n();
  const [selected, setSelected] = useState<MadhhabKey>(getActiveMadhhab());
  const [totalSteps, setTotalSteps] = useState(5);

  useEffect(() => {
    setPermissionOnboardingProgress('madhhab').catch(() => {});
    getOnboardingTotalSteps()
      .then(setTotalSteps)
      .catch(() => {});
    hydrateMadhhab()
      .then((madhhab) => setSelected(madhhab))
      .catch(() => {});
  }, []);

  const handleContinue = () => {
    void persistMadhhab(selected).catch(() => {});
    router.push('/onboarding/location' as never);
  };

  return (
    <OnboardingShell
      testID="onboarding-madhhab"
      step={getOnboardingStepIndex('madhhab')}
      totalSteps={totalSteps}
      title={t('onboarding.madhhab.title')}
      subtitle={t('onboarding.madhhab.subtitle')}
      primaryLabel={t('onboarding.continue')}
      onPrimary={handleContinue}
      scrollable
      contentAlign="center"
    >
      <MadhhabOptionList centered selected={selected} onSelect={setSelected} />
    </OnboardingShell>
  );
}
