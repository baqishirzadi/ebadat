/**
 * Quran Reader Screen
 * Displays individual surah with MushafView and AudioPlayer
 * No English - All Arabic/Dari
 */

import React, { useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, Pressable, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useQuranData } from '@/hooks/useQuranData';
import { MushafView, AudioPlayer } from '@/components/quran';
import audioManager, { getQuranPlaybackErrorMessage } from '@/utils/quranAudio';
import { Spacing } from '@/constants/theme';
import { getSurah as getSurahName, toArabicNumerals } from '@/data/surahNames';
import AppCenteredText from '@/components/CenteredText';

export default function QuranReaderScreen() {
  const {
    surah: surahParam,
    ayah: ayahParam,
    jump: jumpParam,
    jumpToken: jumpTokenParam,
    resumeSource: resumeSourceParam,
  } = useLocalSearchParams<{
    surah: string | string[];
    ayah?: string | string[];
    jump?: string | string[];
    jumpToken?: string | string[];
    resumeSource?: string | string[];
  }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { theme, state } = useApp();
  const { getSurah } = useQuranData();

  const normalizedSurahParam = Array.isArray(surahParam) ? surahParam[0] : surahParam;
  const normalizedAyahParam = Array.isArray(ayahParam) ? ayahParam[0] : ayahParam;
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
  const jumpMode: 'default' | 'exact' | 'continue' | 'search_exact' =
    normalizedJumpParam === 'exact'
      ? 'exact'
      : normalizedJumpParam === 'continue'
        ? 'continue'
        : normalizedJumpParam === 'search_exact'
          ? 'search_exact'
          : 'default';
  const surah = getSurah(surahNumber);
  const surahNameData = getSurahName(surahNumber);

  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<{
    surah: number;
    ayah: number;
  } | null>(null);
  const [shouldGoBack, setShouldGoBack] = useState(false);

  const syncFromAudioSnapshot = useCallback(() => {
    const snapshot = audioManager.getPlaybackSnapshot();
    const isMatchingSurah = snapshot.isActive && snapshot.scopeType === 'surah' && snapshot.surah === surahNumber;

    if (!isMatchingSurah) {
      setIsPlaying(false);
      setIsPreparing(false);
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
    setIsPreparing(snapshot.phase === 'preparing');
    setIsPlaying(snapshot.phase === 'playing' && snapshot.isPlaying);
  }, [surahNumber]);

  useEffect(() => {
    if (!surah && !shouldGoBack) {
      setShouldGoBack(true);
    }
  }, [surah, shouldGoBack]);

  useEffect(() => {
    if (shouldGoBack) {
      router.back();
    }
  }, [shouldGoBack, router]);

  useEffect(() => {
    void audioManager.initialize();
  }, []);

  useFocusEffect(
    useCallback(() => {
      audioManager.setOnAyahChange((s, a) => {
        if (s !== surahNumber) return;
        setCurrentlyPlaying((previous) => (
          previous?.surah === s && previous.ayah === a
            ? previous
            : { surah: s, ayah: a }
        ));
        setShowAudioPlayer(true);
        setIsPreparing(false);
        setIsPlaying(true);
      });

      audioManager.setOnPlaybackEnd(() => {
        setIsPlaying(false);
        setIsPreparing(false);
        setCurrentlyPlaying(null);
        setShowAudioPlayer(false);
      });

      const unsubscribe = audioManager.subscribe(() => {
        syncFromAudioSnapshot();
      });

      syncFromAudioSnapshot();

      return () => {
        audioManager.cancelPendingStart();
        unsubscribe();
        audioManager.setOnAyahChange(null);
        audioManager.setOnPlaybackEnd(null);
      };
    }, [surahNumber, syncFromAudioSnapshot])
  );

  const handlePlayAyah = useCallback((surahNum: number, ayahNum: number) => {
    if (!surah) return;

    const isSameAyah =
      currentlyPlaying?.surah === surahNum && currentlyPlaying?.ayah === ayahNum;

    if (isSameAyah && audioManager.getIsPlaying()) {
      setIsPlaying(false);
      setIsPreparing(false);
      setCurrentlyPlaying(null);
      setShowAudioPlayer(false);
      void audioManager.stop();
      return;
    }

    if (
      isSameAyah &&
      !audioManager.getIsPlaying() &&
      audioManager.getCurrentSurah() === surahNum &&
      audioManager.getCurrentAyah() === ayahNum
    ) {
      setIsPlaying(true);
      setIsPreparing(false);
      setShowAudioPlayer(true);
      void audioManager.resume();
      return;
    }

    setCurrentlyPlaying({ surah: surahNum, ayah: ayahNum });
    setShowAudioPlayer(true);
    setIsPreparing(true);
    setIsPlaying(false);
    void audioManager
      .playAyah(surahNum, ayahNum, surah.ayahs.length, true, true, {
        type: 'surah',
        startAyah: 1,
        endAyah: surah.ayahs.length,
      })
      .catch((error) => {
        setIsPreparing(false);
        Alert.alert('پخش آیه', getQuranPlaybackErrorMessage(error));
      });
  }, [surah, currentlyPlaying]);

  const handlePlayContinuous = useCallback(() => {
    if (!surah) return;

    const currentAyah = currentlyPlaying?.ayah ?? initialAyah;
    setIsPreparing(true);
    setIsPlaying(false);
    void audioManager
      .playAyah(surahNumber, currentAyah, surah.ayahs.length, true, true, {
        type: 'surah',
        startAyah: 1,
        endAyah: surah.ayahs.length,
      })
      .catch((error) => {
        setIsPreparing(false);
        Alert.alert('پخش آیه', getQuranPlaybackErrorMessage(error));
      });
  }, [surah, currentlyPlaying?.ayah, initialAyah, surahNumber]);

  const handlePause = useCallback(() => {
    setIsPreparing(false);
    setIsPlaying(false);
    void audioManager.pause();
  }, []);

  const handleResume = useCallback(() => {
    setIsPreparing(false);
    setIsPlaying(true);
    void audioManager.resume();
  }, []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setIsPreparing(false);
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
      setShowAudioPlayer(false);
      setCurrentlyPlaying(null);
      setIsPlaying(false);
      router.replace(`/quran/${surahNumber + 1}`);
    }
  }, [surahNumber, router]);

  const goToPrevSurah = useCallback(async () => {
    if (surahNumber > 1) {
      await audioManager.stop();
      setShowAudioPlayer(false);
      setCurrentlyPlaying(null);
      setIsPlaying(false);
      router.replace(`/quran/${surahNumber - 1}`);
    }
  }, [surahNumber, router]);

  useLayoutEffect(() => {
    if (!surah || shouldGoBack) {
      return;
    }

    const surahName = surahNameData
      ? `سورة ${surahNameData.arabic}`
      : `سوره ${toArabicNumerals(surahNumber)}`;

    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitleWrapper}>
          <Text
            style={[
              styles.headerTitleText,
              { color: '#fff', fontFamily: 'ScheherazadeNew' },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {surahName}
          </Text>
        </View>
      ),
      headerStyle: { backgroundColor: theme.surahHeader, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
      headerTintColor: '#fff',
      headerTitleContainerStyle: {
        flex: 1,
        minWidth: 160,
        justifyContent: 'center',
        alignItems: 'center',
      },
      headerLeftContainerStyle: { minWidth: 48 },
      headerRightContainerStyle: { minWidth: 80 },
      headerLeft: () => (
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons
            name="arrow-forward"
            size={24}
            color="#fff"
            style={{ marginRight: 16 }}
          />
        </Pressable>
      ),
      headerRight: () => (
        <View style={styles.headerRight}>
          {surahNumber > 1 && (
            <Pressable onPress={goToPrevSurah} hitSlop={8}>
              <MaterialIcons name="chevron-right" size={28} color="#fff" />
            </Pressable>
          )}
          {surahNumber < 114 && (
            <Pressable onPress={goToNextSurah} hitSlop={8}>
              <MaterialIcons name="chevron-left" size={28} color="#fff" />
            </Pressable>
          )}
        </View>
      ),
    });
  }, [surah, shouldGoBack, surahNameData, surahNumber, theme.surahHeader, navigation, router, goToPrevSurah, goToNextSurah]);

  if (!surah || shouldGoBack) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <AppCenteredText style={[styles.loadingText, { color: theme.textSecondary }]}>
          در حال بارگذاری...
        </AppCenteredText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={state.preferences.theme === 'night' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      <MushafView
        key={`mushaf-${surahNumber}-${normalizedJumpToken ?? 'default'}`}
        surahNumber={surahNumber}
        initialAyah={initialAyah}
        jumpMode={jumpMode}
        jumpToken={normalizedJumpToken}
        resumeSource={normalizedResumeSource === 'notification' ? 'notification' : undefined}
        onPlayAyah={handlePlayAyah}
        activePlayingAyah={activeAyahNumber}
      />

      {showAudioPlayer && currentlyPlaying && (
        <AudioPlayer
          surahNumber={currentlyPlaying.surah}
          ayahNumber={currentlyPlaying.ayah}
          totalAyahs={surah.ayahs.length}
          scopeType="surah"
          scopeStartAyah={1}
          scopeEndAyah={surah.ayahs.length}
          isVisible={showAudioPlayer}
          isPlaying={isPlaying}
          isPreparing={isPreparing}
          onPlayContinuous={handlePlayContinuous}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          onClose={handleAudioClose}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitleWrapper: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '400' as const,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
    fontFamily: 'Vazirmatn',
  },
});
