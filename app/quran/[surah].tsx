/**
 * Quran Reader Screen
 * Displays individual surah with MushafView and AudioPlayer
 * No English - All Arabic/Dari
 */

import React, { useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, BackHandler, Platform, ToastAndroid, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useQuranData } from '@/hooks/useQuranData';
import { MushafView, AudioPlayer } from '@/components/quran';
import audioManager, { getQuranPlaybackErrorMessage } from '@/utils/quranAudio';
import { Spacing } from '@/constants/theme';
import { getSurah as getSurahName, toArabicNumerals } from '@/data/surahNames';
import AppCenteredText from '@/components/CenteredText';

export default function QuranReaderScreen() {
  const { surah: surahParam, ayah: ayahParam, jump: jumpParam, jumpToken: jumpTokenParam } = useLocalSearchParams<{
    surah: string | string[];
    ayah?: string | string[];
    jump?: string | string[];
    jumpToken?: string | string[];
  }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { theme, state } = useApp();
  const { getSurah } = useQuranData();

  const normalizedSurahParam = Array.isArray(surahParam) ? surahParam[0] : surahParam;
  const normalizedAyahParam = Array.isArray(ayahParam) ? ayahParam[0] : ayahParam;
  const normalizedJumpParam = Array.isArray(jumpParam) ? jumpParam[0] : jumpParam;
  const normalizedJumpToken = Array.isArray(jumpTokenParam) ? jumpTokenParam[0] : jumpTokenParam;

  const parsedSurahNumber = Number.parseInt(normalizedSurahParam ?? '', 10);
  const surahNumber = Number.isFinite(parsedSurahNumber) && parsedSurahNumber > 0
    ? parsedSurahNumber
    : 1;

  const parsedAyahNumber = Number.parseInt(normalizedAyahParam ?? '', 10);
  const initialAyah = Number.isFinite(parsedAyahNumber) && parsedAyahNumber > 0
    ? parsedAyahNumber
    : 1;
  const jumpMode: 'default' | 'exact' = normalizedJumpParam === 'exact' ? 'exact' : 'default';
  const surah = getSurah(surahNumber);
  const surahNameData = getSurahName(surahNumber);

  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<{
    surah: number;
    ayah: number;
  } | null>(null);
  const [scrollTargetAyah, setScrollTargetAyah] = useState(initialAyah);
  const [shouldGoBack, setShouldGoBack] = useState(false);

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
    if (!surah) {
      setScrollTargetAyah(initialAyah);
      return;
    }
    const clampedAyah = Math.min(Math.max(initialAyah, 1), surah.ayahs.length);
    setScrollTargetAyah(clampedAyah);
  }, [surahNumber, initialAyah, surah]);

  useEffect(() => {
    audioManager.setOnAyahChange((s, a) => {
      setCurrentlyPlaying({ surah: s, ayah: a });
      setShowAudioPlayer(true);
      setIsPlaying(true);
      setScrollTargetAyah(a);
    });

    audioManager.setOnPlaybackEnd(() => {
      setIsPlaying(false);
      setCurrentlyPlaying(null);
    });

    void audioManager.initialize();

    return () => {
      void audioManager.stop();
    };
  }, []);

  // Android back button handler - first press goes to list, second press exits
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      return true;
    });

    return () => backHandler.remove();
  }, [router]);

  const handlePlayAyah = useCallback((surahNum: number, ayahNum: number) => {
    if (!surah) return;

    const isSameAyah =
      currentlyPlaying?.surah === surahNum && currentlyPlaying?.ayah === ayahNum;

    if (isSameAyah && audioManager.getIsPlaying()) {
      setIsPlaying(false);
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
      setShowAudioPlayer(true);
      void audioManager.resume();
      return;
    }

    setCurrentlyPlaying({ surah: surahNum, ayah: ayahNum });
    setShowAudioPlayer(true);
    setIsPlaying(true);
    setScrollTargetAyah(ayahNum);
    void audioManager
      .playAyah(surahNum, ayahNum, surah.ayahs.length, true)
      .catch((error) => {
        Alert.alert('پخش آیه', getQuranPlaybackErrorMessage(error));
      });
  }, [surah, currentlyPlaying]);

  const handlePlayContinuous = useCallback(() => {
    if (!surah) return;

    const currentAyah = currentlyPlaying?.ayah ?? initialAyah;
    setIsPlaying(true);
    setScrollTargetAyah(currentAyah);
    void audioManager
      .playAyah(surahNumber, currentAyah, surah.ayahs.length, true)
      .catch((error) => {
        Alert.alert('پخش آیه', getQuranPlaybackErrorMessage(error));
      });
  }, [surah, currentlyPlaying?.ayah, initialAyah, surahNumber]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    void audioManager.pause();
  }, []);

  const handleResume = useCallback(() => {
    setIsPlaying(true);
    void audioManager.resume();
  }, []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentlyPlaying(null);
    setShowAudioPlayer(false);
    void audioManager.stop();
  }, []);

  const handleAudioClose = useCallback(() => {
    handleStop();
  }, [handleStop]);

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
        surahNumber={surahNumber}
        initialAyah={scrollTargetAyah}
        jumpMode={jumpMode}
        jumpToken={normalizedJumpToken}
        onPlayAyah={handlePlayAyah}
        currentlyPlaying={currentlyPlaying}
      />

      {showAudioPlayer && currentlyPlaying && (
        <AudioPlayer
          surahNumber={currentlyPlaying.surah}
          ayahNumber={currentlyPlaying.ayah}
          totalAyahs={surah.ayahs.length}
          isVisible={showAudioPlayer}
          isPlaying={isPlaying}
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
