import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp, useLocalizedFontPreferences } from '@/context/AppContext';
import type { AppLanguage } from '@/types/quran';
import { languageChoiceStyle } from '@/utils/i18n/languageChoiceStyle';
import { APP_LANGUAGE_ORDER } from '@/utils/i18n/languages';
import { useI18n } from '@/utils/i18n/useI18n';
import {
  getOnboardingStepIndex,
  getOnboardingTotalSteps,
  setPermissionOnboardingProgress,
} from '@/utils/prayerOnboarding';

/** Each row names itself, so the reader can find their language without a hint. */
const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  dari: 'فارسی (دری)',
  pashto: 'پښتو',
  arabic: 'العربية',
  turkish: 'Türkçe',
  english: 'English',
};

export default function OnboardingLanguageScreen() {
  const { theme, setAppLanguage, state } = useApp();
  const { t } = useI18n();
  const fonts = useLocalizedFontPreferences();
  const [selected, setSelected] = useState<AppLanguage>(state.preferences.appLanguage || 'dari');
  const [totalSteps, setTotalSteps] = useState(4);

  useEffect(() => {
    setPermissionOnboardingProgress('language').catch(() => {});
    getOnboardingTotalSteps()
      .then(setTotalSteps)
      .catch(() => {});
  }, []);

  const handleSelect = (key: AppLanguage) => {
    setSelected(key);
    setAppLanguage(key);
  };

  const handleContinue = () => {
    setAppLanguage(selected);
    router.push('/onboarding/location' as never);
  };

  return (
    <OnboardingShell
      step={getOnboardingStepIndex('language')}
      totalSteps={totalSteps}
      title={t('onboarding.language.title')}
      subtitle={t('onboarding.language.subtitle')}
      primaryLabel={t('onboarding.continue')}
      onPrimary={handleContinue}
      scrollable={false}
    >
      <RtlView style={styles.list}>
        {APP_LANGUAGE_ORDER.map((key) => {
          const active = selected === key;
          return (
            <Pressable
              key={key}
              onPress={() => handleSelect(key)}
              style={[
                styles.option,
                {
                  backgroundColor: active ? `${theme.tint}14` : theme.card,
                  borderColor: active ? theme.tint : theme.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  languageChoiceStyle(key, fonts, { bold: true, fontSize: Typography.ui.body }),
                  { color: theme.text, flex: 1 },
                ]}
              >
                {LANGUAGE_LABELS[key]}
              </Text>
              {active ? (
                <View style={[styles.check, { backgroundColor: theme.tint }]}>
                  <MaterialIcons name="check" size={16} color="#fff" />
                </View>
              ) : (
                <View style={[styles.checkPlaceholder, { borderColor: theme.cardBorder }]} />
              )}
            </Pressable>
          );
        })}
      </RtlView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
  option: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
  },
});
