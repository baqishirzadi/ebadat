import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { AppLanguage } from '@/types/quran';
import { APP_LANGUAGE_ORDER } from '@/utils/i18n/languages';
import { useI18n } from '@/utils/i18n/useI18n';

/**
 * Each option describes itself in its own language so a user who only reads one
 * of the three can still find their language in the list.
 */
const LANGUAGE_OPTIONS: Record<AppLanguage, { label: string; hint: string; fontFamily?: string }> = {
  dari: {
    label: 'فارسی (دری)',
    hint: 'ترجمه و متن‌های برنامه به دری',
    fontFamily: 'Vazirmatn',
  },
  pashto: {
    label: 'پښتو',
    hint: 'د اپ ژبه او ژباړې په پښتو',
    fontFamily: 'Vazirmatn',
  },
  english: {
    label: 'English',
    hint: 'App text and translations in English',
    fontFamily: undefined,
  },
};

export default function OnboardingLanguageScreen() {
  const { theme, setAppLanguage, state } = useApp();
  const { t } = useI18n();
  const [selected, setSelected] = useState<AppLanguage>(state.preferences.appLanguage || 'dari');

  const handleContinue = () => {
    setAppLanguage(selected);
    router.push('/onboarding' as never);
  };

  return (
    <OnboardingShell
      step={1}
      totalSteps={5}
      title={t('onboarding.language.title')}
      subtitle={t('onboarding.language.subtitle')}
      primaryLabel={t('onboarding.continue')}
      onPrimary={handleContinue}
    >
      <RtlView style={styles.list}>
        <View style={[styles.iconCircle, { backgroundColor: `${theme.tint}18` }]}>
          <MaterialIcons name="translate" size={40} color={theme.tint} />
        </View>
        {APP_LANGUAGE_ORDER.map((key) => {
          const option = LANGUAGE_OPTIONS[key];
          const active = selected === key;
          return (
            <Pressable
              key={key}
              onPress={() => setSelected(key)}
              style={[
                styles.option,
                {
                  backgroundColor: theme.card,
                  borderColor: active ? theme.tint : theme.cardBorder,
                },
              ]}
            >
              <RtlText
                align="center"
                style={[
                  styles.optionLabel,
                  { color: theme.text, fontFamily: option.fontFamily ? `${option.fontFamily}-Bold` : undefined },
                ]}
              >
                {option.label}
              </RtlText>
              <RtlText
                align="center"
                style={[styles.optionHint, { color: theme.textSecondary, fontFamily: option.fontFamily }]}
              >
                {option.hint}
              </RtlText>
            </Pressable>
          );
        })}
      </RtlView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  option: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 4,
    width: '100%',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: Typography.ui.body,
    // Preserve the upper/lower marks in Pashto glyphs (پښتو) on Android.
    includeFontPadding: true,
    lineHeight: 34,
  },
  optionHint: {
    fontSize: Typography.ui.caption,
    includeFontPadding: true,
    lineHeight: 28,
  },
});
