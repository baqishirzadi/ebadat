/**
 * Step card — one lesson step at a time. Navigation lives on the lesson bar.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { LocalizedText } from '@/components/ui/LocalizedText';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { getPashtoBoldFontFamily, getPashtoFontFamily } from '@/hooks/useFonts';
import { pickContent } from '@/utils/i18n/content';
import { useI18n } from '@/utils/i18n/useI18n';

interface Step {
  number?: number;
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
  index: number;
}

export function PrayerStepGuide({ steps, index }: PrayerStepGuideProps) {
  const { theme, state } = useApp();
  const { language, fontFamily, isLatin } = useI18n();
  const pashtoFont = state.preferences.pashtoFont;
  const bodyFont = language === 'pashto' ? getPashtoFontFamily(pashtoFont) : fontFamily;
  const titleFont = language === 'pashto' ? getPashtoBoldFontFamily(pashtoFont) : isLatin ? undefined : 'Vazirmatn-Bold';
  const bodyLineHeight = language === 'pashto' ? 42 : 30;

  const total = steps.length;
  if (total === 0) return null;

  const safeIndex = Math.min(Math.max(index, 0), total - 1);
  const step = steps[safeIndex];
  const stepNumber = step?.number ?? step?.takbir ?? safeIndex + 1;
  const title = step
    ? pickContent(step, 'title', language) || pickContent(step, null, language)
    : '';
  const description = step ? pickContent(step, 'description', language) : '';

  return (
    <View style={styles.container}>
      <View style={[styles.card, { borderColor: `${theme.accent}66`, backgroundColor: theme.card }]}>
        <LocalizedText style={[styles.stepNumber, { color: theme.accent }]}>
          {stepNumber}
        </LocalizedText>

        <View style={[styles.progressTrack, { backgroundColor: theme.divider }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.accent,
                width: `${((safeIndex + 1) / total) * 100}%`,
              },
            ]}
          />
        </View>

        {title ? (
          <LocalizedText
            preserveFontFamily
            style={[styles.stepTitle, { color: theme.text, fontFamily: titleFont }]}
          >
            {title}
          </LocalizedText>
        ) : null}

        {description ? (
          <LocalizedText
            style={[
              styles.stepBody,
              {
                color: theme.text,
                fontFamily: bodyFont,
                lineHeight: bodyLineHeight,
              },
            ]}
          >
            {description}
          </LocalizedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: Typography.ui.heading,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepTitle: {
    fontSize: Typography.ui.title,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  stepBody: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    includeFontPadding: false,
  },
});

export default PrayerStepGuide;
