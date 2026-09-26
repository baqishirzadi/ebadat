import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Hadith } from '@/types/hadith';
import { useApp } from '@/context/AppContext';
import { formatSourceLabel } from '@/utils/ahadith/labels';
import { getHadithTranslation } from '@/utils/ahadith/translation';
import CenteredText from '@/components/CenteredText';
import { alphaColor } from '@/utils/ahadith/theme';
import { useI18n } from '@/utils/i18n/useI18n';
import { getQuranFontFamily } from '@/hooks/useFonts';

interface MuttafaqListProps {
  items: Hadith[];
  onOpen: (hadith: Hadith) => void;
}

export function MuttafaqList({ items, onOpen }: MuttafaqListProps) {
  const { theme, state } = useApp();
  const { t, language, fontFamily, isRtl } = useI18n();

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
                fontFamily,
                writingDirection: isRtl ? 'rtl' : 'ltr',
              },
            ]}
          >
            {getHadithTranslation(item, language) || t('ahadith.translation.unavailable')}
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
  },
  source: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 12,
    textAlign: 'center',
  },
  empty: {
    fontFamily: 'Vazirmatn',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
