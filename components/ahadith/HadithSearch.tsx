import React from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Hadith } from '@/types/hadith';
import { useApp } from '@/context/AppContext';
import { alphaColor } from '@/utils/ahadith/theme';
import { getDariFontFamily, getQuranFontFamily } from '@/hooks/useFonts';
import CenteredText from '@/components/CenteredText';

interface HadithSearchProps {
  query: string;
  results: Hadith[];
  onChangeQuery: (query: string) => void;
  onOpenHadith: (hadith: Hadith) => void;
}

export function HadithSearch({ query, results, onChangeQuery, onOpenHadith }: HadithSearchProps) {
  const { theme, state } = useApp();

  return (
    <View style={styles.container}>
      <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: alphaColor(theme.primary, 0.2) }]}> 
        <MaterialIcons name="search" size={20} color={theme.primary} />
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="جستجو در عربی، دری و پشتو"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.textPrimary, fontFamily: getDariFontFamily(state.preferences.dariFont) }]}
          textAlign="right"
          accessibilityLabel="Search hadith"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => onChangeQuery('')} accessibilityLabel="Clear search">
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
                  fontFamily: getDariFontFamily(state.preferences.dariFont),
                },
              ]}
            >
              {item.dari_translation}
            </CenteredText>
            <CenteredText style={[styles.meta, { color: theme.primary }]}>
              {`Sahih ${item.source_book} ${item.source_number}`}
            </CenteredText>
          </Pressable>
        )}
        ListEmptyComponent={
          query.trim().length >= 2 ? (
            <CenteredText style={[styles.empty, { color: theme.textSecondary }]}>نتیجه‌ای یافت نشد</CenteredText>
          ) : (
            <CenteredText style={[styles.empty, { color: theme.textSecondary }]}>عبارت جستجو را وارد کنید</CenteredText>
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
    textAlign: 'right',
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
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  translation: {
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  meta: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 12,
    textAlign: 'left',
  },
  empty: {
    fontFamily: 'Vazirmatn',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
