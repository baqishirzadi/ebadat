import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Hadith } from '@/types/hadith';
import { useApp } from '@/context/AppContext';
import { formatSourceLabel } from '@/utils/ahadith/labels';
import { getHadithTranslation } from '@/utils/ahadith/translation';
import CenteredText from '@/components/CenteredText';
import { alphaColor } from '@/utils/ahadith/theme';
import { useI18n } from '@/utils/i18n/useI18n';
import { getQuranFontFamily, getDariFontFamily, getPashtoFontFamily } from '@/hooks/useFonts';

interface MuttafaqListProps {
  items: Hadith[];
  onOpen: (hadith: Hadith) => void;
}

export function MuttafaqList({ items, onOpen }: MuttafaqListProps) {
  const { theme, state } = useApp();
  const { t, language } = useI18n();
  const isPashto = language === 'pashto';

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onOpen(item)}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: alphaColor(theme.primary, 0.2),
            },
            pressed && { opacity: 0.9 },
          ]}
        >
          <CenteredText
            numberOfLines={3}
            style={[
              styles.arabic,
              {
                color: theme.textPrimary,
                fontFamily: getQuranFontFamily(state.preferences.quranFont),
              },
            ]}
          >
            {item.arabic_text}
          </CenteredText>

          <CenteredText
            numberOfLines={2}
            style={[
              styles.translation,
              {
                color: theme.textSecondary,
                fontFamily: isPashto ? getPashtoFontFamily(state.preferences.pashtoFont) : getDariFontFamily(state.preferences.dariFont),
              },
            ]}
          >
            {getHadithTranslation(item, language)}
          </CenteredText>

          <CenteredText style={[styles.source, { color: theme.primary }]}>
            {formatSourceLabel(item.source_book, item.source_number, language)}
          </CenteredText>
        </Pressable>
      )}
      ListEmptyComponent={
        <CenteredText style={[styles.empty, { color: theme.textSecondary }]}>{t('ahadith.muttafaq.empty')}</CenteredText>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  arabic: {
    fontSize: 24,
    lineHeight: 46,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  translation: {
    fontSize: 15,
    lineHeight: 26,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  source: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 12,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  empty: {
    fontFamily: 'Vazirmatn',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
