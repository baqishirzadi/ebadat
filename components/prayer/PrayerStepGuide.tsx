/**
 * PrayerStepGuide Component
 * One language at a time — follows the app language, with Dari fallback.
 */

import type { PashtoFontFamily } from '@/constants/theme';
import { BorderRadius, PashtoFonts, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import React from 'react';

import { StyleSheet, View } from 'react-native';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { pickContent } from '@/utils/i18n/content';
import { useI18n } from '@/utils/i18n/useI18n';

interface Step {
  number: number;
  takbir?: number;
  title_dari?: string;
  title_pashto?: string;
  title_english?: string;
  description_dari?: string;
  description_pashto?: string;
  description_english?: string;
  illustration?: string;
  dari?: string;
  pashto?: string;
  english?: string;
}

interface PrayerStepGuideProps {
  steps: Step[];
  /** Kept so existing call sites compile. Always ignored: one language only. */
  showBothLanguages?: boolean;
}

export function PrayerStepGuide({
  steps,
}: PrayerStepGuideProps) {
  const { theme, state } = useApp();
  const { language, fontFamily } = useI18n();
  const color = theme.tint;
  const pashtoFontFamily = PashtoFonts[state.preferences.pashtoFont as PashtoFontFamily]?.name || 'Amiri';
  const bodyFont = language === 'pashto' ? pashtoFontFamily : fontFamily;
  const bodyLineHeight = language === 'pashto' ? 42 : 26;

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const stepNumber = step.number ?? step.takbir ?? index + 1;
        const title = pickContent(step, 'title', language) || pickContent(step, null, language);
        const description = pickContent(step, 'description', language);
        return (
          <View
            key={stepNumber}
            style={[styles.stepCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <View style={[styles.stepNumber, { backgroundColor: color }]}>
              <LocalizedText style={styles.stepNumberText}>{stepNumber}</LocalizedText>
            </View>

            <View style={styles.stepContent}>
              {title ? (
                <LocalizedText style={[styles.stepTitle, { color: theme.text, fontFamily: bodyFont }]}>
                  {title}
                </LocalizedText>
              ) : null}
              {description ? (
                <View style={styles.descriptionBlock}>
                  <LocalizedText style={[styles.descriptionText, { color: theme.text, fontFamily: bodyFont, lineHeight: bodyLineHeight }]}>
                    {description}
                  </LocalizedText>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
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
    marginBottom: Spacing.xs,
  },
  descriptionBlock: {
    marginTop: Spacing.sm,
  },
  descriptionText: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    lineHeight: 26,
    includeFontPadding: false,
  },
});

export default PrayerStepGuide;
