/**
 * Na't Now Playing Screen
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, Pressable, PanResponder, I18nManager } from 'react-native';
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

const SEEK_THROTTLE_MS = 70;

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
  const trackRef = useRef<View>(null);
  const trackMetricsRef = useRef({ left: 0, width: 0 });
  const seekRatioRef = useRef<number | null>(null);
  const lastSeekAtRef = useRef(0);
  const displayProgress = seekingRatio !== null ? seekingRatio : Math.max(0, Math.min(progress, 1));

  const updateTrackMetrics = useCallback(() => {
    trackRef.current?.measureInWindow((x, _y, width) => {
      if (!width) return;
      trackMetricsRef.current = { left: x, width };
      setTrackWidth(width);
    });
  }, []);

  const computeRatio = useCallback(
    (pageX: number) => {
      const { left, width } = trackMetricsRef.current;
      const effectiveWidth = width || trackWidth;
      if (!effectiveWidth) return 0;
      const x = Math.max(0, Math.min(effectiveWidth, pageX - left));
      const rawRatio = x / effectiveWidth;
      return I18nManager.isRTL ? 1 - rawRatio : rawRatio;
    },
    [trackWidth],
  );

  const commitSeek = useCallback(
    (ratio: number, force = false) => {
      if (player.durationMillis <= 0) return;
      const now = Date.now();
      if (!force && now - lastSeekAtRef.current < SEEK_THROTTLE_MS) return;
      lastSeekAtRef.current = now;
      seek(ratio * player.durationMillis);
    },
    [player.durationMillis, seek],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          if (!trackWidth || player.durationMillis <= 0) return;
          updateTrackMetrics();
          const ratio = computeRatio(evt.nativeEvent.pageX);
          seekRatioRef.current = ratio;
          setSeekingRatio(ratio);
          commitSeek(ratio, true);
        },
        onPanResponderMove: (evt) => {
          if (!trackWidth || player.durationMillis <= 0) return;
          const ratio = computeRatio(evt.nativeEvent.pageX);
          seekRatioRef.current = ratio;
          setSeekingRatio(ratio);
          commitSeek(ratio, false);
        },
        onPanResponderRelease: () => {
          if (seekRatioRef.current !== null) {
            commitSeek(seekRatioRef.current, true);
          }
          seekRatioRef.current = null;
          setSeekingRatio(null);
        },
        onPanResponderTerminate: () => {
          if (seekRatioRef.current !== null) {
            commitSeek(seekRatioRef.current, true);
          }
          seekRatioRef.current = null;
          setSeekingRatio(null);
        },
      }),
    [trackWidth, computeRatio, player.durationMillis, updateTrackMetrics, commitSeek],
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
          ref={trackRef}
          style={[styles.progressBar, { backgroundColor: `${theme.surahHeaderText}20` }]}
          onLayout={(e) => {
            const width = e.nativeEvent.layout.width;
            trackMetricsRef.current.width = width;
            setTrackWidth(width);
            requestAnimationFrame(updateTrackMetrics);
          }}
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
    direction: 'ltr',
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
