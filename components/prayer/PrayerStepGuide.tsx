/**
 * PrayerStepGuide Component
 * Step-by-step guide for prayer learning
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius, PashtoFonts } from '@/constants/theme';
import type { PashtoFontFamily } from '@/types/quran';

interface Step {
  number: number;
  title_dari?: string;
  title_pashto?: string;
  description_dari?: string;
  description_pashto?: string;
  illustration?: string;
  dari?: string;
  pashto?: string;
}

interface PrayerStepGuideProps {
  steps: Step[];
  showBothLanguages?: boolean;
}

export function PrayerStepGuide({
  steps,
  showBothLanguages = true,
}: PrayerStepGuideProps) {
  const { theme, state } = useApp();
  const color = theme.tint;
  const pashtoFontFamily = PashtoFonts[state.preferences.pashtoFont as PashtoFontFamily]?.name || 'Amiri';

  return (
    <View style={styles.container}>
      {steps.map((step, index) => (
        <View
          key={step.number || index}
          style={[styles.stepCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          {/* Step Number */}
          <View style={[styles.stepNumber, { backgroundColor: color }]}>
            <Text style={styles.stepNumberText}>{step.number}</Text>
          </View>

          {/* Content */}
          <View style={styles.stepContent}>
            {/* Title */}
            {(step.title_dari || step.dari) && (
              <Text style={[styles.stepTitle, { color: theme.text }]}>
                {step.title_dari || step.dari}
              </Text>
            )}
            {showBothLanguages && (step.title_pashto || step.pashto) && (
              <Text style={[styles.stepTitlePashto, { color: theme.textSecondary, fontFamily: pashtoFontFamily }]}>
                {step.title_pashto || step.pashto}
              </Text>
            )}

            {/* Description */}
            {step.description_dari && (
              <View style={styles.descriptionBlock}>
                <View style={[styles.langIndicator, { backgroundColor: theme.tint }]}>
                  <Text style={styles.langIndicatorText}>دری</Text>
                </View>
                <Text style={[styles.descriptionText, { color: theme.text }]}>
                  {step.description_dari}
                </Text>
              </View>
            )}
            {showBothLanguages && step.description_pashto && (
              <View style={styles.descriptionBlock}>
                <View style={[styles.langIndicator, { backgroundColor: '#FF7043' }]}>
                  <Text style={styles.langIndicatorText}>پښتو</Text>
                </View>
                <Text style={[styles.descriptionText, { color: theme.text, fontFamily: pashtoFontFamily, lineHeight: 42 }]}>
                  {step.description_pashto}
                </Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
  },
  stepCard: {
    flexDirection: 'row-reverse',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  stepNumber: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: Typography.ui.title,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
    padding: Spacing.md,
  },
  stepTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: Spacing.xs,
  },
  stepTitlePashto: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 42,
    marginBottom: Spacing.sm,
  },
  descriptionBlock: {
    marginTop: Spacing.sm,
  },
  langIndicator: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  langIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 26,
    includeFontPadding: false,
  },
});

export default PrayerStepGuide;
