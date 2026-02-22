/**
 * MushafView Component
 * Supports both Mushaf page view and Ayah scroll view modes
 */

import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp, useReadingPosition } from '@/context/AppContext';
import { useQuranData } from '@/hooks/useQuranData';
import { AyahRow } from './AyahRow';
import { SurahHeader } from './SurahHeader';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { getQuranFontFamily } from '@/hooks/useFonts';
import { Surah, Ayah } from '@/types/quran';
import { stripQuranicMarks } from '@/utils/quranText';
import CenteredText from '@/components/CenteredText';
import { toArabicNumerals } from '@/utils/numbers';

interface MushafViewProps {
  surahNumber: number;
  initialAyah?: number;
  onAyahChange?: (surah: number, ayah: number) => void;
  onPlayAyah?: (surah: number, ayah: number) => void;
  currentlyPlaying?: { surah: number; ayah: number } | null;
  onPageChange?: (page: number) => void;
}

// Regex pattern to match Bismillah structure: بِسْمِ followed by 3 word groups (الله, الرحمن, الرحيم)
// Pattern matches: بِسْمِ + [word1] + [word2] + [word3] + space, then captures the actual ayah content
const BISMILLAH_REGEX = /^بِسْمِ(?:\s+[^\s]+){3}\s+(.+)/;

// Strip Bismillah from ayah text if it's the first ayah (not for surah 1 and 9)
function stripBismillah(text: string, surahNumber: number, ayahNumber: number): string {
  if (ayahNumber !== 1 || surahNumber === 1 || surahNumber === 9) {
    return text;
  }
  
  // Use regex to match Bismillah structure and extract the actual ayah content
  const match = text.match(BISMILLAH_REGEX);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Return original if pattern doesn't match (safety fallback)
  return text;
}

