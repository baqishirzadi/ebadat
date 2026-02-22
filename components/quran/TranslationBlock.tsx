/**
 * TranslationBlock Component
 * Displays translation text for an ayah with language indicator
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useApp } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

interface TranslationBlockProps {
  text: string;
  language: 'dari' | 'pashto';
  showLabel?: boolean;
}

export const TranslationBlock = memo(function TranslationBlock({
  text,
  language,
  showLabel = true,
}: TranslationBlockProps) {
  const { theme, state } = useApp();
  const { translationFontSize } = state.preferences;

  const languageLabels = {
    dari: { name: 'دری', flag: '🇦🇫' },
    pashto: { name: 'پښتو', flag: '🇦🇫' },
  };

  return (
    <View style={[styles.container, { backgroundColor: `${theme.backgroundSecondary}80` }]}>
      {showLabel && (
        <View style={[styles.labelContainer, { borderBottomColor: theme.divider }]}>
          <CenteredText style={[styles.labelText, { color: theme.textSecondary }]}>
            {languageLabels[language].name}
          </CenteredText>
          <View style={[styles.languageBadge, { backgroundColor: theme.tint }]}>
            <CenteredText style={styles.languageBadgeText}>
              {language === 'dari' ? 'DR' : 'PS'}
            </CenteredText>
          </View>
        </View>
      )}
      <CenteredText
        style={[
          styles.translationText,
          {
            color: theme.translationText,
            fontSize: Typography.translation[translationFontSize],
          },
        ]}
      >
        {text}
      </CenteredText>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginVertical: Spacing.xs,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  labelText: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    marginRight: Spacing.sm,
  },
  languageBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  languageBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  translationText: {
lineHeight: 28,
    writingDirection: 'rtl',
    padding: Spacing.md,
  },
});
