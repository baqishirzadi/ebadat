import React from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Naat } from '@/types/naat';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

type Props = {
  naat: Naat;
  onPlay: () => void;
  onDownload: () => void;
};

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function NaatCard({ naat, onPlay, onDownload }: Props) {
  const { theme } = useApp();
  const langLabel = naat.language === 'fa' ? 'دری' : naat.language === 'ps' ? 'پښتو' : 'عربی';

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={styles.headerRow}>
        <View style={[styles.langBadge, { backgroundColor: `${theme.tint}20` }]}>
          <Text style={[styles.langText, { color: theme.tint }]}>{langLabel}</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{naat.title}</Text>
      </View>

      <Text style={[styles.reciter, { color: theme.textSecondary }]}>
        {naat.reciterName}
      </Text>

      <View style={styles.footerRow}>
        <View style={styles.durationRow}>
          <MaterialIcons name="schedule" size={14} color={theme.textSecondary} />
          <Text style={[styles.duration, { color: theme.textSecondary }]}>{formatDuration(naat.duration)}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onDownload}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: naat.isDownloaded ? `${theme.tint}20` : theme.backgroundSecondary },
              pressed && styles.iconPressed,
            ]}
          >
            <MaterialIcons
              name={naat.isDownloaded ? 'offline-pin' : 'download'}
              size={20}
              color={naat.isDownloaded ? theme.tint : theme.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={onPlay}
            style={({ pressed }) => [
              styles.playButton,
              { backgroundColor: theme.tint },
              pressed && styles.iconPressed,
            ]}
          >
            <MaterialIcons name="play-arrow" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  langBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  langText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  title: {
    fontSize: Typography.ui.subtitle,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    flex: 1,
  },
  reciter: {
    marginTop: Spacing.xs,
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
  footerRow: {
    marginTop: Spacing.md,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  duration: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPressed: {
    opacity: 0.85,
  },
});
