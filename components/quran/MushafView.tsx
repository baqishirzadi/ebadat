/**
 * MushafView Component
 * Supports both Mushaf page view and Ayah scroll view modes
 */

import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, ViewToken } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp, useReadingPosition } from '@/context/AppContext';
import { useQuranData } from '@/hooks/useQuranData';
import { getQuranFontFamily } from '@/hooks/useFonts';
import { getPortraitWindowSize } from '@/hooks/usePortraitLock';
import { AyahRow } from './AyahRow';
import { SurahHeader } from './SurahHeader';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Surah, Ayah } from '@/types/quran';
import { keepWaqfMarks } from '@/utils/quranText';
import { QuranText } from './QuranText';
import CenteredText from '@/components/CenteredText';
import { toArabicNumerals } from '@/utils/numbers';
import type { QuranReaderTokens } from '@/hooks/useQuranReaderSettings';

interface MushafViewProps {
  surahNumber: number;
  initialAyah?: number;
  jumpMode?: 'default' | 'exact' | 'continue' | 'search_exact';
  jumpToken?: string;
  resumeSource?: 'notification';
  onAyahChange?: (surah: number, ayah: number) => void;
  onPlayAyah?: (surah: number, ayah: number) => void;
  onSettingsPress?: () => void;
  activePlayingAyah?: number | null;
  onPageChange?: (page: number) => void;
  contentPaddingTop?: number;
  contentPaddingBottom?: number;
  readerTokens?: QuranReaderTokens;
}

// The target row plus a few rows of context are always inside the rendered
// window, so scrollToIndex lands on measured rows instead of estimating an
// offset from an average row height (which drifts on variable-height rows).
const JUMP_CONTEXT_ROWS = 3;
const WINDOW_PREPEND_CHUNK = 20;
// A row already pinned under the top bar can sit a few pixels off the safe edge.
const FOLLOW_EDGE_SLACK = 8;
const STABLE_LIST_RENDER_CONFIG = {
  initialNumToRender: 10,
  maxToRenderPerBatch: 8,
  windowSize: 11,
  removeClippedSubviews: true,
} as const;