export function MushafView({
  surahNumber,
  initialAyah = 1,
  onAyahChange,
  onPlayAyah,
  currentlyPlaying,
  onPageChange,
}: MushafViewProps) {
  const { theme, state } = useApp();
  const { updatePosition } = useReadingPosition();
  const { getSurah, getTranslation, getPage } = useQuranData();
  const flatListRef = useRef<FlatList>(null);
  const viewableAyahNumbersRef = useRef<Set<number>>(new Set());
  const scrollRetryTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [surah, setSurah] = useState<Surah | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const { viewMode, quranFont, arabicFontSize } = state.preferences;
  const fontFamily = getQuranFontFamily(quranFont);

  const mushafPages = useMemo(() => {
    if (!surah) return [] as { page: number; ayahs: Ayah[] }[];

    const pageGroups: Map<number, Ayah[]> = new Map();
    surah.ayahs.forEach((ayah) => {
      const ayahs = pageGroups.get(ayah.page) || [];
      ayahs.push(ayah);
      pageGroups.set(ayah.page, ayahs);
    });

    return Array.from(pageGroups.entries()).map(([page, ayahs]) => ({
      page,
      ayahs,
    }));
  }, [surah]);

  // Load surah data
  useEffect(() => {
    setIsLoading(true);
    viewableAyahNumbersRef.current = new Set();
    const surahData = getSurah(surahNumber);
    setSurah(surahData);
    setIsLoading(false);
  }, [surahNumber, getSurah]);

  const clearScrollRetryTimers = useCallback(() => {
    scrollRetryTimersRef.current.forEach((timer) => clearTimeout(timer));
    scrollRetryTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearScrollRetryTimers();
    };
  }, [clearScrollRetryTimers]);

  const getScrollIndexForAyah = useCallback((ayahNumber: number): number | null => {
    if (!surah) return null;
    if (viewMode === 'scroll') {
      return Math.max(0, Math.min(ayahNumber - 1, surah.ayahs.length - 1));
    }
    const pageIndex = mushafPages.findIndex((page) =>
      page.ayahs.some((ayah) => ayah.number === ayahNumber)
    );
    return pageIndex >= 0 ? pageIndex : null;
  }, [surah, viewMode, mushafPages]);

  const scrollToAyahIndex = useCallback((ayahNumber: number, animated: boolean): boolean => {
    const targetIndex = getScrollIndexForAyah(ayahNumber);
    if (targetIndex === null || !flatListRef.current) return false;

    try {
      flatListRef.current.scrollToIndex({
        index: targetIndex,
        animated,
        ...(viewMode === 'scroll' ? { viewPosition: 0 } : {}),
      });
      return true;
    } catch {
      return false;
    }
  }, [getScrollIndexForAyah, viewMode]);

  const scheduleDeterministicScroll = useCallback((ayahNumber: number, firstAnimated = true) => {
    clearScrollRetryTimers();
    const retryDelays = [0, 120, 280];

    retryDelays.forEach((delay, index) => {
      const timer = setTimeout(() => {
        scrollToAyahIndex(ayahNumber, index === 0 ? firstAnimated : true);
      }, delay);
      scrollRetryTimersRef.current.push(timer);
    });
  }, [clearScrollRetryTimers, scrollToAyahIndex]);

  // Deterministic initial scroll for deep-link ayah (supports both scroll and mushaf modes)
  useEffect(() => {
    if (!surah) return;
    const clampedTarget = Math.min(Math.max(initialAyah, 1), surah.ayahs.length);
    if (viewMode === 'scroll' && clampedTarget <= 1) return;
    scheduleDeterministicScroll(clampedTarget);
  }, [initialAyah, surahNumber, surah, viewMode, scheduleDeterministicScroll]);

  // Auto-scroll to currently playing ayah - only when ayah is not already in view (reduces jump)
  useEffect(() => {
    if (
      surah &&
      currentlyPlaying &&
      currentlyPlaying.surah === surahNumber &&
      currentlyPlaying.ayah &&
      flatListRef.current
    ) {
      const targetAyah = currentlyPlaying.ayah;
      if (viewMode === 'scroll' && viewableAyahNumbersRef.current.has(targetAyah)) {
        return;
      }
      scheduleDeterministicScroll(targetAyah);
    }
  }, [surah, currentlyPlaying, surahNumber, viewMode, scheduleDeterministicScroll]);

  // Handle viewable items change for tracking reading position and smart scroll
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: Ayah }[] }) => {
      const visible = new Set<number>();
      for (const { item } of viewableItems) {
        visible.add(item.number);
      }
      viewableAyahNumbersRef.current = visible;

      if (viewableItems.length > 0) {
        const firstVisible = viewableItems[0].item;
        const page = getPage(surahNumber, firstVisible.number);

        updatePosition({
          surahNumber,
          ayahNumber: firstVisible.number,
          page,
        });

        // Notify parent component about page change
        onPageChange?.(page);

        onAyahChange?.(surahNumber, firstVisible.number);
      }
    },
    [surahNumber, updatePosition, onAyahChange, onPageChange, getPage]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 500,
  });

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      if (!flatListRef.current) return;

      const averageLength =
        Number.isFinite(info.averageItemLength) && info.averageItemLength > 0
          ? info.averageItemLength
          : 120;

      flatListRef.current.scrollToOffset({
        offset: Math.max(0, averageLength * info.index),
        animated: false,
      });

      const retryDelays = [120, 280];
      retryDelays.forEach((delay, retryIndex) => {
        const timer = setTimeout(() => {
          try {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: retryIndex === 0,
              ...(viewMode === 'scroll' ? { viewPosition: 0 } : {}),
            });
          } catch {
            // no-op
          }
        }, delay);
        scrollRetryTimersRef.current.push(timer);
      });
    },
    [viewMode]
  );

  const handlePlayAyah = useCallback(
    (ayahNumber: number) => {
      onPlayAyah?.(surahNumber, ayahNumber);
    },
    [surahNumber, onPlayAyah]
  );

  // Render Ayah for scroll mode
  const renderScrollAyah = useCallback(
    ({ item }: { item: Ayah }) => {
      const dariTranslation = getTranslation(surahNumber, item.number, 'dari');
      const pashtoTranslation = getTranslation(surahNumber, item.number, 'pashto');
      const isPlaying =
        currentlyPlaying?.surah === surahNumber && currentlyPlaying?.ayah === item.number;

      return (
        <AyahRow
          ayah={item}
          surahNumber={surahNumber}
          dariTranslation={dariTranslation}
          pashtoTranslation={pashtoTranslation}
          isPlaying={isPlaying}
          onPlayPress={() => handlePlayAyah(item.number)}
        />
      );
    },
    [surahNumber, getTranslation, currentlyPlaying, handlePlayAyah]
  );

  // Render header - Arabic/Dari only, NO ENGLISH
  const renderHeader = useCallback(() => {
    if (!surah) return null;

    return (
      <SurahHeader
        number={surah.number}
        name={surah.name}
        ayahCount={surah.ayahCount}
        revelationType={surah.revelationType}
        onPlayPress={() => onPlayAyah?.(surahNumber, 1)}
      />
    );
  }, [surah, surahNumber, onPlayAyah]);

  // Render Mushaf page mode
  const renderMushafPage = useCallback(() => {
    if (!surah) return null;

    return (
      <FlatList
        ref={flatListRef}
        data={mushafPages}
        keyExtractor={(item) => `page-${item.page}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        inverted // RTL support
        renderItem={({ item }) => (
          <View style={[styles.mushafPage, { width: Dimensions.get('window').width }]}>
            <View style={[styles.pageHeader, { borderBottomColor: theme.divider }]}>
              <CenteredText style={[styles.pageNumber, { color: theme.textSecondary }]}>
                {toArabicNumerals(item.page)}
              </CenteredText>
              <CenteredText style={[styles.juzNumber, { color: theme.textSecondary }]}>
                الجزء {toArabicNumerals(item.ayahs[0]?.juz || 1)}
              </CenteredText>
            </View>
            <View style={styles.ayahsContainer}>
              {item.ayahs.map((ayah: Ayah) => (
                <Pressable
                  key={ayah.number}
                  onPress={() => handlePlayAyah(ayah.number)}
                  style={({ pressed }) => [
                    styles.mushafAyah,
                    currentlyPlaying?.surah === surahNumber &&
                    currentlyPlaying?.ayah === ayah.number && {
                      backgroundColor: `${theme.playing}20`,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <CenteredText
                    style={[
                      styles.mushafAyahText,
                      {
                        fontFamily,
                        color: theme.arabicText,
                        fontSize: Typography.arabic[arabicFontSize],
                      },
                    ]}
                  >
                    {stripBismillah(stripQuranicMarks(ayah.text, quranFont), surahNumber, ayah.number)}
                    <CenteredText style={[styles.ayahEndMark, { color: theme.ayahNumber }]}>
                      {' '}﴿{toArabicNumerals(ayah.number)}﴾{' '}
                    </CenteredText>
                  </CenteredText>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      />
    );
  }, [surah, mushafPages, surahNumber, theme, fontFamily, arabicFontSize, quranFont, currentlyPlaying, handlePlayAyah]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  if (!surah) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <MaterialIcons name="error-outline" size={48} color={theme.textSecondary} />
        <CenteredText style={[styles.errorText, { color: theme.textSecondary }]}>
          سوره یافت نشد
        </CenteredText>
      </View>
    );
  }

  // Scroll mode (default)
  if (viewMode === 'scroll') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <FlatList
          ref={flatListRef}
          data={surah.ayahs}
          keyExtractor={(item) => `ayah-${item.number}`}
          renderItem={renderScrollAyah}
          ListHeaderComponent={renderHeader}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig.current}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          initialNumToRender={8}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
          onScrollToIndexFailed={handleScrollToIndexFailed}
        />
      </View>
    );
  }

  // Mushaf page mode
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {renderHeader()}
      {renderMushafPage()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontSize: Typography.ui.subtitle,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  // Mushaf page styles
  mushafPage: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    marginBottom: Spacing.md,
  },
  pageNumber: {
    fontSize: Typography.ui.caption,
  },
  juzNumber: {
    fontSize: Typography.ui.caption,
  },
  ayahsContainer: {
    flex: 1,
  },
  mushafAyah: {
    flexDirection: 'row-reverse', // RTL: text flows from right
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  mushafAyahText: {
    textAlign: 'center', // CENTERED
    lineHeight: 62, // Reduced from 75 - balanced spacing, prevents text cut-off
    writingDirection: 'rtl',
    letterSpacing: 1, // Spacing for diacritics not to overlap
    includeFontPadding: false, // Android: prevent extra padding
    paddingBottom: 5, // Prevents text cut-off at bottom
  },
  ayahEndMark: {
    fontSize: 16,
    fontWeight: '600',
  },
});
