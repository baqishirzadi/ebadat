import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Hadith } from '@/types/hadith';
import { useApp } from '@/context/AppContext';
import { alphaColor } from '@/utils/ahadith/theme';
import { formatSourceLabel, getAuthenticityGradeLabel, getMuttafaqBadgeLabel } from '@/utils/ahadith/labels';
import { getHadithTranslation } from '@/utils/ahadith/translation';
import { forwardChevronName } from '@/utils/i18n/direction';
import { useI18n } from '@/utils/i18n/useI18n';
import { getQuranFontFamily } from '@/hooks/useFonts';
import CenteredText from '@/components/CenteredText';

interface HadithListCardProps {
  hadith: Hadith;
  onPress: (hadith: Hadith) => void;
}

export function HadithListCard({ hadith, onPress }: HadithListCardProps) {
  const { theme, state } = useApp();
  const { t, language, fontFamily, isRtl, digits } = useI18n();
  const nastaliq = fontFamily === 'NotoNastaliqUrdu';
  const gradeLabel = hadith.is_muttafaq
    ? getMuttafaqBadgeLabel(language)
    : getAuthenticityGradeLabel(hadith.authenticity_grade, language);

  return (
    <Pressable
      onPress={() => onPress(hadith)}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: alphaColor(theme.primary, 0.18),
          shadowColor: theme.textPrimary,
        },
        pressed && { opacity: 0.88 },
      ]}
    >
      <CenteredText
        numberOfLines={3}
        style={[
          styles.arabic,
          { color: theme.textPrimary, fontFamily: getQuranFontFamily(state.preferences.quranFont) },
        ]}
      >
        {hadith.arabic_text}
      </CenteredText>

      <CenteredText
        numberOfLines={3}
        style={[
          styles.translation,
          {
            color: theme.textSecondary,
            fontFamily,
            writingDirection: isRtl ? 'rtl' : 'ltr',
            lineHeight: nastaliq ? 38 : 25,
          },
        ]}
      >
        {getHadithTranslation(hadith, language) || t('ahadith.translation.unavailable')}
      </CenteredText>

      <View style={[styles.footer, { borderTopColor: alphaColor(theme.textSecondary, 0.16) }]}>
        <View
          style={[
            styles.gradeChip,
            {
              backgroundColor: alphaColor(hadith.is_muttafaq ? theme.accent : theme.primary, 0.12),
              borderColor: alphaColor(hadith.is_muttafaq ? theme.accent : theme.primary, 0.3),
            },
          ]}
        >
          <CenteredText style={[styles.gradeText, { color: theme.primary, lineHeight: nastaliq ? 26 : 16 }]}>
            {gradeLabel}
          </CenteredText>
        </View>
        <CenteredText
          numberOfLines={1}
          style={[styles.source, { color: theme.primary, lineHeight: nastaliq ? 30 : 20 }]}
        >
          {digits(formatSourceLabel(hadith.source_book, hadith.source_number, language))}
        </CenteredText>
        <View style={styles.iconLtr}>
          <MaterialIcons name={forwardChevronName(language)} size={22} color={theme.textSecondary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 8,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  arabic: {
    fontSize: 23,
    lineHeight: 44,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  translation: {
    fontSize: 15,
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gradeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  gradeText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 11,
  },
  source: {
    flex: 1,
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 13,
  },
  iconLtr: {
    direction: 'ltr',
  },
});
