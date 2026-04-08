/**
 * MushafView Component
 * Supports both Mushaf page view and Ayah scroll view modes
 */

import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Pressable, ActivityIndicator, ViewToken } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp, useReadingPosition } from '@/context/AppContext';
import { useQuranData } from '@/hooks/useQuranData';
import { getQuranFontFamily } from '@/hooks/useFonts';
import { AyahRow } from './AyahRow';
import { SurahHeader } from './SurahHeader';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Surah, Ayah } from '@/types/quran';
import { stripQuranicMarks } from '@/utils/quranText';
import CenteredText from '@/components/CenteredText';
import { toArabicNumerals } from '@/utils/numbers';

interface MushafViewProps {
  surahNumber: number;
  initialAyah?: number;
  jumpMode?: 'default' | 'exact' | 'continue' | 'search_exact';
  jumpToken?: string;
  resumeSource?: 'notification';
  onAyahChange?: (surah: number, ayah: number) => void;
  onPlayAyah?: (surah: number, ayah: number) => void;
  activePlayingAyah?: number | null;
  onPageChange?: (page: number) => void;
}

const MAX_SCROLL_RETRY_ATTEMPTS = 6;
const SCROLL_RETRY_DELAYS_MS = [80, 160, 260, 360, 520, 700];
const SEARCH_MAX_SCROLL_RETRY_ATTEMPTS = 8;
const SEARCH_SCROLL_RETRY_DELAYS_MS = [60, 100, 140, 200, 280, 380, 520, 700];
const SEARCH_PRELOAD_WINDOW = 10;
const SEARCH_VISIBLE_STABLE_TICKS = 1;
const JUMP_VISIBLE_STABLE_TICKS = 2;
const FOLLOW_MAX_ATTEMPTS = 5;
const FOLLOW_RETRY_DELAYS_MS = [80, 160, 260, 420, 620];
const FOLLOW_VISIBLE_STABLE_TICKS = 2;
const STABLE_LIST_RENDER_CONFIG = {
  initialNumToRender: 12,
  maxToRenderPerBatch: 8,
  windowSize: 9,
  removeClippedSubviews: false,
} as const;

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
  activePlayingAyah = null,
  onPageChange,
}: MushafViewProps) {
  const { theme, state } = useApp();
  const { updatePosition } = useReadingPosition();
  const { getSurah, getTranslation, getPage } = useQuranData();
  const flatListRef = useRef<FlatList>(null);
  const viewableAyahNumbersRef = useRef<Set<number>>(new Set());
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTargetAyahRef = useRef<number | null>(null);
  const retryAttemptRef = useRef(0);
  const activeJumpSessionIdRef = useRef(0);
  const targetVisibleStableCountRef = useRef(0);
  const highestMeasuredFrameIndexRef = useRef(0);
  const isExactJumpSessionRef = useRef(false);
  const isContinueJumpSessionRef = useRef(false);
  const isSearchExactJumpSessionRef = useRef(false);
  const lastAverageItemLengthRef = useRef<number>(0);
  const activeFollowSessionIdRef = useRef(0);
  const followTargetAyahRef = useRef<number | null>(null);
  const followRetryAttemptRef = useRef(0);
  const followTopStableTicksRef = useRef(0);
  const followHighestMeasuredFrameIndexRef = useRef(0);
  const followRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFollowAyahRef = useRef<number | null>(null);
  const lastReportedAyahRef = useRef<number | null>(null);
  const lastReportedPageRef = useRef<number | null>(null);
  const handledNavigationJumpKeyRef = useRef<string | null>(null);
  const notificationResumeTargetAyahRef = useRef<number | null>(null);
  const notificationResumeSettledRef = useRef(true);

  const [surah, setSurah] = useState<Surah | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [jumpFailureAyah, setJumpFailureAyah] = useState<number | null>(null);
  const [isSearchJumping, setIsSearchJumping] = useState(false);

  const { viewMode, arabicFontSize } = state.preferences;
  const quranFontFamily = getQuranFontFamily(state.preferences.quranFont);
  const effectiveViewMode: 'scroll' | 'mushaf' =
    jumpMode === 'exact' || jumpMode === 'continue' || jumpMode === 'search_exact'
      ? 'scroll'
      : viewMode;

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

  const clearFollowRetryTimer = useCallback(() => {
    if (followRetryTimerRef.current) {
      clearTimeout(followRetryTimerRef.current);
      followRetryTimerRef.current = null;
    }
  }, []);

  const resetJumpSessionState = useCallback((keepFailureState = false) => {
    clearScrollRetryTimers();
    pendingTargetAyahRef.current = null;
    retryAttemptRef.current = 0;
    targetVisibleStableCountRef.current = 0;
    highestMeasuredFrameIndexRef.current = 0;
    lastAverageItemLengthRef.current = 0;
    isExactJumpSessionRef.current = false;
    isContinueJumpSessionRef.current = false;
    isSearchExactJumpSessionRef.current = false;
    setIsSearchJumping(false);
    if (!keepFailureState) {
      setJumpFailureAyah(null);
    }
  }, [clearScrollRetryTimers]);

  const resetFollowSessionState = useCallback(() => {
    clearFollowRetryTimer();
    followTargetAyahRef.current = null;
    followRetryAttemptRef.current = 0;
    followTopStableTicksRef.current = 0;
    followHighestMeasuredFrameIndexRef.current = 0;
  }, [clearFollowRetryTimer]);

  useEffect(() => {
    return () => {
      activeJumpSessionIdRef.current += 1;
      activeFollowSessionIdRef.current += 1;
      resetJumpSessionState();
      resetFollowSessionState();
    };
  }, [resetFollowSessionState, resetJumpSessionState]);

  const getScrollIndexForAyah = useCallback((ayahNumber: number): number | null => {
    if (!surah) return null;
    if (effectiveViewMode === 'scroll') {
      return Math.max(0, Math.min(ayahNumber - 1, surah.ayahs.length - 1));
    }
    const pageIndex = mushafPages.findIndex((page) =>
      page.ayahs.some((ayah) => ayah.number === ayahNumber)
    );
    return pageIndex >= 0 ? pageIndex : null;
  }, [surah, effectiveViewMode, mushafPages]);

  const scrollToAyahIndex = useCallback((ayahNumber: number, animated: boolean): boolean => {
    const targetIndex = getScrollIndexForAyah(ayahNumber);
    if (targetIndex === null || !flatListRef.current) return false;

    try {
      flatListRef.current.scrollToIndex({
        index: targetIndex,
        animated,
        ...(effectiveViewMode === 'scroll' ? { viewPosition: 0 } : {}),
      });
      return true;
    } catch {
      return false;
    }
  }, [getScrollIndexForAyah, effectiveViewMode]);

  const completeJumpSession = useCallback((ayahNumber: number) => {
    const shouldSettleNotificationResume =
      resumeSource === 'notification' &&
      isContinueJumpSessionRef.current &&
      notificationResumeTargetAyahRef.current === ayahNumber;

    logJumpDev('success', {
      token: jumpToken,
      ayahNumber,
      attempt: retryAttemptRef.current,
      exactSession: isExactJumpSessionRef.current,
      searchSession: isSearchExactJumpSessionRef.current,
    });
    resetJumpSessionState();
    if (shouldSettleNotificationResume) {
      notificationResumeSettledRef.current = true;
      notificationResumeTargetAyahRef.current = null;
      lastFollowAyahRef.current = ayahNumber;
      resetFollowSessionState();
    }
  }, [jumpToken, logJumpDev, resetFollowSessionState, resetJumpSessionState, resumeSource]);

  const markJumpFailed = useCallback((ayahNumber: number, reason: string) => {
    logJumpDev('failed', { ayahNumber, reason, attempt: retryAttemptRef.current, token: jumpToken });
    if (isExactJumpSessionRef.current) {
      setJumpFailureAyah(ayahNumber);
    }
    resetJumpSessionState(true);
  }, [jumpToken, logJumpDev, resetJumpSessionState]);

  const completeFollowSession = useCallback((ayahNumber: number) => {
    logJumpDev('follow_success', {
      token: jumpToken,
      target: ayahNumber,
      attempt: followRetryAttemptRef.current,
    });
    resetFollowSessionState();
  }, [jumpToken, logJumpDev, resetFollowSessionState]);

  const markFollowFailed = useCallback((ayahNumber: number, reason: string) => {
    logJumpDev('follow_failed', {
      token: jumpToken,
      target: ayahNumber,
      reason,
      attempt: followRetryAttemptRef.current,
      highestMeasured: followHighestMeasuredFrameIndexRef.current,
    });
    resetFollowSessionState();
  }, [jumpToken, logJumpDev, resetFollowSessionState]);

  const scheduleFollowRetry = useCallback(
    (sessionId: number, ayahNumber: number, overrideDelayMs?: number) => {
      if (activeFollowSessionIdRef.current !== sessionId) return;
      if (followTargetAyahRef.current !== ayahNumber) return;
      if (followRetryAttemptRef.current >= FOLLOW_MAX_ATTEMPTS) {
        markFollowFailed(ayahNumber, 'max_attempts');
        return;
      }

      clearFollowRetryTimer();
      const delay =
        overrideDelayMs ??
        FOLLOW_RETRY_DELAYS_MS[
          Math.min(followRetryAttemptRef.current, FOLLOW_RETRY_DELAYS_MS.length - 1)
        ];

      followRetryTimerRef.current = setTimeout(() => {
        if (activeFollowSessionIdRef.current !== sessionId) return;
        if (followTargetAyahRef.current !== ayahNumber) return;

        followRetryAttemptRef.current += 1;
        const attempt = followRetryAttemptRef.current;

        logJumpDev('follow_retry', {
          token: jumpToken,
          target: ayahNumber,
          attempt,
          highestMeasured: followHighestMeasuredFrameIndexRef.current,
        });

        scrollToAyahIndex(ayahNumber, false);
        scheduleFollowRetry(sessionId, ayahNumber);
      }, delay);
    },
    [clearFollowRetryTimer, jumpToken, logJumpDev, markFollowFailed, scrollToAyahIndex]
  );

  const startAutoFollowSession = useCallback(
    (ayahNumber: number) => {
      const sessionId = ++activeFollowSessionIdRef.current;
      resetFollowSessionState();
      followTargetAyahRef.current = ayahNumber;
      lastFollowAyahRef.current = ayahNumber;
      followTopStableTicksRef.current = 0;

      logJumpDev('follow_start', {
        token: jumpToken,
        target: ayahNumber,
        sessionId,
      });

      scrollToAyahIndex(ayahNumber, false);
      scheduleFollowRetry(sessionId, ayahNumber);
    },
    [jumpToken, logJumpDev, resetFollowSessionState, scheduleFollowRetry, scrollToAyahIndex]
  );

  const scheduleBasicScroll = useCallback(
    (ayahNumber: number, firstAnimated = true, forceScrollToTop = false) => {
      clearScrollRetryTimers();
      isExactJumpSessionRef.current = false;
      pendingTargetAyahRef.current = ayahNumber;
      retryAttemptRef.current = 0;
      targetVisibleStableCountRef.current = 0;
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

  const scheduleExactJumpRetry = useCallback(
    (sessionId: number, ayahNumber: number) => {
      if (activeJumpSessionIdRef.current !== sessionId) return;
      if (pendingTargetAyahRef.current !== ayahNumber) return;
      if (viewableAyahNumbersRef.current.has(ayahNumber)) return;

      const isSearchSession = isSearchExactJumpSessionRef.current;
      const maxAttempts = isSearchSession
        ? SEARCH_MAX_SCROLL_RETRY_ATTEMPTS
        : MAX_SCROLL_RETRY_ATTEMPTS;
      if (retryAttemptRef.current >= maxAttempts) {
        markJumpFailed(ayahNumber, 'max_attempts');
        return;
      }

      const retryDelays = isSearchSession ? SEARCH_SCROLL_RETRY_DELAYS_MS : SCROLL_RETRY_DELAYS_MS;
      const delay = retryDelays[Math.min(retryAttemptRef.current, retryDelays.length - 1)];
      clearScrollRetryTimers();

      const timer = setTimeout(() => {
        if (activeJumpSessionIdRef.current !== sessionId) return;
        if (pendingTargetAyahRef.current !== ayahNumber) return;
        if (viewableAyahNumbersRef.current.has(ayahNumber)) return;

        retryAttemptRef.current += 1;
        const attempt = retryAttemptRef.current;

        const targetIndex = getScrollIndexForAyah(ayahNumber);
        if (targetIndex === null) {
          markJumpFailed(ayahNumber, 'target_missing');
          return;
        }

        logJumpDev('retry', {
          token: jumpToken,
          target: ayahNumber,
          attempt,
          firstVisible: undefined,
          highestMeasured: highestMeasuredFrameIndexRef.current,
        });

        if (isSearchSession) {
          const measuredIndex = Math.max(0, highestMeasuredFrameIndexRef.current);
          const preloadIndex = Math.max(0, targetIndex - SEARCH_PRELOAD_WINDOW);
          const coarseIndex = Math.min(targetIndex, Math.max(preloadIndex, measuredIndex));
          const averageItemLength = lastAverageItemLengthRef.current;

          if (averageItemLength > 0) {
            flatListRef.current?.scrollToOffset({
              offset: coarseIndex * averageItemLength,
              animated: false,
            });
          } else {
            try {
              flatListRef.current?.scrollToIndex({
                index: Math.min(targetIndex, coarseIndex),
                animated: false,
                ...(effectiveViewMode === 'scroll' ? { viewPosition: 0 } : {}),
              });
            } catch {
              // ignore and continue to direct target retry
            }
          }
        }

        try {
          flatListRef.current?.scrollToIndex({
            index: targetIndex,
            animated: false,
            ...(effectiveViewMode === 'scroll' ? { viewPosition: 0 } : {}),
          });
        } catch {
          scheduleExactJumpRetry(sessionId, ayahNumber);
          return;
        }
        if (!viewableAyahNumbersRef.current.has(ayahNumber)) {
          scheduleExactJumpRetry(sessionId, ayahNumber);
        }
      }, delay);

      retryTimerRef.current = timer;
    },
    [clearScrollRetryTimers, effectiveViewMode, getScrollIndexForAyah, jumpToken, logJumpDev, markJumpFailed]
  );

  const startExactJumpSession = useCallback((ayahNumber: number) => {
    const sessionId = ++activeJumpSessionIdRef.current;
    resetJumpSessionState();
    isExactJumpSessionRef.current = true;
    isContinueJumpSessionRef.current = false;
    isSearchExactJumpSessionRef.current = false;
    pendingTargetAyahRef.current = ayahNumber;
    targetVisibleStableCountRef.current = 0;

    logJumpDev('start', { token: jumpToken, ayahNumber, sessionId });

    const jumped = scrollToAyahIndex(ayahNumber, false);
    if (!jumped) {
      logJumpDev('initial_scroll_failed', { token: jumpToken, ayahNumber, sessionId });
    }
    scheduleExactJumpRetry(sessionId, ayahNumber);
  }, [jumpToken, logJumpDev, resetJumpSessionState, scheduleExactJumpRetry, scrollToAyahIndex]);

  const startSearchExactJumpSession = useCallback((ayahNumber: number) => {
    const sessionId = ++activeJumpSessionIdRef.current;
    resetJumpSessionState();
    isExactJumpSessionRef.current = false;
    isContinueJumpSessionRef.current = false;
    isSearchExactJumpSessionRef.current = true;
    pendingTargetAyahRef.current = ayahNumber;
    targetVisibleStableCountRef.current = 0;
    setIsSearchJumping(true);

    logJumpDev('search_start', { token: jumpToken, ayahNumber, sessionId });

    const jumped = scrollToAyahIndex(ayahNumber, false);
    if (!jumped) {
      logJumpDev('search_initial_scroll_failed', { token: jumpToken, ayahNumber, sessionId });
    }
    scheduleExactJumpRetry(sessionId, ayahNumber);
  }, [jumpToken, logJumpDev, resetJumpSessionState, scheduleExactJumpRetry, scrollToAyahIndex]);

  const startContinueJumpSession = useCallback((ayahNumber: number) => {
    const sessionId = ++activeJumpSessionIdRef.current;
    resetJumpSessionState();
    isExactJumpSessionRef.current = false;
    isContinueJumpSessionRef.current = true;
    isSearchExactJumpSessionRef.current = false;
    pendingTargetAyahRef.current = ayahNumber;
    targetVisibleStableCountRef.current = 0;

    logJumpDev('continue_start', { token: jumpToken, ayahNumber, sessionId });

    const jumped = scrollToAyahIndex(ayahNumber, false);
    if (!jumped) {
      logJumpDev('continue_initial_scroll_failed', { token: jumpToken, ayahNumber, sessionId });
    }
    scheduleExactJumpRetry(sessionId, ayahNumber);
  }, [jumpToken, logJumpDev, resetJumpSessionState, scheduleExactJumpRetry, scrollToAyahIndex]);

  const handleJumpRetryPress = useCallback(() => {
    if (!surah || jumpFailureAyah === null) return;
    const clampedAyah = Math.min(Math.max(jumpFailureAyah, 1), surah.ayahs.length);
    startExactJumpSession(clampedAyah);
  }, [jumpFailureAyah, startExactJumpSession, surah]);

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

    if (jumpMode === 'exact') {
      startExactJumpSession(clampedTarget);
      return;
    }
    if (jumpMode === 'search_exact') {
      startSearchExactJumpSession(clampedTarget);
      return;
    }
    if (jumpMode === 'continue') {
      startContinueJumpSession(clampedTarget);
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
    startContinueJumpSession,
    startExactJumpSession,
    startSearchExactJumpSession,
  ]);

  useEffect(() => {
    activeFollowSessionIdRef.current += 1;
    lastFollowAyahRef.current = null;
    lastReportedAyahRef.current = null;
    lastReportedPageRef.current = null;
    notificationResumeSettledRef.current = true;
    notificationResumeTargetAyahRef.current = null;
    resetFollowSessionState();
  }, [surahNumber, resetFollowSessionState]);

  // Auto-scroll to currently playing ayah so it stays at the top of the screen (one after another)
  useEffect(() => {
    if (
      !surah ||
      !activePlayingAyah ||
      effectiveViewMode !== 'scroll'
    ) {
      activeFollowSessionIdRef.current += 1;
      lastFollowAyahRef.current = null;
      resetFollowSessionState();
      return;
    }

    const targetAyah = activePlayingAyah;
    if (!notificationResumeSettledRef.current) {
      if (notificationResumeTargetAyahRef.current === targetAyah) {
        return;
      }
      notificationResumeSettledRef.current = true;
      notificationResumeTargetAyahRef.current = null;
    }
    if (lastFollowAyahRef.current === targetAyah) {
      return;
    }

    startAutoFollowSession(targetAyah);
  }, [
    surah,
    activePlayingAyah,
    surahNumber,
    effectiveViewMode,
    resetFollowSessionState,
    startAutoFollowSession,
  ]);

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

      const firstVisible = viewableItems.find((token) => {
        const ayahNumber = token.item?.number;
        return typeof ayahNumber === 'number' && Number.isFinite(ayahNumber) && ayahNumber > 0;
      })?.item;
      const firstVisibleAyah = firstVisible?.number;

      if (effectiveViewMode === 'scroll' && followTargetAyahRef.current) {
        const targetAyah = followTargetAyahRef.current;
        const followSessionId = activeFollowSessionIdRef.current;

        if (firstVisibleAyah === targetAyah) {
          followTopStableTicksRef.current += 1;
          if (followTopStableTicksRef.current >= FOLLOW_VISIBLE_STABLE_TICKS) {
            completeFollowSession(targetAyah);
          } else {
            clearFollowRetryTimer();
            followRetryTimerRef.current = setTimeout(() => {
              if (activeFollowSessionIdRef.current !== followSessionId) return;
              if (followTargetAyahRef.current !== targetAyah) return;
              scrollToAyahIndex(targetAyah, false);
            }, 120);
          }
        } else {
          followTopStableTicksRef.current = 0;
        }
      }

      if (
        effectiveViewMode === 'scroll' &&
        pendingTargetAyahRef.current
      ) {
        const targetAyah = pendingTargetAyahRef.current;
        const currentSessionId = activeJumpSessionIdRef.current;
        const isExactJump = isExactJumpSessionRef.current;
        const isSearchExactJump = isSearchExactJumpSessionRef.current;

        if (__DEV__ && (isExactJump || isSearchExactJump)) {
          logJumpDev('attempt', {
            token: jumpToken,
            target: targetAyah,
            attempt: retryAttemptRef.current,
            firstVisible: firstVisibleAyah,
            highestMeasured: highestMeasuredFrameIndexRef.current,
            searchMode: isSearchExactJump,
          });
        }

        if (isExactJump) {
          if (firstVisibleAyah === targetAyah) {
            targetVisibleStableCountRef.current += 1;
            if (targetVisibleStableCountRef.current >= JUMP_VISIBLE_STABLE_TICKS) {
              scrollToAyahIndex(targetAyah, false);
              completeJumpSession(targetAyah);
            } else {
              clearScrollRetryTimers();
              const stabilityTimer = setTimeout(() => {
                if (activeJumpSessionIdRef.current !== currentSessionId) return;
                if (pendingTargetAyahRef.current !== targetAyah) return;
                scrollToAyahIndex(targetAyah, false);
              }, 120);
              retryTimerRef.current = stabilityTimer;
            }
          } else {
            targetVisibleStableCountRef.current = 0;
          }
        } else if (isSearchExactJump) {
          if (visible.has(targetAyah)) {
            targetVisibleStableCountRef.current += 1;
            if (targetVisibleStableCountRef.current >= SEARCH_VISIBLE_STABLE_TICKS) {
              scrollToAyahIndex(targetAyah, false);
              completeJumpSession(targetAyah);
            }
          } else {
            targetVisibleStableCountRef.current = 0;
          }
        } else {
          if (visible.has(targetAyah)) {
            targetVisibleStableCountRef.current += 1;
            if (targetVisibleStableCountRef.current >= JUMP_VISIBLE_STABLE_TICKS) {
              completeJumpSession(targetAyah);
            } else {
              clearScrollRetryTimers();
              const stabilityTimer = setTimeout(() => {
                if (activeJumpSessionIdRef.current !== currentSessionId) return;
                if (pendingTargetAyahRef.current !== targetAyah) return;
                if (!viewableAyahNumbersRef.current.has(targetAyah)) {
                  targetVisibleStableCountRef.current = 0;
                  scheduleExactJumpRetry(currentSessionId, targetAyah);
                  return;
                }
                targetVisibleStableCountRef.current += 1;
                if (targetVisibleStableCountRef.current >= JUMP_VISIBLE_STABLE_TICKS) {
                  completeJumpSession(targetAyah);
                }
              }, 120);
              retryTimerRef.current = stabilityTimer;
            }
          } else {
            targetVisibleStableCountRef.current = 0;
          }
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
          lastFollowAyahRef.current = firstVisible.number;
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
      clearFollowRetryTimer,
      clearScrollRetryTimers,
      completeFollowSession,
      completeJumpSession,
      effectiveViewMode,
      getPage,
      jumpToken,
      logJumpDev,
      onAyahChange,
      onPageChange,
      scheduleExactJumpRetry,
      scrollToAyahIndex,
      surahNumber,
      updatePosition,
    ]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 500,
  });

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      if (!flatListRef.current) return;
      const followTargetAyah = followTargetAyahRef.current;
      if (followTargetAyah && effectiveViewMode === 'scroll') {
        const followSessionId = activeFollowSessionIdRef.current;
        const highest = Math.max(
          followHighestMeasuredFrameIndexRef.current,
          info.highestMeasuredFrameIndex
        );
        followHighestMeasuredFrameIndexRef.current = highest;

        logJumpDev('follow_scroll_to_index_failed', {
          token: jumpToken,
          targetAyah: followTargetAyah,
          infoIndex: info.index,
          highestMeasuredFrameIndex: info.highestMeasuredFrameIndex,
          attempt: followRetryAttemptRef.current,
        });

        try {
          flatListRef.current.scrollToIndex({
            index: highest,
            animated: false,
          });
        } catch {
          // ignore
        }

        scheduleFollowRetry(followSessionId, followTargetAyah, 70);
        return;
      }

      const targetAyah = pendingTargetAyahRef.current;
      if (!targetAyah) return;
      const highest = Math.max(
        highestMeasuredFrameIndexRef.current,
        info.highestMeasuredFrameIndex
      );
      highestMeasuredFrameIndexRef.current = highest;
      if (Number.isFinite(info.averageItemLength) && info.averageItemLength > 0) {
        lastAverageItemLengthRef.current = info.averageItemLength;
      }

      const targetIndex = getScrollIndexForAyah(targetAyah) ?? info.index;
      clearScrollRetryTimers();

      const isContinueJump = isContinueJumpSessionRef.current;
      const isSearchJump = isSearchExactJumpSessionRef.current;
      if (!isExactJumpSessionRef.current && !isContinueJump && !isSearchJump) {
        const timer = setTimeout(() => {
          scrollToAyahIndex(targetAyah, true);
        }, 120);
        retryTimerRef.current = timer;
        return;
      }

      logJumpDev('scroll_to_index_failed', {
        token: jumpToken,
        targetAyah,
        targetIndex,
        infoIndex: info.index,
        highestMeasuredFrameIndex: info.highestMeasuredFrameIndex,
        averageItemLength: info.averageItemLength,
        searchMode: isSearchJump,
      });
      try {
        flatListRef.current.scrollToIndex({
          index: highest,
          animated: false,
        });
      } catch {
        // ignore
      }
      scheduleExactJumpRetry(activeJumpSessionIdRef.current, targetAyah);
    },
    [
      clearScrollRetryTimers,
      effectiveViewMode,
      getScrollIndexForAyah,
      jumpToken,
      logJumpDev,
      scheduleExactJumpRetry,
      scheduleFollowRetry,
      scrollToAyahIndex,
    ]
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
      const isPlaying = activePlayingAyah === item.number;

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
    [surahNumber, getTranslation, activePlayingAyah, handlePlayAyah]
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
                    activePlayingAyah === ayah.number && {
                      backgroundColor: `${theme.playing}20`,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <CenteredText
                    allowFontScaling={false}
                    textBreakStrategy="simple"
                    lineBreakStrategyIOS="none"
                    style={[
                      styles.mushafAyahText,
                      {
                        fontFamily: quranFontFamily,
                        color: theme.arabicText,
                        fontSize: Typography.arabic[arabicFontSize],
                      },
                    ]}
                  >
                    {stripBismillah(stripQuranicMarks(ayah.text, state.preferences.quranFont), surahNumber, ayah.number)}
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
  }, [surah, mushafPages, surahNumber, theme, arabicFontSize, activePlayingAyah, handlePlayAyah, quranFontFamily, state.preferences.quranFont]);

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
      <View style={[styles.container, { backgroundColor: theme.background }]}>
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
          initialNumToRender={STABLE_LIST_RENDER_CONFIG.initialNumToRender}
          maxToRenderPerBatch={STABLE_LIST_RENDER_CONFIG.maxToRenderPerBatch}
          windowSize={STABLE_LIST_RENDER_CONFIG.windowSize}
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
    letterSpacing: 0,
    paddingBottom: 5, // Prevents text cut-off at bottom
  },
  ayahEndMark: {
    fontSize: 16,
    fontWeight: '600',
  },
});
