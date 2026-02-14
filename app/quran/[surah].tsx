/**
 * Quran Reader Screen
 * Displays individual surah with MushafView and AudioPlayer
 * No English - All Arabic/Dari
 */

import React, { useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { View, StyleSheet, StatusBar, BackHandler, Platform, ToastAndroid } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useQuranData } from '@/hooks/useQuranData';
import { MushafView, AudioPlayer } from '@/components/quran';
import { Spacing } from '@/constants/theme';
import { getSurah as getSurahName, toArabicNumerals } from '@/data/surahNames';
import AppCenteredText from '@/components/CenteredText';

export default function QuranReaderScreen() {
  const { surah: surahParam, ayah: ayahParam } = useLocalSearchParams<{
    surah: string;
    ayah?: string;
  }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { theme, state } = useApp();
  const { getSurah, getNextAyah } = useQuranData();

  const surahNumber = parseInt(surahParam, 10) || 1;
  const initialAyah = ayahParam ? parseInt(ayahParam, 10) : 1;
  const surah = getSurah(surahNumber);
  const surahNameData = getSurahName(surahNumber);

  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<{
    surah: number;
    ayah: number;
  } | null>(null);
  const [shouldGoBack, setShouldGoBack] = useState(false);

  // Handle navigation when surah not found - use useEffect to avoid setState during render
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

  // Android back button handler - first press goes to list, second press exits
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Always navigate back to surah list on first press
      router.back();
      // Show toast message indicating they can press back again to exit
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      return true; // Prevent default behavior
    });

    return () => backHandler.remove();
  }, [router]);

  // Handle ayah play
  const handlePlayAyah = useCallback((surahNum: number, ayahNum: number) => {
    setCurrentlyPlaying({ surah: surahNum, ayah: ayahNum });
    setShowAudioPlayer(true);
  }, []);

  // Handle audio completion - auto advance to next ayah (only within same surah)
  const handleAyahComplete = useCallback(() => {
    if (!currentlyPlaying || !state.preferences.autoPlayAudio) {
      setShowAudioPlayer(false);
      setCurrentlyPlaying(null);
      return;
    }

    const next = getNextAyah(currentlyPlaying.surah, currentlyPlaying.ayah);
    // Only continue if next ayah is in the same surah (don't go to next surah)
    if (next && next.surah === currentlyPlaying.surah) {
      setCurrentlyPlaying({ surah: next.surah, ayah: next.ayah });
    } else {
      // Stop playback when surah ends (don't auto-play next surah)
      setShowAudioPlayer(false);
      setCurrentlyPlaying(null);
    }
  }, [currentlyPlaying, getNextAyah, state.preferences.autoPlayAudio]);

  // Handle audio close
  const handleAudioClose = useCallback(() => {
    setShowAudioPlayer(false);
    setCurrentlyPlaying(null);
  }, []);


  // Navigate to next surah
  const goToNextSurah = useCallback(() => {
    if (surahNumber < 114) {
      router.replace(`/quran/${surahNumber + 1}`);
    }
  }, [surahNumber, router]);

  // Navigate to previous surah
  const goToPrevSurah = useCallback(() => {
    if (surahNumber > 1) {
      router.replace(`/quran/${surahNumber - 1}`);
    }
  }, [surahNumber, router]);

  // Update header dynamically when title or page changes
  useLayoutEffect(() => {
    if (!surah || shouldGoBack) {
      return;
    }

    const surahName = surahNameData
      ? `سورة ${surahNameData.arabic}`
      : `سوره ${toArabicNumerals(surahNumber)}`;

    navigation.setOptions({
      title: surahName,
      headerStyle: { backgroundColor: theme.surahHeader, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontFamily: 'ScheherazadeNew',
        fontSize: 22,
      },
      headerTitleAlign: 'center',
      headerLeft: () => (
        <MaterialIcons
          name="arrow-forward"
          size={24}
          color="#fff"
          style={{ marginRight: 16 }}
          onPress={() => router.back()}
        />
      ),
      headerRight: () => (
        <View style={styles.headerRight}>
          {surahNumber > 1 && (
            <MaterialIcons
              name="chevron-right"
              size={28}
              color="#fff"
              onPress={goToPrevSurah}
            />
          )}
          {surahNumber < 114 && (
            <MaterialIcons
              name="chevron-left"
              size={28}
              color="#fff"
              onPress={goToNextSurah}
            />
          )}
        </View>
      ),
    });
  }, [surah, shouldGoBack, surahNameData, surahNumber, theme.surahHeader, navigation, router, goToPrevSurah, goToNextSurah]);

  // Show loading or return null if no surah
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

      {/* Mushaf View */}
      <MushafView
        surahNumber={surahNumber}
        initialAyah={initialAyah}
        onPlayAyah={handlePlayAyah}
        currentlyPlaying={currentlyPlaying}
      />

      {/* Audio Player */}
      {showAudioPlayer && currentlyPlaying && (
        <AudioPlayer
          surahNumber={currentlyPlaying.surah}
          ayahNumber={currentlyPlaying.ayah}
          isVisible={showAudioPlayer}
          onAyahComplete={handleAyahComplete}
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
