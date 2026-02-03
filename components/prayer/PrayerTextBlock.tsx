/**
 * PrayerTextBlock Component
 * Displays Arabic text with Dari/Pashto translations
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';

interface PrayerTextBlockProps {
  arabic?: string;
  translationDari?: string;
  translationPashto?: string;
  instructionDari?: string;
  instructionPashto?: string;
  showBothLanguages?: boolean;
}

export function PrayerTextBlock({
  arabic,
  translationDari,
  translationPashto,
  instructionDari,
  instructionPashto,
  showBothLanguages = true,
}: PrayerTextBlockProps) {
  const { theme } = useApp();

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      {/* Arabic Text */}
      {arabic && (
        <View style={[styles.arabicContainer, { backgroundColor: `${theme.tint}10` }]}>
          <Text style={[styles.arabicText, { color: theme.arabicText }]}>
            {arabic}
          </Text>
        </View>
      )}

      {/* Instructions */}
      {(instructionDari || instructionPashto) && (
        <View style={styles.instructionContainer}>
          {instructionDari && (
            <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
              📌 {instructionDari}
            </Text>
          )}
          {showBothLanguages && instructionPashto && (
            <Text style={[styles.instructionText, { color: theme.textSecondary, fontFamily: 'NotoNastaliqUrdu', lineHeight: 42 }]}>
              📌 {instructionPashto}
            </Text>
          )}
        </View>
      )}

      {/* Translations */}
      <View style={styles.translationsContainer}>
        {/* Dari Translation */}
        {translationDari && (
          <View style={styles.translationBlock}>
            <View style={[styles.languageTag, { backgroundColor: theme.tint }]}>
              <Text style={styles.languageTagText}>دری</Text>
            </View>
            <Text style={[styles.translationText, { color: theme.text }]}>
              {translationDari}
            </Text>
          </View>
        )}

        {/* Pashto Translation */}
        {showBothLanguages && translationPashto && (
          <View style={styles.translationBlock}>
            <View style={[styles.languageTag, { backgroundColor: '#FF7043' }]}>
              <Text style={styles.languageTagText}>پښتو</Text>
            </View>
            <Text style={[styles.translationText, { color: theme.text, fontFamily: 'NotoNastaliqUrdu', lineHeight: 42 }]}>
              {translationPashto}
            </Text>
          </View>
        )}
      </View>
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
  },
  instructionContainer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  instructionText: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: Spacing.xs,
    fontStyle: 'italic',
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
    writingDirection: 'rtl',
    lineHeight: 28,
  },
});

export default PrayerTextBlock;
