import React from 'react';

import { Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/utils/i18n/useI18n';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { Naat } from '@/types/naat';
import { rowStyle, textStartStyle } from '@/utils/i18n/direction';

type Props = {
  naat: Naat;
  isPlaying: boolean;
  progress: number;
  onPlayPause: () => void;
  onOpen: () => void;
};

export function NaatMiniPlayer({ naat, isPlaying, progress, onPlayPause, onOpen }: Props) {
  const { theme } = useApp();
  const { language } = useI18n();
  const clampedProgress = Math.max(0, Math.min(progress, 1));
  const startAlign = textStartStyle(language);
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
      <View style={[styles.content, rowStyle(language)]}>
        <View style={styles.info}>
          <LocalizedText style={[styles.title, startAlign, { color: theme.text }]} numberOfLines={1}>
            {naat.title_fa}
          </LocalizedText>
          <LocalizedText style={[styles.subtitle, startAlign, { color: theme.textSecondary }]} numberOfLines={1}>
            {naat.reciter_name}
          </LocalizedText>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: Typography.ui.subtitle,
    fontFamily: 'Vazirmatn',
  },
  subtitle: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
