/**
 * Search Screen
 * Search Quran Arabic text and translations
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, TextInput, FlatList, Pressable, ActivityIndicator, Keyboard } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useQuranData } from '@/hooks/useQuranData';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { SearchResult } from '@/types/quran';
import CenteredText from '@/components/CenteredText';
import { toArabicNumerals } from '@/utils/numbers';

type SearchMode = 'arabic' | 'translation';

export default function SearchScreen() {
  const { theme } = useApp();
  const { searchArabic, searchTranslation } = useQuranData();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('arabic');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback((text: string) => {
    if (!text.trim() || text.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const searchResults =
      searchMode === 'arabic'
        ? searchArabic(text, 100)
        : searchTranslation(text, 'both', 100);

    setResults(searchResults);
    setIsSearching(false);
  }, [searchMode, searchArabic, searchTranslation]);

  // Perform search with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, 350);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, runSearch]);

  // Manual search (submit button)
  const handleSearch = useCallback(() => {
    Keyboard.dismiss();
    runSearch(query);
  }, [runSearch, query]);

  // Navigate to result
  const handleResultPress = useCallback(
    (result: SearchResult) => {
      router.push(`/quran/${result.surahNumber}?ayah=${result.ayahNumber}`);
    },
    [router]
  );

  // Render search result
  const renderResult = useCallback(
    ({ item }: { item: SearchResult }) => (
      <Pressable
        onPress={() => handleResultPress(item)}
        style={({ pressed }) => [
          styles.resultItem,
          { backgroundColor: theme.card, borderColor: theme.cardBorder },
          pressed && styles.resultItemPressed,
        ]}
      >
        <View style={styles.resultHeader}>
          <CenteredText style={[styles.surahName, { color: theme.text }]}>
            {item.surahName}
          </CenteredText>
          <View style={[styles.ayahBadge, { backgroundColor: theme.ayahNumber }]}>
            <CenteredText style={styles.ayahBadgeText}>
              {toArabicNumerals(item.ayahNumber)}
            </CenteredText>
          </View>
        </View>

        <CenteredText
          style={[styles.arabicText, { color: theme.arabicText }]}
          numberOfLines={2}
        >
          {item.text}
        </CenteredText>

        {item.translation && (
          <View style={styles.translationContainer}>
            {item.translation.dari && (
              <CenteredText
                style={[styles.translationText, { color: theme.translationText }]}
                numberOfLines={2}
              >
                {item.translation.dari}
              </CenteredText>
            )}
          </View>
        )}

        <View style={styles.resultFooter}>
          <CenteredText style={[styles.surahNumber, { color: theme.textSecondary }]}>
            سوره {toArabicNumerals(item.surahNumber)}
          </CenteredText>
          <MaterialIcons name="chevron-left" size={20} color={theme.icon} />
        </View>
      </Pressable>
    ),
    [theme, handleResultPress]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'جستجو',
          headerStyle: { backgroundColor: theme.surahHeader, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />

      {/* Search Header */}
      <View style={[styles.searchHeader, { backgroundColor: theme.backgroundSecondary }]}>
        {/* Search Input */}
        <View style={[styles.searchInputContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <MaterialIcons name="search" size={22} color={theme.icon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={searchMode === 'arabic' ? 'جستجو در متن عربی...' : 'جستجو در ترجمه...'}
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            textAlign="right"
            autoFocus
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <MaterialIcons name="close" size={20} color={theme.icon} />
            </Pressable>
          )}
        </View>

        {/* Search Mode Toggle */}
        <View style={styles.modeToggle}>
          <Pressable
            onPress={() => setSearchMode('arabic')}
            style={[
              styles.modeButton,
              {
                backgroundColor: searchMode === 'arabic' ? theme.tint : theme.card,
                borderColor: searchMode === 'arabic' ? theme.tint : theme.cardBorder,
              },
            ]}
          >
            <CenteredText
              style={[
                styles.modeButtonText,
                { color: searchMode === 'arabic' ? '#fff' : theme.text },
              ]}
            >
              متن عربی
            </CenteredText>
          </Pressable>
          <Pressable
            onPress={() => setSearchMode('translation')}
            style={[
              styles.modeButton,
              {
                backgroundColor: searchMode === 'translation' ? theme.tint : theme.card,
                borderColor: searchMode === 'translation' ? theme.tint : theme.cardBorder,
              },
            ]}
          >
            <CenteredText
              style={[
                styles.modeButtonText,
                { color: searchMode === 'translation' ? '#fff' : theme.text },
              ]}
            >
              ترجمه
            </CenteredText>
          </Pressable>
        </View>

        {/* Search Button */}
        <Pressable
          onPress={handleSearch}
          disabled={query.length < 2}
          style={({ pressed }) => [
            styles.searchButton,
            { backgroundColor: query.length >= 2 ? theme.tint : theme.cardBorder },
            pressed && styles.searchButtonPressed,
          ]}
        >
          <MaterialIcons name="search" size={22} color="#fff" />
          <CenteredText style={styles.searchButtonText}>جستجو</CenteredText>
        </Pressable>
      </View>

      {/* Results */}
      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <CenteredText style={[styles.loadingText, { color: theme.textSecondary }]}>
            در حال جستجو...
          </CenteredText>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.surahNumber}-${item.ayahNumber}`}
          renderItem={renderResult}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <CenteredText style={[styles.resultsCount, { color: theme.textSecondary }]}>
              {toArabicNumerals(results.length)} نتیجه یافت شد
            </CenteredText>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : query.length >= 2 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="search-off" size={64} color={theme.textSecondary} />
          <CenteredText style={[styles.emptyTitle, { color: theme.text }]}>
            نتیجه‌ای یافت نشد
          </CenteredText>
          <CenteredText style={[styles.emptyText, { color: theme.textSecondary }]}>
            عبارت دیگری را امتحان کنید
          </CenteredText>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="search" size={64} color={theme.textSecondary} />
          <CenteredText style={[styles.emptyTitle, { color: theme.text }]}>
            جستجو در قرآن
          </CenteredText>
          <CenteredText style={[styles.emptyText, { color: theme.textSecondary }]}>
            حداقل ۲ حرف وارد کنید و جستجو کنید
          </CenteredText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchHeader: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.ui.body,
    paddingVertical: Spacing.xs,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: Typography.ui.body,
    fontWeight: '500',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  searchButtonPressed: {
    opacity: 0.8,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: Typography.ui.body,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.ui.body,
  },
  resultsContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  resultsCount: {
    fontSize: Typography.ui.caption,
marginBottom: Spacing.md,
  },
  separator: {
    height: Spacing.sm,
  },
  resultItem: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  resultItemPressed: {
    opacity: 0.9,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  surahName: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    fontFamily: 'serif',
  },
  ayahBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ayahBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  arabicText: {
    fontSize: Typography.arabic.small,
lineHeight: 32,
    fontFamily: 'serif',
  },
  translationContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  translationText: {
    fontSize: Typography.translation.medium,
lineHeight: 24,
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  surahNumber: {
    fontSize: Typography.ui.caption,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.ui.title,
    fontWeight: '600',
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
