import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/utils/i18n/useI18n';

export default function OnboardingWelcomeScreen() {
  const { theme } = useApp();
  const { t } = useI18n();

  return (
    <OnboardingShell
      step={2}
      totalSteps={5}
      title={t('onboarding.welcome.title')}
      subtitle={t('onboarding.welcome.subtitle')}
      primaryLabel={t('onboarding.welcome.start')}
      onPrimary={() => router.push('/onboarding/location' as never)}
      showBack
    >
      <RtlView style={styles.hero}>
        <LinearGradient
          colors={['#0F1F14', '#1a4d3e', '#0F1F14']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <RtlView style={[styles.logoFrame, { borderColor: theme.accent, backgroundColor: theme.card }]}>
            <Image source={require('@/assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
          </RtlView>
        </LinearGradient>
        <RtlText align="center" style={[styles.tagline, { color: theme.textSecondary }]}>
          {t('onboarding.welcome.tagline')}
        </RtlText>
      </RtlView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  gradientHeader: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFrame: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 96,
    height: 96,
  },
  tagline: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    paddingHorizontal: Spacing.lg,
  },
});
