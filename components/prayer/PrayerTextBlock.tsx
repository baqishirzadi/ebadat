/**
 * PrayerTextBlock — centered Arabic and centered translation under a gold rule.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { LocalizedText } from '@/components/ui/LocalizedText';
import type { PashtoFontFamily } from '@/constants/theme';
import { BorderRadius, PashtoFonts, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { AppLanguage } from '@/types/quran';
import { resolveContent } from '@/utils/i18n/content';
import { APP_LANGUAGES } from '@/utils/i18n/languages';

interface PrayerTextBlockProps {
  arabic?: string;
  /** Record holding `<field>_dari`, `<field>_pashto`, `<field>_english`. */
  source?: object | null;
  /** Field stem for the translation, e.g. `'translation'`, `'qunoot'`. */
  translationField?: string;
  /** Field stem for the optional instruction line. */
  instructionField?: string;
}

export function PrayerTextBlock({
  arabic,
  source,
  translationField = 'translation',
  instructionField = 'instruction',
}: PrayerTextBlockProps) {
  const { theme, state } = useApp();
  const language = state.preferences.appLanguage;
  const pashtoFontFamily = PashtoFonts[state.preferences.pashtoFont as PashtoFontFamily]?.name || 'Amiri';

  const translation = resolveContent(source, translationField, language);
  const instruction = resolveContent(source, instructionField, language);

  const fontFor = (textLanguage: AppLanguage) =>
    textLanguage === 'pashto' ? { fontFamily: pashtoFontFamily, lineHeight: 42 } : null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: `${theme.accent}55`,
        },
      ]}
    >
      {arabic ? (
        <View style={styles.arabicContainer}>
          <LocalizedText
            preserveFontFamily
            style={[styles.arabicText, { color: theme.arabicText, fontFamily: 'AmiriQuran' }]}
          >
            {arabic}
          </LocalizedText>
        </View>
      ) : null}

      {(translation || instruction) && arabic ? (
        <View style={[styles.goldRule, { backgroundColor: theme.accent }]} />
      ) : null}

      {translation ? (
        <View style={styles.translationsContainer}>
          {translation.language !== language ? (
            <View style={[styles.languageTag, { borderColor: theme.accent }]}>
              <LocalizedText style={[styles.languageTagText, { color: theme.accent }]}>
                {APP_LANGUAGES[translation.language].nativeLabel}
              </LocalizedText>
            </View>
          ) : null}
          <LocalizedText
            style={[
              styles.translationText,
              { color: theme.text },
              fontFor(translation.language),
            ]}
          >
            {translation.text}
          </LocalizedText>
        </View>
      ) : null}

      {instruction ? (
        <View style={[styles.instructionContainer, { borderTopColor: theme.divider }]}>
          <LocalizedText
            style={[
              styles.instructionText,
              { color: theme.textSecondary },
              fontFor(instruction.language),
            ]}
          >
            {instruction.text}
          </LocalizedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  arabicContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  arabicText: {
    fontSize: Typography.arabic.xlarge,
    textAlign: 'center',
    lineHeight: 56,
    writingDirection: 'rtl',
    includeFontPadding: false,
  },
  goldRule: {
    height: 1.5,
    width: '36%',
    alignSelf: 'center',
    marginBottom: Spacing.md,
    opacity: 0.8,
  },
  translationsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    alignItems: 'center',
  },
  languageTag: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  languageTagText: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    textAlign: 'center',
  },
  translationText: {
    fontSize: Typography.ui.body,
    lineHeight: 30,
    textAlign: 'center',
    includeFontPadding: false,
  },
  instructionContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: Typography.ui.caption,
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'center',
    includeFontPadding: false,
  },
});

export default PrayerTextBlock;
