import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Hadith } from '@/types/hadith';
import { useApp } from '@/context/AppContext';
import { deriveDailyCardGradient, alphaColor } from '@/utils/ahadith/theme';
import {
  formatSourceLabel,
  getAuthenticityGradeLabel,
  getMuttafaqBadgeLabel,
} from '@/utils/ahadith/labels';
import { getHadithTranslation } from '@/utils/ahadith/translation';
import CenteredText from '@/components/CenteredText';
import { useI18n } from '@/utils/i18n/useI18n';
import { getQuranFontFamily } from '@/hooks/useFonts';

interface HadithShareCanvasProps {
  hadith: Hadith;
}

export const HadithShareCanvas = forwardRef<View, HadithShareCanvasProps>(({ hadith }, ref) => {
  const { theme, themeMode, state } = useApp();
  const { t, language, fontFamily, isRtl } = useI18n();
  const gradient = deriveDailyCardGradient(theme, themeMode);
  const translation = getHadithTranslation(hadith, language);

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
              fontFamily,
              writingDirection: isRtl ? 'rtl' : 'ltr',
            },
          ]}
        >
          {translation || t('ahadith.translation.unavailable')}
        </CenteredText>

        <CenteredText
          style={[
            styles.footer,
            {
              color: theme.textSecondary,
            },
          ]}
        >
          {formatSourceLabel(hadith.source_book, hadith.source_number, language)}
          {' · '}
          {hadith.is_muttafaq
            ? getMuttafaqBadgeLabel(language)
            : getAuthenticityGradeLabel(hadith.authenticity_grade, language)}
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
    borderRadius: 48,
    borderWidth: 4,
    paddingHorizontal: 56,
    paddingVertical: 64,
    gap: 36,
  },
  arabic: {
    fontSize: 64,
    lineHeight: 110,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  divider: {
    height: 2,
  },
  translation: {
    fontSize: 42,
    lineHeight: 68,
    textAlign: 'center',
  },
  footer: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 28,
    textAlign: 'center',
  },
});
