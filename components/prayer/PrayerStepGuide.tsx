/**
 * Step-by-step reader for wudu / ghusl / sajda sahw.
 * Shows one step at a time with optional PrayerIllustration.
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PrayerIllustration } from '@/components/prayer/PrayerIllustration';
import { LocalizedText } from '@/components/ui/LocalizedText';
import type { PashtoFontFamily } from '@/constants/theme';
import { BorderRadius, PashtoFonts, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { pickContent } from '@/utils/i18n/content';
import { backIconName, forwardChevronName, rowStyle } from '@/utils/i18n/direction';
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
  const chevron = forwardChevronName(language);
  const backIcon = backIconName(language);
  const directionalRow = rowStyle(language);
  const isRtl = language !== 'english';
  const pashtoFontFamily = PashtoFonts[state.preferences.pashtoFont as PashtoFontFamily]?.name || 'Amiri';
  const bodyFont = language === 'pashto' ? pashtoFontFamily : fontFamily;
  const titleFont = language === 'pashto' ? pashtoFontFamily : 'Vazirmatn-Bold';
  const bodyLineHeight = language === 'pashto' ? 42 : 28;

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
  const illustration = step?.illustration;
  const hasIllustration = Boolean(illustration);

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
      <LocalizedText style={[styles.progressLabel, { color: theme.accent }]}>
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

      <View style={[styles.card, { borderColor: theme.accent }]}>
        <View style={[styles.stepBadge, { backgroundColor: theme.tint }]}>
          <LocalizedText style={styles.stepBadgeText}>{stepNumber}</LocalizedText>
        </View>

        {hasIllustration ? (
          <View style={[styles.illustrationWrap, { backgroundColor: `${theme.tint}12` }]}>
            <PrayerIllustration type={illustration!} size={140} color={theme.tint} />
          </View>
        ) : null}

        {title ? (
          <LocalizedText
            preserveFontFamily
            style={[
              styles.stepTitle,
              {
                color: theme.text,
                fontFamily: titleFont,
                textAlign: isRtl ? 'right' : 'left',
                writingDirection: isRtl ? 'rtl' : 'ltr',
              },
            ]}
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
                textAlign: isRtl ? 'right' : 'left',
                writingDirection: isRtl ? 'rtl' : 'ltr',
              },
            ]}
          >
            {description}
          </LocalizedText>
        ) : null}
      </View>

      <View style={[styles.navRow, directionalRow]}>
        <Pressable
          onPress={goPrev}
          disabled={safeIndex === 0}
          style={({ pressed }) => [
            styles.navButton,
            directionalRow,
            {
              borderColor: theme.cardBorder,
              opacity: safeIndex === 0 ? 0.35 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <MaterialIcons name={backIcon} size={18} color={theme.tint} />
          <LocalizedText style={[styles.navLabel, { color: theme.tint }]}>
            {t('prayerLearning.previous')}
          </LocalizedText>
        </Pressable>

        <Pressable
          onPress={goNext}
          disabled={safeIndex >= total - 1}
          style={({ pressed }) => [
            styles.navButton,
            directionalRow,
            {
              borderColor: theme.cardBorder,
              opacity: safeIndex >= total - 1 ? 0.35 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <LocalizedText style={[styles.navLabel, { color: theme.tint }]}>
            {t('prayerLearning.next')}
          </LocalizedText>
          <MaterialIcons name={chevron} size={18} color={theme.tint} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  progressLabel: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  stepBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  stepBadgeText: {
    color: '#fff',
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
  },
  illustrationWrap: {
    width: 160,
    height: 160,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  stepTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    alignSelf: 'stretch',
  },
  stepBody: {
    fontSize: Typography.ui.body,
    alignSelf: 'stretch',
    includeFontPadding: false,
  },
  navRow: {
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  navLabel: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
  },
});

export default PrayerStepGuide;
