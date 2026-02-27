import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Hadith } from '@/types/hadith';
import { useApp } from '@/context/AppContext';
import { deriveDailyCardGradient, alphaColor } from '@/utils/ahadith/theme';
import { formatSourceLabel } from '@/utils/ahadith/labels';
import CenteredText from '@/components/CenteredText';
import { getQuranFontFamily, getDariFontFamily, getPashtoFontFamily } from '@/hooks/useFonts';

interface HadithShareCanvasProps {
  hadith: Hadith;
}

export const HadithShareCanvas = forwardRef<View, HadithShareCanvasProps>(({ hadith }, ref) => {
  const { theme, themeMode, state } = useApp();
  const gradient = deriveDailyCardGradient(theme, themeMode);

  return (
    <View ref={ref} style={[styles.root, { backgroundColor: theme.background }]}> 
      <LinearGradient colors={gradient} style={[styles.card, { borderColor: alphaColor(theme.primary, 0.4) }]}> 
        <CenteredText
          style={[
            styles.arabic,
            {
              color: theme.surface,
              fontFamily: getQuranFontFamily(state.preferences.quranFont),
            },
          ]}
        >
          {hadith.arabic_text}
        </CenteredText>

        <View style={[styles.divider, { backgroundColor: alphaColor(theme.textSecondary, 0.3) }]} />

        <CenteredText
          style={[
            styles.translation,
            {
              color: theme.textPrimary,
              fontFamily: getDariFontFamily(state.preferences.dariFont),
            },
          ]}
        >
          {hadith.dari_translation}
        </CenteredText>

        <CenteredText
          style={[
            styles.footer,
            {
              color: theme.textSecondary,
              fontFamily: getPashtoFontFamily(state.preferences.pashtoFont),
            },
          ]}
        >
          {formatSourceLabel(hadith.source_book, hadith.source_number)}
        </CenteredText>
      </LinearGradient>
    </View>
  );
});

HadithShareCanvas.displayName = 'HadithShareCanvas';

const styles = StyleSheet.create({
  root: {
    width: 1080,
    padding: 48,
  },
  card: {
    borderRadius: 36,
    borderWidth: 1,
    paddingHorizontal: 42,
    paddingVertical: 40,
  },
  arabic: {
    fontSize: 56,
    lineHeight: 92,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  divider: {
    height: 1,
    marginVertical: 26,
  },
  translation: {
    fontSize: 34,
    lineHeight: 56,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  footer: {
    marginTop: 30,
    textAlign: 'center',
    fontSize: 28,
  },
});
