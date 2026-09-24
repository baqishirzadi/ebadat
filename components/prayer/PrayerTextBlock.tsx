/**
 * PrayerTextBlock Component
 * Arabic text with its translation in the reader's language.
 *
 * The block shows one translation, not a stack of every language it has. When
 * the reader's language is missing for a passage it falls back down the chain
 * and tags the block with the language actually shown, so a fallback is never
 * mistaken for a translation in the chosen language.
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
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      {arabic && (
        <View style={[styles.arabicContainer, { backgroundColor: `${theme.tint}10` }]}>
          <LocalizedText style={[styles.arabicText, { color: theme.arabicText }]}>
            {arabic}
          </LocalizedText>
        </View>
      )}

      {instruction && (
        <View style={styles.instructionContainer}>
          <LocalizedText
            style={[styles.instructionText, { color: theme.textSecondary }, fontFor(instruction.language)]}
          >
            📌 {instruction.text}
          </LocalizedText>
        </View>
      )}

      {translation && (
        <View style={styles.translationsContainer}>
          <View style={styles.translationBlock}>
            {translation.language !== language && (
              <View style={[styles.languageTag, { backgroundColor: theme.tint }]}>
                <LocalizedText style={styles.languageTagText}>
                  {APP_LANGUAGES[translation.language].nativeLabel}
                </LocalizedText>
              </View>
            )}
            <LocalizedText
              style={[styles.translationText, { color: theme.text }, fontFor(translation.language)]}
            >
              {translation.text}
            </LocalizedText>
          </View>
        </View>
      )}
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
    padding: Spacing.lg,
    alignItems: 'center',
  },
  arabicText: {
    fontSize: Typography.arabic.large,
    fontFamily: 'AmiriQuran',
    textAlign: 'center',
    lineHeight: 50,
    writingDirection: 'rtl',
    includeFontPadding: false,
  },
  instructionContainer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  instructionText: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    fontStyle: 'italic',
    includeFontPadding: false,
  },
  translationsContainer: {
    padding: Spacing.md,
  },
  translationBlock: {
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  languageTag: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  languageTagText: {
    color: '#fff',
    fontSize: Typography.ui.caption,
    fontWeight: '600',
  },
  translationText: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    lineHeight: 28,
    includeFontPadding: false,
  },
});

export default PrayerTextBlock;
