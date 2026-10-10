/**
 * Quran Reader Screen
 * Displays individual surah with MushafView and AudioPlayer
 * No English - All Arabic/Dari
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';

import { View, StyleSheet, Pressable, Alert, BackHandler } from 'react-native';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useQuranData } from '@/hooks/useQuranData';
import { pinSurahInCache } from '@/hooks/useSurahData';
import { getQuranFontFamily } from '@/hooks/useFonts';
import { MushafView, AudioPlayer, Hifz16View, QuranDownloadCard } from '@/components/quran';
import audioManager, { getQuranPlaybackErrorMessage } from '@/utils/quranAudio';
import { findHifzPageForAyah, getHifzPage, getHifzSurahStartPage, HIFZ16_PAGE_COUNT } from '@/utils/hifz16';
import {
  getDownloadManifest,
  getDownloadManifestKey,
  getJuzDownloadScope,
  getPreferredDownloadReciter,
  getSurahDownloadScope,
} from '@/utils/quranDownloadService';
import { Spacing } from '@/constants/theme';
import { getSurah as getSurahName, toArabicNumerals } from '@/data/surahNames';
import AppCenteredText from '@/components/CenteredText';
import { backIconName, directionStyle, forwardChevronName } from '@/utils/i18n/direction';
import { useI18n } from '@/utils/i18n/useI18n';
import { isRtlLanguage } from '@/utils/i18n/languages';
import { QuranReaderSettingsSheet } from '@/components/quran/QuranReaderSettingsSheet';
import { useQuranReaderSettings } from '@/hooks/useQuranReaderSettings';

const SURAH_TOP_BAR_HEIGHT = 56;
const QURAN_AUDIO_PLAYER_RESERVED_HEIGHT = 148;
const QURAN_FONT_SIZES = ['small', 'medium', 'large', 'xlarge'] as const;

type ForcedHifzTarget = {
  page: number;
  surah: number;
  ayah: number;
};

export default function QuranReaderScreen() {
  const {
    surah: surahParam,
    ayah: ayahParam,
    hifzPage: hifzPageParam,
    jump: jumpParam,
    jumpToken: jumpTokenParam,
    resumeSource: resumeSourceParam,
  } = useLocalSearchParams<{
    surah: string | string[];
    ayah?: string | string[];
    hifzPage?: string | string[];
    jump?: string | string[];
    jumpToken?: string | string[];
    resumeSource?: string | string[];
  }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, state, setHifz16Line } = useApp();
  const { t, n, language } = useI18n();
  const { getSurah } = useQuranData();
  const quranFontFamily = getQuranFontFamily(state.preferences.quranFont);
  const hifz16Line = state.preferences.hifz16Line;
  const backIcon = backIconName(language);
  const nextSurahIcon = forwardChevronName(language);
  const prevSurahIcon = isRtlLanguage(language) ? 'chevron-right' : 'chevron-left';
  const { tokens: readerTokens } = useQuranReaderSettings();

  const normalizedSurahParam = Array.isArray(surahParam) ? surahParam[0] : surahParam;
  const normalizedAyahParam = Array.isArray(ayahParam) ? ayahParam[0] : ayahParam;
  const normalizedHifzPageParam = Array.isArray(hifzPageParam) ? hifzPageParam[0] : hifzPageParam;
  const normalizedJumpParam = Array.isArray(jumpParam) ? jumpParam[0] : jumpParam;
  const normalizedJumpToken = Array.isArray(jumpTokenParam) ? jumpTokenParam[0] : jumpTokenParam;
  const normalizedResumeSource = Array.isArray(resumeSourceParam) ? resumeSourceParam[0] : resumeSourceParam;

  const parsedSurahNumber = Number.parseInt(normalizedSurahParam ?? '', 10);
  const surahNumber = Number.isFinite(parsedSurahNumber) && parsedSurahNumber > 0
    ? parsedSurahNumber
    : 1;

  const parsedAyahNumber = Number.parseInt(normalizedAyahParam ?? '', 10);
  const initialAyah = Number.isFinite(parsedAyahNumber) && parsedAyahNumber > 0
    ? parsedAyahNumber
    : 1;
  const parsedHifzPage = Number.parseInt(normalizedHifzPageParam ?? '', 10);
  const requestedHifzPage = Number.isFinite(parsedHifzPage) && getHifzPage(parsedHifzPage)
    ? parsedHifzPage
    : null;
  const jumpMode: 'default' | 'exact' | 'continue' | 'search_exact' =
    normalizedJumpParam === 'exact'
      ? 'exact'
      : normalizedJumpParam === 'continue'
        ? 'continue'
        : normalizedJumpParam === 'search_exact'
          ? 'search_exact'
          : 'default';
  // The 16-line page does not use the translation file. Parsing it here, especially
  // Baqarah, blocked the first paint of the mushaf.
  const surah = useMemo(
    () => (hifz16Line ? undefined : getSurah(surahNumber)),
    [getSurah, hifz16Line, surahNumber],
  );
  const [hifzVisibleSurah, setHifzVisibleSurah] = useState(surahNumber);
  const [hifzVisibleAyah, setHifzVisibleAyah] = useState(initialAyah);
  const [translationVisibleAyah, setTranslationVisibleAyah] = useState(initialAyah);
  const [hifzVisiblePage, setHifzVisiblePage] = useState<number | null>(() =>
    requestedHifzPage ?? findHifzPageForAyah(surahNumber, initialAyah),
  );
  const [hifzOnDedication, setHifzOnDedication] = useState(false);
  const [hifzOnKhatm, setHifzOnKhatm] = useState(false);
  const [hifzOnCredits, setHifzOnCredits] = useState(false);
  const [forcedHifz, setForcedHifz] = useState<ForcedHifzTarget | null>(null);
  // Surah whose recitation this screen started. Playback of that surah keeps
  // the highlight and the player even after a swipe leaves the route surah.
  const followedPlaybackSurahRef = useRef<number | null>(null);
  const headerSurahNumber = hifz16Line ? hifzVisibleSurah : surahNumber;
  const surahNameData = getSurahName(headerSurahNumber);

  const onHifzVisiblePosition = useCallback((nextSurah: number, ayah: number, page?: number) => {
    if (page === 0) {
      setHifzOnDedication(true);
      setHifzOnKhatm(false);
      setHifzOnCredits(false);
      return;
    }
    if (page === HIFZ16_PAGE_COUNT + 1) {
      setHifzOnKhatm(true);
      setHifzOnDedication(false);
      setHifzOnCredits(false);
      return;
    }
    if (page === HIFZ16_PAGE_COUNT + 2) {
      setHifzOnCredits(true);
      setHifzOnDedication(false);
      setHifzOnKhatm(false);
      return;
    }
    setHifzOnDedication(false);
    setHifzOnKhatm(false);
    setHifzOnCredits(false);
    setHifzVisibleSurah(nextSurah);
    setHifzVisibleAyah(ayah);
    if (typeof page === 'number' && page > 0) setHifzVisiblePage(page);
  }, []);

  useEffect(() => {
    setHifzVisibleSurah(surahNumber);
    setHifzVisibleAyah(initialAyah);
    setTranslationVisibleAyah(initialAyah);
    setHifzVisiblePage(requestedHifzPage ?? findHifzPageForAyah(surahNumber, initialAyah));
    setHifzOnDedication(false);
    setHifzOnKhatm(false);
    setHifzOnCredits(false);
    setForcedHifz((current) => {
      if (!current) return null;
      const sameTarget = current.surah === surahNumber
        && current.ayah === initialAyah
        && (requestedHifzPage == null || current.page === requestedHifzPage);
      return sameTarget ? current : null;
    });
  }, [initialAyah, requestedHifzPage, surahNumber]);

  useEffect(() => {
    if (!hifz16Line) {
      setHifzOnDedication(false);
      setHifzOnKhatm(false);
      setHifzOnCredits(false);
    }
  }, [hifz16Line]);

  useEffect(() => {
    pinSurahInCache(surahNumber);
    return () => {
      pinSurahInCache(null);
    };
  }, [surahNumber]);

  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [playerHeight, setPlayerHeight] = useState(QURAN_AUDIO_PLAYER_RESERVED_HEIGHT);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<{
    surah: number;
    ayah: number;
  } | null>(null);
  const [shouldGoBack, setShouldGoBack] = useState(false);
  const [showDownloadSheet, setShowDownloadSheet] = useState(false);
  const [surahDownloaded, setSurahDownloaded] = useState(false);
  const [downloadBadgeNonce, setDownloadBadgeNonce] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const downloadSurahNumber = (hifz16Line ? hifzVisibleSurah : surahNumber) || surahNumber;
  const downloadSurahMeta = getSurahName(downloadSurahNumber);
  const surahScope = useMemo(
    () => getSurahDownloadScope(downloadSurahNumber, downloadSurahMeta?.ayahCount),
    [downloadSurahMeta?.ayahCount, downloadSurahNumber],
  );
  const hifzPageNumber = hifzVisiblePage ?? findHifzPageForAyah(hifzVisibleSurah, hifzVisibleAyah);
  const hifzJuz = hifz16Line && !hifzOnDedication && hifzPageNumber
    ? getHifzPage(hifzPageNumber)?.juz ?? null
    : null;
  const juzScope = useMemo(
    () => (hifzJuz ? getJuzDownloadScope(hifzJuz) : null),
    [hifzJuz],
  );
  const surahChoiceLabel = downloadSurahMeta
    ? `${t('quran.mode.surah')} ${
        language === 'english'
          ? downloadSurahMeta.english
          : language === 'turkish'
            ? downloadSurahMeta.turkish
            : language === 'arabic'
              ? downloadSurahMeta.arabic
              : language === 'pashto'
                ? downloadSurahMeta.pashto
                : downloadSurahMeta.dari
      }`
    : t('quran.mode.surah');
  const downloadScopeChoices = useMemo(() => {
    if (!hifz16Line || hifzOnDedication || !juzScope || hifzJuz == null) return undefined;
    return [
      { label: surahChoiceLabel, scope: surahScope },
      { label: `${t('quran.mode.juz')} ${n(hifzJuz)}`, scope: juzScope },
    ];
  }, [hifz16Line, hifzJuz, hifzOnDedication, juzScope, n, surahChoiceLabel, surahScope, t]);
  const downloadDisabled = hifz16Line && hifzOnDedication;

  useEffect(() => {
    let mounted = true;
    void Promise.all([getPreferredDownloadReciter(), getDownloadManifest()]).then(([preferred, entries]) => {
      if (!mounted) return;
      const entry = entries.find((item) => item.key === getDownloadManifestKey(preferred, surahScope));
      setSurahDownloaded(Boolean(entry && entry.completed === entry.total && entry.total > 0));
    });
    return () => {
      mounted = false;
    };
  }, [downloadBadgeNonce, surahScope]);

  const isFollowedSurah = useCallback((surah: number) => (
    surah === surahNumber || surah === followedPlaybackSurahRef.current
  ), [surahNumber]);

  const syncFromAudioSnapshot = useCallback(() => {
    const snapshot = audioManager.getPlaybackSnapshot();
    const hasAudioPosition =
      snapshot.isActive && snapshot.scopeType != null && snapshot.surah > 0 && snapshot.ayah > 0;
    const isMatchingSurah = hasAudioPosition && snapshot.surah === surahNumber;
    // A surah opened from the list stays on its own page. Audio from another
    // surah pulls the 16-line reader only when this screen started it.
    const hifzFollows = hifz16Line && hasAudioPosition && isFollowedSurah(snapshot.surah);

    // Translation keeps the opened surah. Playing a different surah must not
    // rewrite this route, or picking another item from the list snaps back.
    if (!hifzFollows && !isMatchingSurah) {
      if (!hifz16Line && hasAudioPosition) {
        setCurrentlyPlaying({ surah: snapshot.surah, ayah: snapshot.ayah });
        setShowAudioPlayer(true);
        setIsPlaying(snapshot.isPlaying);
        return;
      }
      setIsPlaying(false);
      setCurrentlyPlaying(null);
      setShowAudioPlayer(false);
      return;
    }

    setCurrentlyPlaying((previous) => (
      previous?.surah === snapshot.surah && previous.ayah === snapshot.ayah
        ? previous
        : { surah: snapshot.surah, ayah: snapshot.ayah }
    ));
    setShowAudioPlayer(true);
    setIsPlaying(snapshot.isPlaying);
  }, [hifz16Line, isFollowedSurah, surahNumber]);

  const handleTranslationPositionChange = useCallback((nextSurah: number, nextAyah: number) => {
    if (nextSurah === surahNumber && nextAyah > 0) setTranslationVisibleAyah(nextAyah);
  }, [surahNumber]);

  useEffect(() => {
    if (hifz16Line || surah || shouldGoBack) return;
    setShouldGoBack(true);
  }, [hifz16Line, surah, shouldGoBack]);

  const goBackToList = useCallback(() => {
    if (navigation.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/quran-tab');
  }, [navigation, router]);

  useEffect(() => {
    if (!shouldGoBack) return;
    goBackToList();
  }, [goBackToList, shouldGoBack]);

  // Opened cold from a notification or link, the stack has nothing below this
  // screen and Android's back gesture would close the app instead of the reader.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (navigation.canGoBack()) return false;
        router.replace('/(tabs)/quran-tab');
        return true;
      });
      return () => subscription.remove();
    }, [navigation, router])
  );

  // Horizontal page turns own both screen edges in the 16-line mushaf; an iOS
  // edge swipe must never also pop the reader or the stack beneath it.
  useEffect(() => {
    const parent = navigation.getParent();
    navigation.setOptions({ gestureEnabled: !hifz16Line });
    parent?.setOptions({ gestureEnabled: !hifz16Line });
  }, [hifz16Line, navigation]);

  useEffect(() => {
    void audioManager.initialize();
  }, []);

  useFocusEffect(
    useCallback(() => {
      audioManager.setOnAyahChange((s, a) => {
        if (!isFollowedSurah(s)) return;
        setCurrentlyPlaying((previous) => (
          previous?.surah === s && previous.ayah === a
            ? previous
            : { surah: s, ayah: a }
        ));
        setShowAudioPlayer(true);
        setIsPlaying(true);
      });

      audioManager.setOnPlaybackEnd(() => {
        followedPlaybackSurahRef.current = null;
        setIsPlaying(false);
        setCurrentlyPlaying(null);
        setShowAudioPlayer(false);
      });

      const unsubscribe = audioManager.subscribe(() => {
        syncFromAudioSnapshot();
      });

      syncFromAudioSnapshot();

      return () => {
        unsubscribe();
        audioManager.setOnAyahChange(null);
        audioManager.setOnPlaybackEnd(null);
      };
    }, [isFollowedSurah, syncFromAudioSnapshot])
  );

  const handlePlayAyah = useCallback((surahNum: number, ayahNum: number) => {
    if (!surah) return;

    const isSameAyah =
      currentlyPlaying?.surah === surahNum && currentlyPlaying?.ayah === ayahNum;

    if (isSameAyah && audioManager.getIsPlaying()) {
      followedPlaybackSurahRef.current = null;
      setIsPlaying(false);
      setCurrentlyPlaying(null);
      setShowAudioPlayer(false);
      void audioManager.stop();
      return;
    }

    if (
      isSameAyah &&
      !audioManager.getIsPlaying() &&
      audioManager.getPlaybackSnapshot().isActive &&
      audioManager.getCurrentSurah() === surahNum &&
      audioManager.getCurrentAyah() === ayahNum
    ) {
      followedPlaybackSurahRef.current = surahNum;
      setIsPlaying(true);
      setShowAudioPlayer(true);
      void audioManager.resume();
      return;
    }

    followedPlaybackSurahRef.current = surahNum;
    setCurrentlyPlaying({ surah: surahNum, ayah: ayahNum });
    setShowAudioPlayer(true);
    setIsPlaying(true);
    void audioManager
      .playAyah(surahNum, ayahNum, surah.ayahs.length, true, true, {
        type: 'surah',
        startAyah: 1,
        endAyah: surah.ayahs.length,
      })
      .catch((error) => {
        Alert.alert(t('quran.audio.playAyah'), getQuranPlaybackErrorMessage(error, language));
      });
  }, [surah, currentlyPlaying, t]);

  const handleHifzPlayAyah = useCallback((surahNum: number, ayahNum: number) => {
    const ayahCount = getSurahName(surahNum)?.ayahCount ?? getSurah(surahNum)?.ayahs.length;
    if (!ayahCount) return;

    const isSameAyah =
      currentlyPlaying?.surah === surahNum && currentlyPlaying?.ayah === ayahNum;

    if (isSameAyah && audioManager.getIsPlaying()) {
      followedPlaybackSurahRef.current = null;
      setIsPlaying(false);
      setCurrentlyPlaying(null);
      setShowAudioPlayer(false);
      void audioManager.stop();
      return;
    }

    if (
      isSameAyah &&
      audioManager.getPlaybackSnapshot().isActive &&
      audioManager.getCurrentSurah() === surahNum &&
      audioManager.getCurrentAyah() === ayahNum
    ) {
      followedPlaybackSurahRef.current = surahNum;
      setIsPlaying(true);
      setShowAudioPlayer(true);
      void audioManager.resume();
      return;
    }

    followedPlaybackSurahRef.current = surahNum;
    setCurrentlyPlaying({ surah: surahNum, ayah: ayahNum });
    setShowAudioPlayer(true);
    setIsPlaying(true);
    void audioManager
      .playAyah(surahNum, ayahNum, ayahCount, true, true, {
        type: 'surah',
        startAyah: 1,
        endAyah: ayahCount,
      })
      .catch((error) => {
        Alert.alert(t('quran.audio.playAyah'), getQuranPlaybackErrorMessage(error, language));
      });
  }, [currentlyPlaying, getSurah, language, t]);

  const handlePlayContinuous = useCallback(() => {
    const playSurah = hifz16Line && currentlyPlaying ? currentlyPlaying.surah : surahNumber;
    const playAyah = currentlyPlaying?.surah === playSurah ? currentlyPlaying.ayah : initialAyah;
    const ayahCount = getSurahName(playSurah)?.ayahCount ?? getSurah(playSurah)?.ayahs.length;
    if (!ayahCount) return;

    followedPlaybackSurahRef.current = playSurah;
    setCurrentlyPlaying({ surah: playSurah, ayah: playAyah });
    setShowAudioPlayer(true);
    setIsPlaying(true);
    void audioManager
      .playAyah(playSurah, playAyah, ayahCount, true, true, {
        type: 'surah',
        startAyah: 1,
        endAyah: ayahCount,
      })
      .catch((error) => {
        Alert.alert(t('quran.audio.playAyah'), getQuranPlaybackErrorMessage(error, language));
      });
  }, [currentlyPlaying, getSurah, hifz16Line, initialAyah, language, surahNumber, t]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    void audioManager.pause();
  }, []);

  const handleResume = useCallback(() => {
    setIsPlaying(true);
    void audioManager.resume();
  }, []);

  const handleStop = useCallback(() => {
    followedPlaybackSurahRef.current = null;
    setIsPlaying(false);
    setCurrentlyPlaying(null);
    setShowAudioPlayer(false);
    void audioManager.stop();
  }, []);

  const handleAudioClose = useCallback(() => {
    handleStop();
  }, [handleStop]);

  const activeAyahNumber = currentlyPlaying?.surah === surahNumber ? currentlyPlaying.ayah : null;

  const goToNextSurah = useCallback(async () => {
    if (surahNumber < 114) {
      await audioManager.stop();
      followedPlaybackSurahRef.current = null;
      setShowAudioPlayer(false);
      setCurrentlyPlaying(null);
      setIsPlaying(false);
      setForcedHifz(null);
      const nextSurah = surahNumber + 1;
      router.replace(hifz16Line
        ? `/quran/${nextSurah}?ayah=1&hifzPage=${getHifzSurahStartPage(nextSurah)}`
        : `/quran/${nextSurah}`);
    }
  }, [hifz16Line, surahNumber, router]);

  const goToPrevSurah = useCallback(async () => {
    if (surahNumber > 1) {
      await audioManager.stop();
      followedPlaybackSurahRef.current = null;
      setShowAudioPlayer(false);
      setCurrentlyPlaying(null);
      setIsPlaying(false);
      setForcedHifz(null);
      const previousSurah = surahNumber - 1;
      router.replace(hifz16Line
        ? `/quran/${previousSurah}?ayah=1&hifzPage=${getHifzSurahStartPage(previousSurah)}`
        : `/quran/${previousSurah}`);
    }
  }, [hifz16Line, surahNumber, router]);

  const resolveModeSwitchTarget = useCallback(() => {
    const snapshot = audioManager.getPlaybackSnapshot();
    const hasAudioPosition = snapshot.isActive
      && snapshot.scopeType != null
      && snapshot.surah > 0
      && snapshot.ayah > 0;
    const audioFollowed = hasAudioPosition && isFollowedSurah(snapshot.surah);
    if (audioFollowed) {
      return {
        surah: snapshot.surah,
        ayah: snapshot.ayah,
        audioFollowed: true,
        isPlaying: snapshot.isPlaying,
      };
    }
    if (hifz16Line) {
      return {
        surah: hifzVisibleSurah,
        ayah: Math.max(1, hifzVisibleAyah),
        audioFollowed: false,
        isPlaying: false,
      };
    }
    return {
      surah: surahNumber,
      ayah: Math.max(1, translationVisibleAyah),
      audioFollowed: false,
      isPlaying: false,
    };
  }, [
    hifz16Line,
    hifzVisibleAyah,
    hifzVisibleSurah,
    isFollowedSurah,
    surahNumber,
    translationVisibleAyah,
  ]);

  const switchToTranslation = useCallback(() => {
    if (!hifz16Line) return;
    const target = resolveModeSwitchTarget();
    setCurrentlyPlaying(target.audioFollowed ? { surah: target.surah, ayah: target.ayah } : null);
    setIsPlaying(target.audioFollowed && target.isPlaying);
    setShowAudioPlayer(target.audioFollowed);
    setForcedHifz(null);
    setHifz16Line(false);
    router.setParams({
      surah: String(target.surah),
      ayah: String(target.ayah),
      jump: 'exact',
      jumpToken: `mode-${target.surah}-${target.ayah}-${Date.now()}`,
      hifzPage: undefined,
    });
  }, [hifz16Line, resolveModeSwitchTarget, router, setHifz16Line]);

  const switchToHifz16 = useCallback(() => {
    if (hifz16Line) return;
    const target = resolveModeSwitchTarget();
    setCurrentlyPlaying(target.audioFollowed ? { surah: target.surah, ayah: target.ayah } : null);
    setIsPlaying(target.audioFollowed && target.isPlaying);
    setShowAudioPlayer(target.audioFollowed);
    const targetPage = findHifzPageForAyah(target.surah, target.ayah)
      ?? getHifzSurahStartPage(target.surah);
    // Set the page before flipping the view so Hifz16 never mounts on a stale
    // URL hifzPage (index 0 used to be mushaf page 548).
    setForcedHifz({ page: targetPage, surah: target.surah, ayah: target.ayah });
    setHifz16Line(true);
    router.setParams({
      surah: String(target.surah),
      ayah: String(target.ayah),
      hifzPage: String(targetPage),
    });
  }, [hifz16Line, resolveModeSwitchTarget, router, setHifz16Line]);

  const surahName = hifz16Line && hifzOnDedication
    ? t('quran.hifz.dedicationTitle')
    : hifz16Line && hifzOnKhatm
      ? t('quran.hifz.khatmTitle')
      : hifz16Line && hifzOnCredits
        ? t('quran.hifz.creditsTitle')
        : surahNameData
          ? `سورة ${surahNameData.arabic}`
          : `سوره ${toArabicNumerals(headerSurahNumber)}`;

  const contentPaddingTop = insets.top + SURAH_TOP_BAR_HEIGHT + Spacing.sm;
  const contentPaddingBottom = hifz16Line
    ? insets.bottom + 64
    : showAudioPlayer
      ? playerHeight
      : Spacing.xxl;

  // Reader mode is a persisted Quran preference. Keep the screen inert until
  // AsyncStorage has resolved it so a launch-time tap cannot be applied to
  // the temporary default and then overwritten by hydration.
  if (!state.isInitialized || shouldGoBack || (!hifz16Line && !surah)) {
    return (
      <View testID="quran-reader-loading" style={[styles.container, { backgroundColor: readerTokens.page }]}>
        <AppCenteredText style={[styles.loadingText, { color: theme.textSecondary }]}>
          در حال بارگذاری...
        </AppCenteredText>
      </View>
    );
  }

  return (
    <View
      testID="quran-reader-ready"
      style={[styles.container, { backgroundColor: readerTokens.page }]}
    >
      <StatusBar style={readerTokens.isDark ? 'light' : 'dark'} />

      <View
        style={[
          styles.topBar,
          directionStyle(language),
          {
            paddingTop: insets.top,
            height: insets.top + SURAH_TOP_BAR_HEIGHT,
            backgroundColor: readerTokens.page,
          },
        ]}
      >
        <Pressable
          testID="quran-reader-back-to-list"
          accessibilityRole="button"
          onPress={goBackToList}
          hitSlop={8}
          style={styles.topBarBackButton}
        >
          <View style={styles.iconLtr}>
            <MaterialIcons name={backIcon} size={24} color={readerTokens.text} />
          </View>
        </Pressable>
        <LocalizedText testID="quran-reader-surah-title" style={[styles.topBarTitle, { fontFamily: quranFontFamily, color: readerTokens.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
          {surahName}
        </LocalizedText>
        <View style={styles.topBarNav}>
          <Pressable
            testID="quran-reader-download"
            accessibilityLabel={surahDownloaded ? t('quran.downloaded') : t('quran.download.action')}
            accessibilityState={{ disabled: downloadDisabled }}
            disabled={downloadDisabled}
            onPress={() => setShowDownloadSheet(true)}
            hitSlop={8}
            style={[
              styles.topBarDownloadButton,
              {
                backgroundColor: readerTokens.surface,
                opacity: downloadDisabled ? 0.4 : 1,
              },
            ]}
          >
            <MaterialIcons name={surahDownloaded ? 'check-circle' : 'download'} size={20} color={readerTokens.accent} />
          </Pressable>
          <View style={[styles.modeSwitch, { borderColor: readerTokens.border }]}>
            <Pressable
              testID="quran-reader-translation"
              accessibilityLabel={t('quran.reading.translation')}
              accessibilityState={{ selected: !hifz16Line }}
              onPress={switchToTranslation}
              hitSlop={4}
              style={[
                styles.modeSegment,
                !hifz16Line && [styles.modeSegmentActive, { backgroundColor: readerTokens.surface }],
              ]}
            >
              <LocalizedText
                style={[
                  styles.modeSegmentText,
                  { color: !hifz16Line ? readerTokens.accent : readerTokens.textSecondary },
                  !hifz16Line && styles.modeSegmentTextActive,
                ]}
                numberOfLines={1}
              >
                {t('quran.reading.translation')}
              </LocalizedText>
            </Pressable>
            <Pressable
              testID="quran-reader-hifz16"
              accessibilityLabel={t('quran.reading.hifz16')}
              accessibilityState={{ selected: hifz16Line }}
              onPress={switchToHifz16}
              hitSlop={4}
              style={[
                styles.modeSegment,
                hifz16Line && [styles.modeSegmentActive, { backgroundColor: readerTokens.surface }],
              ]}
            >
              <LocalizedText
                style={[
                  styles.modeSegmentText,
                  { color: hifz16Line ? readerTokens.accent : readerTokens.textSecondary },
                  hifz16Line && styles.modeSegmentTextActive,
                ]}
                numberOfLines={1}
              >
                {t('quran.reading.hifz16.chip')}
              </LocalizedText>
            </Pressable>
          </View>
          <Pressable testID="quran-reader-settings" onPress={() => setSettingsOpen(true)} hitSlop={8}>
            <MaterialIcons name="tune" size={22} color={readerTokens.accent} />
          </Pressable>
          <View style={[styles.surahNavigationGroup, { backgroundColor: readerTokens.surface, borderColor: readerTokens.border }]}>
            <Pressable
              testID="quran-reader-previous-surah"
              accessibilityRole="button"
              accessibilityLabel={t('quran.surah.previous')}
              disabled={surahNumber <= 1}
              onPress={goToPrevSurah}
              hitSlop={4}
              style={[styles.surahNavigationButton, surahNumber <= 1 && styles.surahNavigationDisabled]}
            >
              <View style={styles.iconLtr}>
                <MaterialIcons name={prevSurahIcon} size={22} color={readerTokens.text} />
              </View>
            </Pressable>
            <Pressable
              testID="quran-reader-next-surah"
              accessibilityRole="button"
              accessibilityLabel={t('quran.surah.next')}
              disabled={surahNumber >= 114}
              onPress={goToNextSurah}
              hitSlop={4}
              style={[styles.surahNavigationButton, surahNumber >= 114 && styles.surahNavigationDisabled]}
            >
              <View style={styles.iconLtr}>
                <MaterialIcons name={nextSurahIcon} size={22} color={readerTokens.text} />
              </View>
            </Pressable>
          </View>
        </View>
      </View>

      {hifz16Line ? (
        <Hifz16View
          key={`hifz16-${forcedHifz?.surah ?? surahNumber}-${forcedHifz?.ayah ?? initialAyah}-${forcedHifz?.page ?? requestedHifzPage ?? 'ayah'}`}
          surahNumber={forcedHifz?.surah ?? surahNumber}
          initialAyah={forcedHifz?.ayah ?? initialAyah}
          initialPage={forcedHifz?.page ?? requestedHifzPage}
          contentPaddingTop={contentPaddingTop}
          contentPaddingBottom={contentPaddingBottom}
          activePlayingSurah={currentlyPlaying?.surah ?? null}
          activePlayingAyah={currentlyPlaying?.ayah ?? null}
          onPlayAyah={handleHifzPlayAyah}
          onVisiblePositionChange={onHifzVisiblePosition}
          onSettingsPress={() => setSettingsOpen(true)}
        />
      ) : (
        <MushafView
          key={`mushaf-${surahNumber}-${initialAyah}-${normalizedJumpToken ?? 'default'}`}
          surahNumber={surahNumber}
          initialAyah={initialAyah}
          jumpMode={jumpMode}
          jumpToken={normalizedJumpToken}
          resumeSource={normalizedResumeSource === 'notification' ? 'notification' : undefined}
          onPlayAyah={handlePlayAyah}
          onAyahChange={handleTranslationPositionChange}
          onSettingsPress={() => setSettingsOpen(true)}
          activePlayingAyah={activeAyahNumber}
          contentPaddingTop={contentPaddingTop}
          contentPaddingBottom={contentPaddingBottom}
          readerTokens={readerTokens}
        />
      )}

      {showAudioPlayer && currentlyPlaying && (
        <AudioPlayer
          surahNumber={currentlyPlaying.surah}
          ayahNumber={currentlyPlaying.ayah}
          totalAyahs={getSurahName(currentlyPlaying.surah)?.ayahCount ?? surah?.ayahs.length ?? 1}
          scopeType="surah"
          scopeStartAyah={1}
          scopeEndAyah={getSurahName(currentlyPlaying.surah)?.ayahCount ?? surah?.ayahs.length ?? 1}
          isVisible={showAudioPlayer}
          compact={hifz16Line}
          readerTokens={readerTokens}
          isPlaying={isPlaying}
          onHeightChange={setPlayerHeight}
          onPlayContinuous={handlePlayContinuous}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          onClose={handleAudioClose}
        />
      )}

      <QuranDownloadCard
        visible={showDownloadSheet && !downloadDisabled}
        scope={surahScope}
        scopeChoices={downloadScopeChoices}
        theme={theme}
        title={hifz16Line ? t('quran.download.sheetTitle') : t('quran.downloadAll')}
        primaryLabel={t('quran.download.action')}
        onClose={() => {
          setShowDownloadSheet(false);
          setDownloadBadgeNonce((value) => value + 1);
        }}
        onCompleted={() => setDownloadBadgeNonce((value) => value + 1)}
      />
      <QuranReaderSettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fixedMushaf={hifz16Line}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 80,
    elevation: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topBarBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLtr: {
    direction: 'ltr',
  },
  topBarTitle: {
    flex: 1,
    flexShrink: 1,
    minWidth: 72,
    marginHorizontal: Spacing.xs,
    fontSize: 17,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  topBarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  surahNavigationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    overflow: 'hidden',
  },
  surahNavigationButton: {
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahNavigationDisabled: {
    opacity: 0.35,
  },
  topBarDownloadButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(14,107,79,0.25)',
    padding: 1,
    gap: 1,
  },
  modeSegment: {
    minHeight: 26,
    paddingHorizontal: 7,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSegmentActive: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  modeSegmentText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 11,
  },
  modeSegmentTextActive: {
    fontWeight: '700',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
    fontFamily: 'Vazirmatn',
  },
});
