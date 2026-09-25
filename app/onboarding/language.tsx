import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { AppLanguage } from '@/types/quran';
import { APP_LANGUAGE_ORDER } from '@/utils/i18n/languages';
import { useI18n } from '@/utils/i18n/useI18n';
import {
  getOnboardingStepIndex,
  getOnboardingTotalSteps,
  setPermissionOnboardingProgress,
} from '@/utils/prayerOnboarding';

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
    >
      <RtlView style={styles.list}>
        <LinearGradient
          colors={['#0F1F14', '#1a4d3e', '#0F1F14']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={[styles.logoFrame, { borderColor: theme.accent, backgroundColor: theme.card }]}>
            <Image source={require('@/assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <RtlText align="center" style={styles.tagline}>
            {t('onboarding.welcome.tagline')}
          </RtlText>
        </LinearGradient>

        {APP_LANGUAGE_ORDER.map((key) => {
          const option = LANGUAGE_OPTIONS[key];
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
              <RtlView style={styles.optionBody}>
                <RtlText
                  align="center"
                  style={[
                    styles.optionLabel,
                    {
                      color: theme.text,
                      fontFamily: option.fontFamily ? `${option.fontFamily}-Bold` : undefined,
                      fontWeight: option.fontFamily ? undefined : '700',
                    },
                  ]}
                >
                  {option.label}
                </RtlText>
                <RtlText
                  align="center"
                  style={[
                    styles.optionHint,
                    { color: theme.textSecondary, fontFamily: option.fontFamily },
                  ]}
                >
                  {option.hint}
                </RtlText>
              </RtlView>
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
    gap: Spacing.md,
    alignItems: 'center',
  },
  hero: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  logoFrame: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 72,
    height: 72,
  },
  tagline: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.9)',
    paddingHorizontal: Spacing.sm,
  },
  option: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  optionBody: {
    flex: 1,
    gap: 4,
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: Typography.ui.body,
    includeFontPadding: true,
    lineHeight: 34,
  },
  optionHint: {
    fontSize: Typography.ui.caption,
    includeFontPadding: true,
    lineHeight: 28,
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
