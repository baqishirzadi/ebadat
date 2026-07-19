/**
 * Search Screen
 * Disk-backed Quran search: Arabic, Dari, Pashto
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Keyboard,
  Text,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useQuranData } from '@/hooks/useQuranData';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { SearchResult } from '@/types/quran';
import CenteredText from '@/components/CenteredText';
import { toArabicNumerals } from '@/utils/numbers';
import { stripQuranicMarks } from '@/utils/quranText';
import type { QuranSearchMode } from '@/utils/quranSearchEngine';

const PAGE_SIZE = 25;

const MODE_OPTIONS: Array<{ id: QuranSearchMode; label: string }> = [
  { id: 'arabic', label: 'عربی' },
  { id: 'dari', label: 'دری' },
  { id: 'pashto', label: 'پښتو' },
  { id: 'all', label: 'همه' },
];

function parseMode(value?: string | string[]): QuranSearchMode | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'arabic' || raw === 'dari' || raw === 'pashto' || raw === 'all') {
    return raw;
  }
  return null;
}

function languageLabel(language?: SearchResult['matchedLanguage']): string {
  switch (language) {
    case 'arabic':
      return 'عربی';
    case 'dari':
      return 'دری';
    case 'pashto':
      return 'پښتو';
    default:
      return '';
  }
}

function HighlightedText({
  text,
  query,
  style,
  numberOfLines,
}: {
  text: string;
  query: string;
  style: any;
  numberOfLines?: number;
}) {
  const needle = query.trim();
  if (!needle || needle.length < 2) {
    return (
      <CenteredText style={style} numberOfLines={numberOfLines}>
        {text}
      </CenteredText>
    );
  }

  // Best-effort visual highlight: wrap first occurrence ignoring diacritics loosely via plain includes.
  const lowerText = text;
  const idx = lowerText.indexOf(needle);
  if (idx < 0) {
    return (
      <CenteredText style={style} numberOfLines={numberOfLines}>
        {text}
      </CenteredText>
    );
  }

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + needle.length);
  const after = text.slice(idx + needle.length);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {before}
      <Text style={[style, styles.highlight]}>{match}</Text>
      {after}
    </Text>
  );
}

export default function SearchScreen() {
  const { theme } = useApp();
  const { searchQuran } = useQuranData();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string | string[]; mode?: string | string[] }>();
  const initialQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const initialMode = parseMode(params.mode) || 'arabic';

  const [query, setQuery] = useState(initialQuery || '');
  const [searchMode, setSearchMode] = useState<QuranSearchMode>(initialMode);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationGuardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearchRequestIdRef = useRef(0);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    const nextQuery = Array.isArray(params.q) ? params.q[0] : params.q;
    const nextMode = parseMode(params.mode);
    if (typeof nextQuery === 'string' && nextQuery.length > 0) {
      setQuery(nextQuery);
    }
    if (nextMode) {
      setSearchMode(nextMode);
    }
  }, [params.q, params.mode]);

  const runSearch = useCallback(
    (text: string, offset = 0, append = false) => {
      const requestId = ++latestSearchRequestIdRef.current;

      if (!text.trim() || text.length < 2) {
        setResults([]);
        setTotal(0);
        setHasMore(false);
        setIsSearching(false);
        setIsLoadingMore(false);
        setError(null);
        return;
      }

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsSearching(true);
        setResults([]);
        setError(null);
      }

      void (async () => {
        try {
          const page = await searchQuran(text, searchMode, PAGE_SIZE, offset);
          if (requestId !== latestSearchRequestIdRef.current) {
            return;
          }

          setResults((prev) => (append ? [...prev, ...page.results] : page.results));
          setTotal(page.total);
          setHasMore(page.hasMore);
          setError(null);
        } catch (err) {
          if (requestId !== latestSearchRequestIdRef.current) {
            return;
          }
          setError('جستجو انجام نشد. دوباره تلاش کنید.');
          if (!append) {
            setResults([]);
            setTotal(0);
            setHasMore(false);
          }
          console.warn('Quran search failed:', err);
        } finally {
          if (requestId === latestSearchRequestIdRef.current) {
            setIsSearching(false);
            setIsLoadingMore(false);
          }
        }
      })();
    },
    [searchMode, searchQuran],
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (!query.trim() || query.length < 2) {
      latestSearchRequestIdRef.current += 1;
      setResults([]);
      setTotal(0);
      setHasMore(false);
      setIsSearching(false);
      setError(null);
      return;
    }

    setIsSearching(true);
    setResults([]);
    debounceRef.current = setTimeout(() => {
      runSearch(query, 0, false);
    }, 350);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, runSearch]);

  const handleSearch = useCallback(() => {
    Keyboard.dismiss();
    runSearch(query, 0, false);
  }, [runSearch, query]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isSearching || isLoadingMore || query.length < 2) return;
    runSearch(query, results.length, true);
  }, [hasMore, isSearching, isLoadingMore, query, results.length, runSearch]);

  const handleResultPress = useCallback(
    (result: SearchResult) => {
      if (isNavigatingRef.current) {
        return;
      }

      isNavigatingRef.current = true;
      if (navigationGuardTimerRef.current) {
        clearTimeout(navigationGuardTimerRef.current);
      }
      navigationGuardTimerRef.current = setTimeout(() => {
        isNavigatingRef.current = false;
        navigationGuardTimerRef.current = null;
      }, 600);

      const jumpToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      router.push({
        pathname: '/quran/[surah]',
        params: {
          surah: String(result.surahNumber),
          ayah: String(result.ayahNumber),
          jump: 'search_exact',
          jumpToken,
          from: 'search',
          q: query,
          lang: result.matchedLanguage || searchMode,
        },
      });
    },
    [router, query, searchMode],
  );

  useEffect(() => {
    return () => {
      if (navigationGuardTimerRef.current) {
        clearTimeout(navigationGuardTimerRef.current);
      }
    };
  }, []);

  const renderResult = useCallback(
    ({ item }: { item: SearchResult }) => {
      const matchedSnippet =
        item.matchedLanguage === 'dari'
          ? item.translation?.dari || item.snippet || ''
          : item.matchedLanguage === 'pashto'
            ? item.translation?.pashto || item.snippet || ''
            : stripQuranicMarks(item.text);

      return (
        <Pressable
          onPress={() => handleResultPress(item)}
          accessibilityRole="button"
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
            <View style={styles.headerBadges}>
              {!!item.matchedLanguage && (
                <View style={[styles.langBadge, { backgroundColor: theme.tint }]}>
                  <CenteredText style={styles.langBadgeText}>
                    {languageLabel(item.matchedLanguage)}
                  </CenteredText>
                </View>
              )}
              <View style={[styles.ayahBadge, { backgroundColor: theme.ayahNumber }]}>
                <CenteredText style={styles.ayahBadgeText}>
                  {toArabicNumerals(item.ayahNumber)}
                </CenteredText>
              </View>
            </View>
          </View>

          <HighlightedText
            text={
              item.matchedLanguage === 'arabic'
                ? stripQuranicMarks(item.text)
                : stripQuranicMarks(item.text)
            }
            query={item.matchedLanguage === 'arabic' ? query : ''}
            style={[styles.arabicText, { color: theme.arabicText }]}
            numberOfLines={2}
          />

          {item.matchedLanguage !== 'arabic' && !!matchedSnippet && (
            <View style={styles.translationContainer}>
              <HighlightedText
                text={matchedSnippet}
                query={query}
                style={[styles.translationText, { color: theme.translationText }]}
                numberOfLines={3}
              />
            </View>
          )}

          <View style={styles.resultFooter}>
            <CenteredText style={[styles.surahNumber, { color: theme.textSecondary }]}>
              سوره {toArabicNumerals(item.surahNumber)}
            </CenteredText>
            <MaterialIcons name="chevron-left" size={20} color={theme.icon} />
          </View>
        </Pressable>
      );
    },
    [theme, handleResultPress, query],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'جستجو',
          headerStyle: { backgroundColor: theme.surahHeader },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />

      <View style={[styles.searchHeader, { backgroundColor: theme.backgroundSecondary }]}>
        <View
          style={[
            styles.searchInputContainer,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
          ]}
        >
          <MaterialIcons name="search" size={22} color={theme.icon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={
              searchMode === 'arabic'
                ? 'جستجو در متن عربی...'
                : searchMode === 'dari'
                  ? 'جستجو در ترجمه دری...'
                  : searchMode === 'pashto'
                    ? 'د پښتو ژباړې لټون...'
                    : 'جستجو در عربی و ترجمه‌ها...'
            }
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

        <View style={styles.modeToggle}>
          {MODE_OPTIONS.map((option) => {
            const active = searchMode === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setSearchMode(option.id)}
                style={[
                  styles.modeButton,
                  {
                    backgroundColor: active ? theme.tint : theme.card,
                    borderColor: active ? theme.tint : theme.cardBorder,
                  },
                ]}
              >
                <CenteredText
                  style={[styles.modeButtonText, { color: active ? '#fff' : theme.text }]}
                >
                  {option.label}
                </CenteredText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="error-outline" size={64} color={theme.textSecondary} />
          <CenteredText style={[styles.emptyTitle, { color: theme.text }]}>{error}</CenteredText>
          <Pressable
            onPress={() => runSearch(query, 0, false)}
            style={[styles.retryButton, { backgroundColor: theme.tint }]}
          >
            <CenteredText style={styles.retryButtonText}>تلاش دوباره</CenteredText>
          </Pressable>
        </View>
      ) : isSearching && results.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <CenteredText style={[styles.loadingText, { color: theme.textSecondary }]}>
            در حال جستجو...
          </CenteredText>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item, index) =>
            `${item.surahNumber}-${item.ayahNumber}-${item.matchedLanguage || 'x'}-${index}`
          }
          renderItem={renderResult}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={7}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <CenteredText style={[styles.resultsCount, { color: theme.textSecondary }]}>
              {toArabicNumerals(total)} نتیجه یافت شد
            </CenteredText>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator style={{ marginVertical: Spacing.md }} color={theme.tint} />
            ) : null
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
            عربی، دری یا پښتو — حداقل ۲ حرف وارد کنید
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
    gap: Spacing.xs,
  },
  modeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: Typography.ui.caption,
    fontWeight: '500',
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
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
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
  langBadge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  langBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  arabicText: {
    fontSize: Typography.arabic.small,
    lineHeight: 32,
    fontFamily: 'serif',
  },
  highlight: {
    backgroundColor: 'rgba(212, 175, 55, 0.35)',
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
  retryButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
