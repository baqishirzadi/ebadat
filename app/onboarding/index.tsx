import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

export default function OnboardingWelcomeScreen() {
  const { theme } = useApp();

  return (
    <OnboardingShell
      step={1}
      totalSteps={5}
      title="به عبادت خوش آمدید"
      subtitle="قرآن، اوقات نماز، اذان، قبله‌نما و تقویم اسلامی — همه در یک برنامه ساده و زیبا."
      primaryLabel="شروع"
      onPrimary={() => router.push('/onboarding/language' as never)}
    >
      <View style={styles.hero}>
        <View style={[styles.logoFrame, { borderColor: theme.accent, backgroundColor: theme.card }]}>
          <Image source={require('@/assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={[styles.tagline, { color: theme.textSecondary }]}>
          برای مسلمانان افغان در سراسر جهان
        </Text>
      </View>
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
    textAlign: 'center',
    writingDirection: 'rtl',
    paddingHorizontal: Spacing.lg,
  },
});
