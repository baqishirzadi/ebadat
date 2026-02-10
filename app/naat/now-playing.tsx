/**
 * Na't Now Playing Screen
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useNaat } from '@/context/NaatContext';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

function formatTime(millis: number) {
  const totalSeconds = Math.floor(millis / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function NaatNowPlayingScreen() {
  const { theme } = useApp();
  const router = useRouter();
  const { player, pause, resume, seek } = useNaat();

  const progress = useMemo(() => {
    if (!player.current || player.durationMillis <= 0) return 0;
    return player.positionMillis / player.durationMillis;
  }, [player]);

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
    <LinearGradient colors={['#0f3a2f', '#1a4d3e', '#1f6b57']} style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <MaterialIcons name="arrow-forward" size={24} color="#fff" />
      </Pressable>

      <View style={styles.center}>
        <View style={styles.motif}>
          <MaterialIcons name="auto-awesome" size={32} color="#d4af37" />
        </View>
        <Text style={styles.title}>{player.current.title}</Text>
        <Text style={styles.subtitle}>{player.current.reciterName}</Text>
        {player.current.isDownloaded && <Text style={styles.offlineBadge}>آفلاین</Text>}
      </View>

      <View style={styles.controls}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(player.positionMillis)}</Text>
          <Text style={styles.timeText}>{formatTime(player.durationMillis)}</Text>
        </View>

        <Pressable
          onPress={() => (player.isPlaying ? pause() : resume())}
          style={styles.playButton}
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
    backgroundColor: '#1a4d3e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d4af37',
    marginBottom: Spacing.md,
  },
  title: {
    color: '#fff',
    fontFamily: 'Amiri',
    fontSize: Typography.ui.display,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: Spacing.xs,
    color: '#e1f1ea',
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    textAlign: 'center',
  },
  offlineBadge: {
    marginTop: Spacing.sm,
    color: '#d4af37',
    fontFamily: 'Vazirmatn',
  },
  controls: {
    marginTop: Spacing.xl,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#d4af37',
  },
  timeRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  timeText: {
    color: '#e1f1ea',
    fontFamily: 'Vazirmatn',
  },
  playButton: {
    marginTop: Spacing.lg,
    width: 86,
    height: 86,
    borderRadius: 43,
    alignSelf: 'center',
    backgroundColor: '#d4af37',
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
