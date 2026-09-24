import React from 'react';

import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { LocalizedTextInput } from '@/components/ui/LocalizedText';
import { MaterialIcons } from '@expo/vector-icons';
import { Hadith } from '@/types/hadith';
import { useApp } from '@/context/AppContext';
import { alphaColor } from '@/utils/ahadith/theme';
import { formatSourceLabel } from '@/utils/ahadith/labels';
import { getHadithTranslation } from '@/utils/ahadith/translation';
import { getDariFontFamily, getPashtoFontFamily, getQuranFontFamily } from '@/hooks/useFonts';
import { useI18n } from '@/utils/i18n/useI18n';
import CenteredText from '@/components/CenteredText';

interface HadithSearchProps {
  query: string;
  results: Hadith[];
  onChangeQuery: (query: string) => void;
  onOpenHadith: (hadith: Hadith) => void;
}

export function HadithSearch({ query, results, onChangeQuery, onOpenHadith }: HadithSearchProps) {
  const { theme, state } = useApp();
  const { t, language } = useI18n();
  const isPashto = language === 'pashto';

  return (
    <View style={styles.container}>
      <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: alphaColor(theme.primary, 0.2) }]}> 
        <MaterialIcons name="search" size={20} color={theme.primary} />
        <LocalizedTextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder={t('ahadith.search.placeholder')}
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.textPrimary, fontFamily: language === 'english' ? undefined : isPashto ? getPashtoFontFamily(state.preferences.pashtoFont) : getDariFontFamily(state.preferences.dariFont) }]}
          textAlign="center"
          accessibilityLabel={t('ahadith.search.label')}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => onChangeQuery('')} accessibilityLabel={t('ahadith.search.clear')}>
            <MaterialIcons name="close" size={20} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onOpenHadith(item)}
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
              numberOfLines={2}
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
            <CenteredText style={[styles.meta, { color: theme.primary }]}>
              {formatSourceLabel(item.source_book, item.source_number, language)}
            </CenteredText>
          </Pressable>
        )}
        ListEmptyComponent={
          query.trim().length >= 2 ? (
            <CenteredText style={[styles.empty, { color: theme.textSecondary }]}>{t('common.noResults')}</CenteredText>
          ) : (
            <CenteredText style={[styles.empty, { color: theme.textSecondary }]}>{t('ahadith.search.prompt')}</CenteredText>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 10,
  },
  searchBox: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  arabic: {
    fontSize: 22,
    lineHeight: 42,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  translation: {
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  meta: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 12,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  empty: {
    fontFamily: 'Vazirmatn',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
