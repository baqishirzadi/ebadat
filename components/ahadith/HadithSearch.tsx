import React from 'react';

import { FlatList, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { LocalizedTextInput } from '@/components/ui/LocalizedText';
import { MaterialIcons } from '@expo/vector-icons';
import { Hadith } from '@/types/hadith';
import { useApp } from '@/context/AppContext';
import { alphaColor } from '@/utils/ahadith/theme';
import { useI18n } from '@/utils/i18n/useI18n';
import CenteredText from '@/components/CenteredText';
import { HadithListCard } from '@/components/ahadith/HadithListCard';

interface HadithSearchProps {
  query: string;
  results: Hadith[];
  onChangeQuery: (query: string) => void;
  onOpenHadith: (hadith: Hadith) => void;
}

export function HadithSearch({ query, results, onChangeQuery, onOpenHadith }: HadithSearchProps) {
  const { theme } = useApp();
  const { t, n, language, fontFamily, isRtl } = useI18n();
  const hasQuery = query.trim().length >= 2;

  return (
    <View style={styles.container}>
      <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: alphaColor(theme.primary, 0.24) }]}>
        <MaterialIcons name="search" size={22} color={theme.primary} />
        <LocalizedTextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder={t('ahadith.search.placeholder')}
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.textPrimary, fontFamily: language === 'english' ? undefined : fontFamily }]}
          textAlign={isRtl ? 'right' : 'left'}
          returnKeyType="search"
          onSubmitEditing={() => Keyboard.dismiss()}
          accessibilityLabel={t('ahadith.search.label')}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => onChangeQuery('')} hitSlop={8} accessibilityLabel={t('ahadith.search.clear')}>
            <MaterialIcons name="close" size={20} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          hasQuery && results.length > 0 ? (
            <CenteredText style={[styles.count, { color: theme.textSecondary }]}>
              {`${t('hadith.title')}: ${n(results.length)}`}
            </CenteredText>
          ) : null
        }
        renderItem={({ item }) => <HadithListCard hadith={item} onPress={onOpenHadith} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialIcons
              name={hasQuery ? 'search-off' : 'manage-search'}
              size={48}
              color={alphaColor(theme.textSecondary, 0.6)}
            />
            <CenteredText style={[styles.empty, { color: theme.textSecondary }]}>
              {hasQuery ? t('common.noResults') : t('ahadith.search.prompt')}
            </CenteredText>
          </View>
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
    borderRadius: 16,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
  separator: {
    height: 10,
  },
  listContent: {
    paddingBottom: 28,
    flexGrow: 1,
  },
  count: {
    fontFamily: 'Vazirmatn',
    fontSize: 12,
    marginBottom: 8,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 10,
  },
  empty: {
    fontFamily: 'Vazirmatn',
    fontSize: 14,
    textAlign: 'center',
  },
});
