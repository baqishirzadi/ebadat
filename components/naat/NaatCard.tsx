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

function formatDuration(seconds?: number | string | null) {
  const value = typeof seconds === 'string' ? Number(seconds) : seconds;
  if (!value || value <= 0) return '—';
  const m = Math.floor(value / 60);
  const s = value % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatSize(size?: number | string | null) {
  const value = typeof size === 'string' ? Number(size) : size;
  if (!value || value <= 0) return '—';
  return `${value.toFixed(1)} مگابایت`;
}

export function NaatCard({ naat, onPlay, onDownload }: Props) {
  const { theme } = useApp();
  const downloadLabel = naat.isDownloaded
    ? 'آفلاین'
    : naat.downloadProgress !== undefined
      ? `در حال دانلود ${Math.round(naat.downloadProgress * 100)}٪`
      : 'دانلود نشده';

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={styles.accentRow}>
        <View style={[styles.accentLine, { backgroundColor: `${theme.tint}50` }]} />
        <MaterialIcons name="auto-awesome" size={16} color="#d4af37" />
        <View style={[styles.accentLine, { backgroundColor: `${theme.tint}50` }]} />
      </View>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text }]}>{naat.title_fa}</Text>
      </View>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{naat.title_ps}</Text>
      <Text style={[styles.reciter, { color: theme.textSecondary }]}>{naat.reciter_name}</Text>

      <View style={styles.footerRow}>
        <View style={styles.metaColumn}>
          <View style={styles.durationRow}>
            <MaterialIcons name="schedule" size={14} color={theme.textSecondary} />
            <Text style={[styles.duration, { color: theme.textSecondary }]}>
              {formatDuration(naat.duration_seconds)}
            </Text>
          </View>
          <Text style={[styles.sizeText, { color: theme.textSecondary }]}>{formatSize(naat.file_size_mb)}</Text>
          <Text style={[styles.downloadText, { color: naat.isDownloaded ? theme.tint : theme.textSecondary }]}>
            {downloadLabel}
          </Text>
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
              name={naat.isDownloaded ? 'offline-pin' : naat.downloadProgress !== undefined ? 'downloading' : 'download'}
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
  accentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  accentLine: {
    height: 1,
    width: 48,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: Typography.ui.subtitle,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    flex: 1,
  },
  subtitle: {
    marginTop: Spacing.xs,
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
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
  metaColumn: {
    alignItems: 'flex-end',
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
  sizeText: {
    marginTop: 2,
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  downloadText: {
    marginTop: 2,
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
