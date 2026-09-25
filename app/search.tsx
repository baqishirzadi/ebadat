/**
 * Search Screen
 * Disk-backed Quran search: Arabic, Dari, Pashto, English
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';

import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Keyboard } from 'react-native';
import { LocalizedText, LocalizedTextInput } from '@/components/ui/LocalizedText';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useQuranData } from '@/hooks/useQuranData';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { SearchResult } from '@/types/quran';
import CenteredText from '@/components/CenteredText';
import { stripQuranicMarks } from '@/utils/quranText';
import type { QuranSearchMode } from '@/utils/quranSearchEngine';
import { useI18n } from '@/utils/i18n/useI18n';
import { forwardChevronName } from '@/utils/i18n/direction';
import type { UiMessageKey } from '@/utils/i18n/catalog';

const PAGE_SIZE = 25;

const MODE_IDS: QuranSearchMode[] = ['arabic', 'dari', 'pashto', 'english', 'all'];

const MODE_LABEL_KEYS: Record<QuranSearchMode, UiMessageKey> = {
  arabic: 'quran.search.mode.arabic',
  dari: 'quran.search.mode.dari',
  pashto: 'quran.search.mode.pashto',
  english: 'quran.search.mode.english',
  all: 'quran.search.mode.all',
};

const PLACEHOLDER_KEYS: Record<QuranSearchMode, UiMessageKey> = {
  arabic: 'quran.search.placeholder.arabic',
  dari: 'quran.search.placeholder.dari',
  pashto: 'quran.search.placeholder.pashto',
  english: 'quran.search.placeholder.english',
  all: 'quran.search.placeholder.all',
};

function parseMode(value?: string | string[]): QuranSearchMode | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'arabic' || raw === 'dari' || raw === 'pashto' || raw === 'english' || raw === 'all') {
    return raw;
  }
  return null;
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
  const idx = lowerText.toLowerCase().indexOf(needle.toLowerCase());
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
    <LocalizedText style={style} numberOfLines={numberOfLines}>
      {before}
      <LocalizedText style={[style, styles.highlight]}>{match}</LocalizedText>
      {after}
    </LocalizedText>
  );
}

export default function SearchScreen() {
  const { theme } = useApp();
  const { searchQuran } = useQuranData();
  const { t, language, n } = useI18n();
  const isEnglishUi = language === 'english';
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string | string[]; mode?: string | string[] }>();
  const initialQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const initialMode = parseMode(params.mode) || (isEnglishUi ? 'english' : 'arabic');

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

  const modeOptions = useMemo(
    () =>
      MODE_IDS.map((id) => ({
        id,
        label: t(MODE_LABEL_KEYS[id]),
      })),
    [t],
  );

  const languageLabel = useCallback(
    (matched?: SearchResult['matchedLanguage']): string => {
      switch (matched) {
        case 'arabic':
          return t('quran.search.mode.arabic');
        case 'dari':
          return t('quran.search.mode.dari');
        case 'pashto':
          return t('quran.search.mode.pashto');
        case 'english':
          return t('quran.search.mode.english');
        default:
          return '';
      }
    },
    [t],
  );

  const placeholder = useMemo(
    () => t(PLACEHOLDER_KEYS[searchMode]),
    [searchMode, t],
  );

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
          setError(t('quran.search.failed'));
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
    [searchMode, searchQuran, t],
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
            : item.matchedLanguage === 'english'
              ? item.translation?.english || item.snippet || ''
              : stripQuranicMarks(item.text);
      const isEnglishMatch = item.matchedLanguage === 'english';

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
                  {n(item.ayahNumber)}
                </CenteredText>
              </View>
            </View>
          </View>

          <HighlightedText
            text={stripQuranicMarks(item.text)}
            query={item.matchedLanguage === 'arabic' ? query : ''}
            style={[styles.arabicText, { color: theme.arabicText }]}
            numberOfLines={2}
          />

          {item.matchedLanguage !== 'arabic' && !!matchedSnippet && (
            <View style={styles.translationContainer}>
              <HighlightedText
                text={matchedSnippet}
                query={query}
                style={[
                  styles.translationText,
                  isEnglishMatch && styles.translationTextEnglish,
                  { color: theme.translationText },
                ]}
                numberOfLines={3}
              />
            </View>
          )}

          <View style={styles.resultFooter}>
            <CenteredText style={[styles.surahNumber, { color: theme.textSecondary }]}>
              {t('quran.search.surahLabel', { number: n(item.surahNumber) })}
            </CenteredText>
            <MaterialIcons name={forwardChevronName(language)} size={20} color={theme.icon} />
          </View>
        </Pressable>
      );
    },
    [theme, handleResultPress, query, languageLabel, n, t, language],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: t('quran.search.title'),
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
          <LocalizedTextInput
            style={[styles.searchInput, { color: theme.text }, isEnglishUi && styles.searchInputEnglish]}
            placeholder={placeholder}
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            textAlign={isEnglishUi || searchMode === 'english' ? 'left' : 'right'}
            autoFocus
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <MaterialIcons name="close" size={20} color={theme.icon} />
            </Pressable>
          )}
        </View>

        <View style={styles.modeToggle}>
          {modeOptions.map((option) => {
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
            <CenteredText style={styles.retryButtonText}>{t('common.retry')}</CenteredText>
          </Pressable>
        </View>
      ) : isSearching && results.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <CenteredText style={[styles.loadingText, { color: theme.textSecondary }]}>
            {t('quran.search.searching')}
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
              {t('quran.search.resultsCount', { count: n(total) })}
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
            {t('common.noResults')}
          </CenteredText>
          <CenteredText style={[styles.emptyText, { color: theme.textSecondary }]}>
            {t('quran.search.placeholder.all')}
          </CenteredText>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="search" size={64} color={theme.textSecondary} />
          <CenteredText style={[styles.emptyTitle, { color: theme.text }]}>
            {t('quran.search.title')}
          </CenteredText>
          <CenteredText style={[styles.emptyText, { color: theme.textSecondary }]}>
            {t('quran.search.placeholder.all')}
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
  searchInputEnglish: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  modeToggle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  modeButton: {
    flexGrow: 1,
    flexBasis: '18%',
    minWidth: 56,
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
  translationTextEnglish: {
    textAlign: 'left',
    writingDirection: 'ltr',
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