function windowStartForAyah(ayahNumber: number): number {
  return Math.max(0, ayahNumber - 1 - JUMP_CONTEXT_ROWS);
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

export const MushafView = React.memo(function MushafView({
  surahNumber,
  initialAyah = 1,
  jumpMode = 'default',
  jumpToken,
  resumeSource,
  onAyahChange,
  onPlayAyah,
  onSettingsPress,
  activePlayingAyah = null,
  onPageChange,
  contentPaddingTop = 0,
  contentPaddingBottom = 0,
  readerTokens,
}: MushafViewProps) {
  const { theme, state } = useApp();
  const { updatePosition } = useReadingPosition();
  const { getSurah, getTranslation, getPage } = useQuranData();
  const flatListRef = useRef<FlatList>(null);
  const viewableAyahNumbersRef = useRef<Set<number>>(new Set());
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTargetAyahRef = useRef<number | null>(null);
  const activeJumpSessionIdRef = useRef(0);
  const scrollFailedOnceRef = useRef(false);
  const lastReportedAyahRef = useRef<number | null>(null);
  const lastReportedPageRef = useRef<number | null>(null);
  const handledNavigationJumpKeyRef = useRef<string | null>(null);
  const notificationResumeTargetAyahRef = useRef<number | null>(null);
  const notificationResumeSettledRef = useRef(true);
  const pendingTypographyFollowAyahRef = useRef<number | null>(null);
  const typographyFollowSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typographyFollowFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ayah to scroll to once a window move has rendered it.
  const pendingFollowScrollRef = useRef<number | null>(null);
  // Stops onStartReached from prepending again before the previous chunk renders.
  const prependArmedRef = useRef(true);

  const [surah, setSurah] = useState<Surah | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [jumpFailureAyah, setJumpFailureAyah] = useState<number | null>(null);
  const [isSearchJumping, setIsSearchJumping] = useState(false);
  // Index of the first ayah rendered. Starting the window at the target means
  // the destination row is measured on the first layout pass.
  const [windowStart, setWindowStart] = useState(() => windowStartForAyah(initialAyah));

  const { viewMode, arabicFontSize } = state.preferences;
  const quranFontFamily = getQuranFontFamily(state.preferences.quranFont);
  const effectiveViewMode: 'scroll' | 'mushaf' =
    jumpMode === 'exact' || jumpMode === 'continue' || jumpMode === 'search_exact'
      ? 'scroll'
      : viewMode;
  // The top bar floats over the list, so the target row is pinned just under it.
  const ayahFollowViewOffset = Math.max(0, contentPaddingTop);
  const typographyFollowKey = `${state.preferences.quranFont}:${arabicFontSize}:${readerTokens?.lineHeightRatio ?? ''}:${contentPaddingTop}:${contentPaddingBottom}`;
  const skipTypographyFollowResetRef = useRef(true);
  const activePlayingAyahRef = useRef(activePlayingAyah);
  activePlayingAyahRef.current = activePlayingAyah;
  const ayahRowRefs = useRef(new Map<number, View>());

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

  const logJumpDev = useCallback((message: string, extra?: Record<string, unknown>) => {
    if (!__DEV__) return;
    if (extra) {
      console.log(`[QuranJump] ${message}`, extra);
      return;
    }
    console.log(`[QuranJump] ${message}`);
  }, []);

  const clearScrollRetryTimers = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const resetJumpSessionState = useCallback((keepFailureState = false) => {
    clearScrollRetryTimers();
    pendingTargetAyahRef.current = null;
    scrollFailedOnceRef.current = false;
    setIsSearchJumping(false);
    if (!keepFailureState) {
      setJumpFailureAyah(null);
    }
  }, [clearScrollRetryTimers]);

  useEffect(() => {
    return () => {
      activeJumpSessionIdRef.current += 1;
      resetJumpSessionState();
    };
  }, [resetJumpSessionState]);

  const getScrollIndexForAyah = useCallback((ayahNumber: number): number | null => {
    if (!surah) return null;
    if (effectiveViewMode === 'scroll') {
      const index = ayahNumber - 1 - windowStart;
      if (index < 0 || index >= surah.ayahs.length - windowStart) return null;
      return index;
    }
    const pageIndex = mushafPages.findIndex((page) =>
      page.ayahs.some((ayah) => ayah.number === ayahNumber)
    );
    return pageIndex >= 0 ? pageIndex : null;
  }, [surah, effectiveViewMode, mushafPages, windowStart]);

  const scrollToAyahIndex = useCallback((ayahNumber: number, animated: boolean): boolean => {
    const targetIndex = getScrollIndexForAyah(ayahNumber);
    if (targetIndex === null || !flatListRef.current) return false;

    try {
      flatListRef.current.scrollToIndex({
        index: targetIndex,
        animated,
        ...(effectiveViewMode === 'scroll'
          ? { viewPosition: 0, viewOffset: ayahFollowViewOffset }
          : {}),
      });
      return true;
    } catch {
      return false;
    }
  }, [ayahFollowViewOffset, getScrollIndexForAyah, effectiveViewMode]);

  // The player covers the bottom of the list. Fifty-percent viewability still
  // counts a row whose lower half sits under that bar, so playback follow
  // measures the row against the open area instead.
  const ayahFitsAbovePlayer = useCallback((ayahNumber: number): Promise<boolean> => {
    const node = ayahRowRefs.current.get(ayahNumber);
    if (!node) return Promise.resolve(false);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (fits: boolean) => {
        if (settled) return;
        settled = true;
        resolve(fits);
      };
      const timer = setTimeout(() => finish(false), 80);
      try {
        node.measureInWindow((_x, y, _width, height) => {
          clearTimeout(timer);
          if (!Number.isFinite(y) || !Number.isFinite(height) || height <= 0) {
            finish(false);
            return;
          }
          const windowHeight = getPortraitWindowSize().height;
          const safeTop = contentPaddingTop;
          const safeBottom = windowHeight - Math.max(0, contentPaddingBottom);
          const safeHeight = safeBottom - safeTop;
          const topAligned = y >= safeTop - 1 && y <= safeTop + FOLLOW_EDGE_SLACK;
          if (height > safeHeight && topAligned) {
            finish(true);
            return;
          }
          finish(y >= safeTop - 1 && y + height <= safeBottom + 1);
        });
      } catch {
        clearTimeout(timer);
        finish(false);
      }
    });
  }, [contentPaddingBottom, contentPaddingTop]);

  const clearTypographyFollowTimers = useCallback(() => {
    if (typographyFollowSettleTimerRef.current) {
      clearTimeout(typographyFollowSettleTimerRef.current);
      typographyFollowSettleTimerRef.current = null;
    }
    if (typographyFollowFallbackTimerRef.current) {
      clearTimeout(typographyFollowFallbackTimerRef.current);
      typographyFollowFallbackTimerRef.current = null;
    }
  }, []);

  const flushTypographyFollow = useCallback((ayahNumber: number) => {
    if (pendingTypographyFollowAyahRef.current !== ayahNumber) return;
    pendingTypographyFollowAyahRef.current = null;
    clearTypographyFollowTimers();
    if (activePlayingAyahRef.current !== ayahNumber) return;

    void ayahFitsAbovePlayer(ayahNumber).then((fits) => {
      if (fits || activePlayingAyahRef.current !== ayahNumber) return;
      requestAnimationFrame(() => {
        if (activePlayingAyahRef.current !== ayahNumber) return;
        void ayahFitsAbovePlayer(ayahNumber).then((stillFits) => {
          if (stillFits || activePlayingAyahRef.current !== ayahNumber) return;
          scrollToAyahIndex(ayahNumber, true);
        });
      });
    });
  }, [ayahFitsAbovePlayer, clearTypographyFollowTimers, scrollToAyahIndex]);

  const handleTypographyContentSizeChange = useCallback(() => {
    const pendingAyah = pendingTypographyFollowAyahRef.current;
    if (pendingAyah === null) return;
    if (typographyFollowSettleTimerRef.current) {
      clearTimeout(typographyFollowSettleTimerRef.current);
    }
    typographyFollowSettleTimerRef.current = setTimeout(() => {
      flushTypographyFollow(pendingAyah);
    }, 100);
  }, [flushTypographyFollow]);

  useEffect(() => () => {
    pendingTypographyFollowAyahRef.current = null;
    clearTypographyFollowTimers();
  }, [clearTypographyFollowTimers]);

  const completeJumpSession = useCallback((ayahNumber: number) => {
    const shouldSettleNotificationResume =
      resumeSource === 'notification' &&
      jumpMode === 'continue' &&
      notificationResumeTargetAyahRef.current === ayahNumber;

    logJumpDev('success', { token: jumpToken, ayahNumber });
    resetJumpSessionState();
    if (shouldSettleNotificationResume) {
      notificationResumeSettledRef.current = true;
      notificationResumeTargetAyahRef.current = null;
    }
  }, [jumpMode, jumpToken, logJumpDev, resetJumpSessionState, resumeSource]);

  const markJumpFailed = useCallback((ayahNumber: number, reason: string) => {
    logJumpDev('failed', { ayahNumber, reason, token: jumpToken });
    if (jumpMode === 'exact' || jumpMode === 'search_exact') {
      setJumpFailureAyah(ayahNumber);
    }
    resetJumpSessionState(true);
  }, [jumpMode, jumpToken, logJumpDev, resetJumpSessionState]);

  // Keeps the playing ayah under the top bar. A row that is only partly above
  // the player still scrolls up. If it sits before the rendered window, the
  // window moves first and the scroll waits until that render.
  const followAyah = useCallback((ayahNumber: number) => {
    const scrollIntoSafeArea = () => {
      if (activePlayingAyahRef.current !== ayahNumber) return;
      if (effectiveViewMode === 'scroll' && ayahNumber - 1 < windowStart) {
        pendingFollowScrollRef.current = ayahNumber;
        setWindowStart(windowStartForAyah(ayahNumber));
        return;
      }
      scrollToAyahIndex(ayahNumber, true);
    };

    if (effectiveViewMode !== 'scroll') {
      scrollIntoSafeArea();
      return;
    }

    void ayahFitsAbovePlayer(ayahNumber).then((fits) => {
      if (fits) return;
      scrollIntoSafeArea();
    });
  }, [ayahFitsAbovePlayer, effectiveViewMode, scrollToAyahIndex, windowStart]);

  useEffect(() => {
    const pending = pendingFollowScrollRef.current;
    if (pending === null) return;
    pendingFollowScrollRef.current = null;
    const frame = requestAnimationFrame(() => {
      void ayahFitsAbovePlayer(pending).then((fits) => {
        if (fits || activePlayingAyahRef.current !== pending) return;
        scrollToAyahIndex(pending, true);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [ayahFitsAbovePlayer, windowStart, scrollToAyahIndex]);

  const scheduleBasicScroll = useCallback(
    (ayahNumber: number, firstAnimated = true, forceScrollToTop = false) => {
      clearScrollRetryTimers();
      pendingTargetAyahRef.current = ayahNumber;
      const sessionId = ++activeJumpSessionIdRef.current;

      const runBasicAttempt = (attempt: number) => {
        if (activeJumpSessionIdRef.current !== sessionId) return;
        if (pendingTargetAyahRef.current !== ayahNumber) return;
        if (
          !forceScrollToTop &&
          effectiveViewMode === 'scroll' &&
          viewableAyahNumbersRef.current.has(ayahNumber)
        ) {
          return;
        }

        scrollToAyahIndex(ayahNumber, attempt === 0 ? firstAnimated : true);
        if (attempt >= 2) return;

        const delay = attempt === 0 ? 120 : 160;
        retryTimerRef.current = setTimeout(() => {
          runBasicAttempt(attempt + 1);
        }, delay);
      };

      runBasicAttempt(0);
    },
    [clearScrollRetryTimers, effectiveViewMode, scrollToAyahIndex]
  );

  // The destination row is rendered from the first frame, so one scroll after
  // layout plus a single confirmation is enough. The confirmation repeats only
  // while the row is not yet reported visible.
  const startWindowedJump = useCallback((ayahNumber: number, showSearchOverlay: boolean) => {
    const sessionId = ++activeJumpSessionIdRef.current;
    resetJumpSessionState();
    pendingTargetAyahRef.current = ayahNumber;
    setIsSearchJumping(showSearchOverlay);

    logJumpDev('start', { token: jumpToken, ayahNumber, sessionId, mode: jumpMode });

    const confirm = (remaining: number) => {
      if (activeJumpSessionIdRef.current !== sessionId) return;
      if (pendingTargetAyahRef.current !== ayahNumber) return;

      if (viewableAyahNumbersRef.current.has(ayahNumber)) {
        completeJumpSession(ayahNumber);
        return;
      }

      const scrolled = scrollToAyahIndex(ayahNumber, false);
      if (!scrolled && remaining <= 0) {
        markJumpFailed(ayahNumber, 'target_missing');
        return;
      }
      if (remaining <= 0) {
        markJumpFailed(ayahNumber, 'not_visible');
        return;
      }

      retryTimerRef.current = setTimeout(() => confirm(remaining - 1), 200);
    };

    requestAnimationFrame(() => confirm(10));
  }, [completeJumpSession, jumpMode, jumpToken, logJumpDev, markJumpFailed, resetJumpSessionState, scrollToAyahIndex]);

  const handleJumpRetryPress = useCallback(() => {
    if (!surah || jumpFailureAyah === null) return;
    const clampedAyah = Math.min(Math.max(jumpFailureAyah, 1), surah.ayahs.length);
    setWindowStart(windowStartForAyah(clampedAyah));
    startWindowedJump(clampedAyah, jumpMode === 'search_exact');
  }, [jumpFailureAyah, jumpMode, startWindowedJump, surah]);

  // Deterministic initial scroll for deep-link ayah (supports both scroll and mushaf modes)
  useEffect(() => {
    if (!surah) return;
    const clampedTarget = Math.min(Math.max(initialAyah, 1), surah.ayahs.length);
    const navigationJumpKey =
      jumpToken ??
      `${surahNumber}:${jumpMode}:${effectiveViewMode}:${clampedTarget}`;

    if (handledNavigationJumpKeyRef.current === navigationJumpKey) {
      return;
    }
    handledNavigationJumpKeyRef.current = navigationJumpKey;

    const isNotificationResume = resumeSource === 'notification' && jumpMode === 'continue';
    notificationResumeSettledRef.current = !isNotificationResume;
    notificationResumeTargetAyahRef.current = isNotificationResume ? clampedTarget : null;

    // Render the destination first, then scroll to a row that already exists.
    setWindowStart(windowStartForAyah(clampedTarget));

    if (jumpMode === 'exact' || jumpMode === 'search_exact' || jumpMode === 'continue') {
      startWindowedJump(clampedTarget, jumpMode === 'search_exact');
      return;
    }

    resetJumpSessionState();
    if (effectiveViewMode === 'scroll' && clampedTarget <= 1) return;
    scheduleBasicScroll(clampedTarget, true);
  }, [
    initialAyah,
    jumpMode,
    jumpToken,
    resumeSource,
    surahNumber,
    surah,
    effectiveViewMode,
    resetJumpSessionState,
    scheduleBasicScroll,
    startWindowedJump,
  ]);

  useEffect(() => {
    lastReportedAyahRef.current = null;
    lastReportedPageRef.current = null;
    notificationResumeSettledRef.current = true;
    notificationResumeTargetAyahRef.current = null;
  }, [surahNumber]);

  useEffect(() => {
    clearTypographyFollowTimers();
    pendingTypographyFollowAyahRef.current = null;
    if (skipTypographyFollowResetRef.current) {
      skipTypographyFollowResetRef.current = false;
      return;
    }
    const playingAyah = activePlayingAyahRef.current;
    if (playingAyah) {
      pendingTypographyFollowAyahRef.current = playingAyah;
      // Let FlatList publish its new content size before snapping to the
      // playing ayah. If it does not emit a size change, use one bounded
      // fallback after native layout has had time to settle.
      typographyFollowFallbackTimerRef.current = setTimeout(() => {
        flushTypographyFollow(playingAyah);
      }, 500);
    }
  }, [
    clearTypographyFollowTimers,
    flushTypographyFollow,
    typographyFollowKey,
  ]);

  // Keep the playing ayah at the top of the screen as playback advances.
  useEffect(() => {
    if (!surah || !activePlayingAyah) return;

    const targetAyah = activePlayingAyah;
    if (!notificationResumeSettledRef.current) {
      if (notificationResumeTargetAyahRef.current === targetAyah) {
        return;
      }
      notificationResumeSettledRef.current = true;
      notificationResumeTargetAyahRef.current = null;
    }

    followAyah(targetAyah);
  }, [surah, activePlayingAyah, surahNumber, effectiveViewMode, followAyah]);

  // Handle viewable items change for tracking reading position and smart scroll
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: (ViewToken & { item?: Ayah })[] }) => {
      const visible = new Set<number>();
      for (const token of viewableItems) {
        const ayahNumber = token.item?.number;
        if (typeof ayahNumber === 'number' && Number.isFinite(ayahNumber) && ayahNumber > 0) {
          visible.add(ayahNumber);
        }
      }
      viewableAyahNumbersRef.current = visible;

      const firstVisible = viewableItems
        .map((token) => token.item)
        .filter((item): item is Ayah => Boolean(item && Number.isFinite(item.number) && item.number > 0))
        .sort((left, right) => left.number - right.number)[0];
      if (effectiveViewMode === 'scroll' && pendingTargetAyahRef.current) {
        const targetAyah = pendingTargetAyahRef.current;
        if (visible.has(targetAyah)) {
          logJumpDev('visible', { token: jumpToken, target: targetAyah, firstVisible: firstVisible?.number });
          completeJumpSession(targetAyah);
        }
      }

      if (firstVisible) {
        const page = getPage(surahNumber, firstVisible.number);

        if (
          !notificationResumeSettledRef.current &&
          notificationResumeTargetAyahRef.current === firstVisible.number
        ) {
          notificationResumeSettledRef.current = true;
          notificationResumeTargetAyahRef.current = null;
        }

        if (lastReportedAyahRef.current !== firstVisible.number || lastReportedPageRef.current !== page) {
          lastReportedAyahRef.current = firstVisible.number;
          lastReportedPageRef.current = page;

          updatePosition({
            surahNumber,
            ayahNumber: firstVisible.number,
            page,
          });

          // Notify parent component about page change
          onPageChange?.(page);
          onAyahChange?.(surahNumber, firstVisible.number);
        }
      }
    },
    [
      completeJumpSession,
      effectiveViewMode,
      getPage,
      jumpToken,
      logJumpDev,
      onAyahChange,
      onPageChange,
      surahNumber,
      updatePosition,
    ]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 200,
  });

  const handleMushafPageViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const page = viewableItems.find((token) => token.isViewable)?.item as
        | { page: number; ayahs: Ayah[] }
        | undefined;
      const firstVisible = page?.ayahs[0];
      if (!page || !firstVisible) return;

      if (lastReportedAyahRef.current !== firstVisible.number || lastReportedPageRef.current !== page.page) {
        lastReportedAyahRef.current = firstVisible.number;
        lastReportedPageRef.current = page.page;
        updatePosition({ surahNumber, ayahNumber: firstVisible.number, page: page.page });
        onPageChange?.(page.page);
        onAyahChange?.(surahNumber, firstVisible.number);
      }

    },
    [onAyahChange, onPageChange, surahNumber, updatePosition],
  );

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      if (!flatListRef.current) return;
      const targetAyah = pendingTargetAyahRef.current ?? activePlayingAyahRef.current;
      logJumpDev('scroll_to_index_failed', {
        token: jumpToken,
        targetAyah,
        infoIndex: info.index,
        highestMeasuredFrameIndex: info.highestMeasuredFrameIndex,
      });

      // The window keeps jump targets within the first rendered rows, so this
      // only fires while rows are still being measured. Reveal what is measured
      // and retry the exact index once.
      try {
        flatListRef.current.scrollToIndex({
          index: Math.max(0, info.highestMeasuredFrameIndex),
          animated: false,
        });
      } catch {
        // The retry below runs after the next layout pass.
      }

      if (targetAyah === null || scrollFailedOnceRef.current) return;
      scrollFailedOnceRef.current = true;
      clearScrollRetryTimers();
      retryTimerRef.current = setTimeout(() => {
        scrollFailedOnceRef.current = false;
        scrollToAyahIndex(targetAyah, false);
      }, 120);
    },
    [clearScrollRetryTimers, jumpToken, logJumpDev, scrollToAyahIndex]
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
      const englishTranslation = getTranslation(surahNumber, item.number, 'english');
      const turkishTranslation = getTranslation(surahNumber, item.number, 'turkish');
      const arabicTranslation = getTranslation(surahNumber, item.number, 'arabic');
      const isPlaying = activePlayingAyah === item.number;

      return (
        <View
          collapsable={false}
          ref={(node) => {
            if (node) ayahRowRefs.current.set(item.number, node);
            else ayahRowRefs.current.delete(item.number);
          }}
        >
          <AyahRow
            ayah={item}
            surahNumber={surahNumber}
            dariTranslation={dariTranslation}
            pashtoTranslation={pashtoTranslation}
            englishTranslation={englishTranslation}
            turkishTranslation={turkishTranslation}
            arabicTranslation={arabicTranslation}
            isPlaying={isPlaying}
            onPlayPress={() => handlePlayAyah(item.number)}
            readerTokens={readerTokens}
          />
        </View>
      );
    },
    [surahNumber, getTranslation, activePlayingAyah, handlePlayAyah, readerTokens]
  );

  // Render header - Arabic/Dari only, NO ENGLISH. Hidden until the window
  // reaches the first ayah, so prepending earlier ayahs never shifts the view.
  const renderHeader = useCallback(() => {
    if (!surah || windowStart > 0) return null;

    return (
      <SurahHeader
        number={surah.number}
        name={surah.name}
        ayahCount={surah.ayahCount}
        revelationType={surah.revelationType}
        onPlayPress={() => onPlayAyah?.(surahNumber, 1)}
        onSettingsPress={onSettingsPress}
        compactReader={effectiveViewMode === 'scroll'}
        arabicFontSize={arabicFontSize}
        readerTokens={readerTokens}
      />
    );
  }, [surah, surahNumber, onPlayAyah, onSettingsPress, effectiveViewMode, readerTokens, arabicFontSize, windowStart]);

  const visibleAyahs = useMemo(
    () => (surah ? surah.ayahs.slice(windowStart) : []),
    [surah, windowStart],
  );

  const revealEarlierAyahs = useCallback(() => {
    // A jump positions the target a few rows from the top, which is inside the
    // start threshold. Prepending while that scroll is in flight shifts the
    // index and lands on the wrong ayah, so wait until the jump has settled,
    // and only prepend one chunk at a time.
    if (pendingTargetAyahRef.current !== null) return;
    if (!prependArmedRef.current) return;
    prependArmedRef.current = false;
    setWindowStart((current) => (current === 0 ? current : Math.max(0, current - WINDOW_PREPEND_CHUNK)));
    setTimeout(() => {
      prependArmedRef.current = true;
    }, 300);
  }, []);

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
        getItemLayout={(_, index) => {
          const pageWidth = getPortraitWindowSize().width;
          return { length: pageWidth, offset: pageWidth * index, index };
        }}
        viewabilityConfig={viewabilityConfig.current}
        onViewableItemsChanged={handleMushafPageViewableItemsChanged}
        renderItem={({ item }) => (
          <View style={[styles.mushafPage, { width: getPortraitWindowSize().width }]}>
            <View style={[styles.pageHeader, { borderBottomColor: readerTokens?.divider ?? theme.divider }]}>
              <CenteredText style={[styles.pageNumber, { color: readerTokens?.textSecondary ?? theme.textSecondary }]}>
                {toArabicNumerals(item.page)}
              </CenteredText>
              <CenteredText style={[styles.juzNumber, { color: readerTokens?.textSecondary ?? theme.textSecondary }]}>
                الجزء {toArabicNumerals(item.ayahs[0]?.juz || 1)}
              </CenteredText>
            </View>
            <View style={styles.ayahsContainer}>
              {item.ayahs.map((ayah: Ayah) => (
                <Pressable
                  key={ayah.number}
                  testID={`quran-ayah-row-${surahNumber}-${ayah.number}`}
                  accessibilityState={{ selected: activePlayingAyah === ayah.number }}
                  onPress={() => handlePlayAyah(ayah.number)}
                  style={({ pressed }) => [
                      styles.mushafAyah,
                    activePlayingAyah === ayah.number && {
                      backgroundColor: `${readerTokens?.accent ?? theme.playing}12`,
                      borderColor: `${readerTokens?.accent ?? theme.playing}72`,
                      borderWidth: 1,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <QuranText
                    allowFontScaling={false}
                    textBreakStrategy="simple"
                    lineBreakStrategyIOS="none"
                    style={[
                      styles.mushafAyahText,
                      {
                        fontFamily: quranFontFamily,
                        color: readerTokens?.arabic ?? theme.arabicText,
                        includeFontPadding: true,
                        fontSize: Typography.arabic[arabicFontSize],
                        lineHeight: Math.round(Typography.arabic[arabicFontSize] * 2.1),
                        paddingBottom: Math.round(Typography.arabic[arabicFontSize] * 0.15),
                      },
                    ]}
                  >
                    {stripBismillah(keepWaqfMarks(ayah.text), surahNumber, ayah.number)}
                    {state.preferences.quranFont === 'qpcHafs'
                      ? ` ${toArabicNumerals(ayah.number)}`
                      : ` ﴿${toArabicNumerals(ayah.number)}﴾`}
                  </QuranText>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      />
    );
  }, [surah, mushafPages, surahNumber, theme, readerTokens, arabicFontSize, activePlayingAyah, handlePlayAyah, quranFontFamily, state.preferences.quranFont]);

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
  if (effectiveViewMode === 'scroll') {
    return (
      <View testID="quran-translation-reader" style={[styles.container, { backgroundColor: readerTokens?.page ?? theme.background }]}>
        {jumpMode === 'exact' && jumpFailureAyah !== null && (
          <View style={[styles.jumpFailureBanner, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <CenteredText style={[styles.jumpFailureText, { color: theme.text }]}>
              رفتن دقیق به آیه انجام نشد.
            </CenteredText>
            <Pressable
              onPress={handleJumpRetryPress}
              style={({ pressed }) => [
                styles.jumpRetryButton,
                { backgroundColor: theme.tint },
                pressed && { opacity: 0.9 },
              ]}
            >
              <CenteredText style={styles.jumpRetryButtonText}>تلاش دوباره</CenteredText>
            </Pressable>
          </View>
        )}
        {jumpMode === 'search_exact' && jumpFailureAyah !== null && (
          <View style={[styles.jumpFailureBanner, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <CenteredText style={[styles.jumpFailureText, { color: theme.text }]}>
              رفتن به نتیجه جستجو انجام نشد.
            </CenteredText>
            <Pressable
              onPress={handleJumpRetryPress}
              style={({ pressed }) => [
                styles.jumpRetryButton,
                { backgroundColor: theme.tint },
                pressed && { opacity: 0.9 },
              ]}
            >
              <CenteredText style={styles.jumpRetryButtonText}>تلاش دوباره</CenteredText>
            </Pressable>
          </View>
        )}
        <FlatList
          ref={flatListRef}
          data={visibleAyahs}
          keyExtractor={(item) => `ayah-${item.number}`}
          renderItem={renderScrollAyah}
          ListHeaderComponent={renderHeader}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig.current}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            contentPaddingTop > 0 && { paddingTop: contentPaddingTop },
            { paddingBottom: contentPaddingBottom },
          ]}
          // Prepending earlier ayahs must not move the ayah the reader is on.
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onStartReached={windowStart > 0 ? revealEarlierAyahs : undefined}
          onStartReachedThreshold={0.5}
          initialNumToRender={STABLE_LIST_RENDER_CONFIG.initialNumToRender}
          maxToRenderPerBatch={STABLE_LIST_RENDER_CONFIG.maxToRenderPerBatch}
          windowSize={STABLE_LIST_RENDER_CONFIG.windowSize}
          extraData={typographyFollowKey}
          onContentSizeChange={handleTypographyContentSizeChange}
          removeClippedSubviews={STABLE_LIST_RENDER_CONFIG.removeClippedSubviews}
          onScrollToIndexFailed={handleScrollToIndexFailed}
        />
        {jumpMode === 'search_exact' && isSearchJumping && (
          <View style={[styles.searchJumpOverlay, { backgroundColor: theme.background }]}>
            <ActivityIndicator size="small" color={theme.tint} />
          </View>
        )}
      </View>
    );
  }

  // Mushaf page mode
  return (
    <View testID="quran-translation-reader" style={[styles.container, { backgroundColor: readerTokens?.page ?? theme.background }]}>
      {renderHeader()}
      {renderMushafPage()}
    </View>
  );
});

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
  jumpFailureBanner: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  jumpFailureText: {
    flex: 1,
    fontSize: Typography.ui.body,
    textAlign: 'right',
  },
  jumpRetryButton: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  jumpRetryButtonText: {
    color: '#fff',
    fontSize: Typography.ui.caption,
    fontWeight: '600',
  },
  searchJumpOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
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
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  mushafAyahText: {
    textAlign: 'center',
    writingDirection: 'rtl',
    width: '100%',
  },
  ayahEndMark: {
    fontSize: 16,
    fontWeight: '600',
  },
});
