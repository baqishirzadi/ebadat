import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { TranslationLanguage } from '@/types/quran';

const OPTIONS: { key: TranslationLanguage; label: string; hint: string }[] = [
  { key: 'dari', label: 'فارسی (دری)', hint: 'ترجمه و متن‌های برنامه به دری' },
  { key: 'pashto', label: 'پښتو', hint: 'ترجمه و متن‌های برنامه به پښتو' },
];

export default function OnboardingLanguageScreen() {
  const { theme, setTranslationLanguage } = useApp();
  const [selected, setSelected] = useState<TranslationLanguage>('dari');

  const handleContinue = () => {
    setTranslationLanguage(selected);
    router.push('/onboarding/location' as never);
  };

  return (
    <OnboardingShell
      step={2}
      totalSteps={5}
      title="زبان برنامه"
      subtitle="زبان ترجمه قرآن و متن‌های برنامه را انتخاب کنید. بعداً می‌توانید تغییر دهید."
      primaryLabel="ادامه"
      onPrimary={handleContinue}
      showBack
      onBack={() => router.back()}
    >
      <View style={styles.list}>
        {OPTIONS.map((option) => {
          const active = selected === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => setSelected(option.key)}
              style={[
                styles.option,
                {
                  backgroundColor: theme.card,
                  borderColor: active ? theme.tint : theme.cardBorder,
                },
              ]}
            >
              <Text style={[styles.optionLabel, { color: theme.text }]}>{option.label}</Text>
              <Text style={[styles.optionHint, { color: theme.textSecondary }]}>{option.hint}</Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
  option: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 4,
  },
  optionLabel: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  optionHint: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
