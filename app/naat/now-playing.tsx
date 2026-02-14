/**
 * Na't Now Playing Screen
 */

import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useNaat } from '@/context/NaatContext';
import { BorderRadius, Spacing, Typography, NAAT_GRADIENT } from '@/constants/theme';

function formatTime(millis: number) {
  const totalSeconds = Math.floor(millis / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function NaatNowPlayingScreen() {
  const { theme, state } = useApp();
  const router = useRouter();
  const { player, pause, resume, seek } = useNaat();
  const themeMode = state.preferences.theme;
  const gradientColors = NAAT_GRADIENT[themeMode] ?? NAAT_GRADIENT.light;

  const progress = useMemo(() => {
    if (!player.current || player.durationMillis <= 0) return 0;
    return player.positionMillis / player.durationMillis;
  }, [player]);

  const [seekingRatio, setSeekingRatio] = useState<number | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const displayProgress = seekingRatio !== null ? seekingRatio : Math.max(0, Math.min(progress, 1));

  const computeRatio = useCallback(
    (locationX: number) => {
      if (!trackWidth) return 0;
      const x = Math.max(0, Math.min(trackWidth, locationX));
      return x / trackWidth;
    },
    [trackWidth],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          if (!trackWidth) return;
          const ratio = computeRatio(evt.nativeEvent.locationX);
          setSeekingRatio(ratio);
          seek(ratio * player.durationMillis);
        },
        onPanResponderMove: (evt) => {
          if (!trackWidth) return;
          const ratio = computeRatio(evt.nativeEvent.locationX);
          setSeekingRatio(ratio);
          seek(ratio * player.durationMillis);
        },
        onPanResponderRelease: () => setSeekingRatio(null),
        onPanResponderTerminate: () => setSeekingRatio(null),
      }),
    [trackWidth, computeRatio, player.durationMillis, seek],
  );

  if (!player.current) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.background }]}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>نعتی در حال پخش نیست</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-forward" size={24} color={theme.tint} />
        </Pressable>
      </View>
    );
  }

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <MaterialIcons name="arrow-forward" size={24} color={theme.surahHeaderText} />
      </Pressable>

      <View style={styles.center}>
        <View style={[styles.motif, { backgroundColor: theme.surahHeader, borderColor: theme.bookmark }]}>
          <MaterialIcons name="auto-awesome" size={32} color={theme.bookmark} />
        </View>
        <Text style={[styles.title, { color: theme.surahHeaderText }]}>{player.current.title_fa}</Text>
        <Text style={[styles.psTitle, { color: theme.surahHeaderText }]}>{player.current.title_ps}</Text>
        <Text style={[styles.subtitle, { color: theme.surahHeaderText }]}>{player.current.reciter_name}</Text>
        {player.current.isDownloaded && <Text style={[styles.offlineBadge, { color: theme.bookmark }]}>آفلاین</Text>}
      </View>

      <View style={styles.controls}>
        <View
          style={[styles.progressBar, { backgroundColor: `${theme.surahHeaderText}20` }]}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          {...panResponder.panHandlers}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(displayProgress * 100, 100)}%`,
                backgroundColor: theme.bookmark,
                left: 0,
              },
            ]}
          />
        </View>
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, { color: theme.surahHeaderText }]}>
            {formatTime(
              seekingRatio !== null ? seekingRatio * player.durationMillis : player.positionMillis,
            )}
          </Text>
          <Text style={[styles.timeText, { color: theme.surahHeaderText }]}>
            {formatTime(player.durationMillis)}
          </Text>
        </View>

        <Pressable
          onPress={() => (player.isPlaying ? pause() : resume())}
          style={[styles.playButton, { backgroundColor: theme.bookmark }]}
        >
          <MaterialIcons name={player.isPlaying ? 'pause' : 'play-arrow'} size={42} color="#1a4d3e" />
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  center: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  motif: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: 'Amiri',
    fontSize: Typography.ui.display,
    textAlign: 'center',
  },
  psTitle: {
    marginTop: Spacing.xs,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: Spacing.xs,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    textAlign: 'center',
  },
  offlineBadge: {
    marginTop: Spacing.sm,
    fontFamily: 'Vazirmatn',
  },
  controls: {
    marginTop: Spacing.xl,
  },
  progressBar: {
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    position: 'absolute',
    borderRadius: BorderRadius.full,
  },
  timeRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  timeText: {
    fontFamily: 'Vazirmatn',
  },
  playButton: {
    marginTop: Spacing.lg,
    width: 86,
    height: 86,
    borderRadius: 43,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Vazirmatn',
  },
});
