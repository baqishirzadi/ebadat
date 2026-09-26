/**
 * Step-by-step reader — centered text only, no illustrations or icon buttons.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LocalizedText } from '@/components/ui/LocalizedText';
import type { PashtoFontFamily } from '@/constants/theme';
import { BorderRadius, PashtoFonts, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
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
  /** Kept so existing call sites compile. Always ignored: one language only. */
  showBothLanguages?: boolean;
}

export function PrayerStepGuide({ steps }: PrayerStepGuideProps) {
  const { theme, state } = useApp();
  const { t, language, fontFamily } = useI18n();
  const [index, setIndex] = useState(0);
  const pashtoFontFamily = PashtoFonts[state.preferences.pashtoFont as PashtoFontFamily]?.name || 'Amiri';
  const bodyFont = language === 'pashto' ? pashtoFontFamily : fontFamily;
  const titleFont = language === 'pashto' ? pashtoFontFamily : 'Vazirmatn-Bold';
  const bodyLineHeight = language === 'pashto' ? 42 : 30;

  useEffect(() => {
    setIndex(0);
  }, [steps]);

  const total = steps.length;
  const safeIndex = Math.min(index, Math.max(total - 1, 0));
  const step = steps[safeIndex];
  const stepNumber = step?.number ?? step?.takbir ?? safeIndex + 1;
  const title = step
    ? pickContent(step, 'title', language) || pickContent(step, null, language)
    : '';
  const description = step ? pickContent(step, 'description', language) : '';

  const goPrev = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNext = useCallback(() => {
    setIndex((current) => Math.min(total - 1, current + 1));
  }, [total]);

  if (total === 0) return null;

  const progressLabel = t('prayerLearning.stepOf', {
    current: safeIndex + 1,
    total,
  });

  return (
    <View style={styles.container}>
      <View style={[styles.card, { borderColor: `${theme.accent}66`, backgroundColor: theme.card }]}>
        <LocalizedText style={[styles.stepNumber, { color: theme.accent }]}>
          {stepNumber}
        </LocalizedText>
        <LocalizedText style={[styles.progressLabel, { color: theme.textSecondary }]}>
          {progressLabel}
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

      <View style={styles.navRow}>
        <Pressable
          onPress={goPrev}
          disabled={safeIndex === 0}
          style={({ pressed }) => [
            styles.navButton,
            {
              borderColor: theme.cardBorder,
              opacity: safeIndex === 0 ? 0.35 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <LocalizedText style={[styles.navLabel, { color: theme.tint }]}>
            {t('prayerLearning.previous')}
          </LocalizedText>
        </Pressable>

        <Pressable
          onPress={goNext}
          disabled={safeIndex >= total - 1}
          style={({ pressed }) => [
            styles.navButton,
            {
              borderColor: theme.cardBorder,
              opacity: safeIndex >= total - 1 ? 0.35 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <LocalizedText style={[styles.navLabel, { color: theme.tint }]}>
            {t('prayerLearning.next')}
          </LocalizedText>
        </Pressable>
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
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: Typography.ui.heading,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
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
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  navLabel: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default PrayerStepGuide;
