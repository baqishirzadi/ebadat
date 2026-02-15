import React from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { Naat } from '@/types/naat';

type Props = {
  naat: Naat;
  isPlaying: boolean;
  progress: number;
  onPlayPause: () => void;
  onOpen: () => void;
};

export function NaatMiniPlayer({ naat, isPlaying, progress, onPlayPause, onOpen }: Props) {
  const { theme } = useApp();
  const clampedProgress = Math.max(0, Math.min(progress, 1));
  return (
    <Pressable onPress={onOpen} style={[styles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={{ direction: 'ltr', width: '100%' }}>
        <View style={[styles.progressTrack, { backgroundColor: `${theme.tint}20` }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${clampedProgress * 100}%`, backgroundColor: theme.tint, left: 0 },
            ]}
          />
        </View>
      </View>
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {naat.title_fa}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
            {naat.reciter_name}
          </Text>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onPlayPause();
          }}
          style={[styles.playButton, { backgroundColor: theme.tint }]}
        >
          <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={22} color="#fff" />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: 90,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressTrack: {
    height: 3,
    direction: 'ltr',
    position: 'relative',
  },
  progressFill: {
    height: 3,
    position: 'absolute',
  },
  content: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  title: {
    fontSize: Typography.ui.subtitle,
    fontFamily: 'Vazirmatn',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    textAlign: 'right',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
