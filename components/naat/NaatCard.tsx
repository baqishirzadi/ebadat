import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Naat } from '@/types/naat';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { NaatProgressBar } from '@/components/naat/NaatProgressBar';
import { RtlText } from '@/components/ui/RtlText';
import { tUi } from '@/utils/i18n/ui';

type Props = {
  naat: Naat;
  onPlay: () => void;
  onDownload: () => void;
  isActive?: boolean;
  isPlaying?: boolean;
  progress?: number;
  positionMillis?: number;
  durationMillis?: number;
  onSeek?: (millis: number) => void;
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

export function NaatCard({
  naat,
  onPlay,
  onDownload,
  isActive = false,
  isPlaying = false,
  progress = 0,
  positionMillis = 0,
  durationMillis = 0,
  onSeek,
}: Props) {
  const { theme, state } = useApp();
  const language = state.preferences.appLanguage;
  const isPashto = language === 'pashto';
  const isDownloading = naat.downloadProgress !== undefined && !naat.isDownloaded;
  const downloadStatus = naat.isDownloaded
    ? tUi('آفلاین', language)
    : isDownloading
      ? `${tUi('در حال دانلود', language)} ${Math.round((naat.downloadProgress ?? 0) * 100)}٪`
      : tUi('دانلود نشده', language);
  const playLabel = isActive && isPlaying ? tUi('توقف', language) : tUi('پخش', language);
  const downloadLabel = naat.isDownloaded ? tUi('آفلاین', language) : tUi('دانلود', language);

  return (
    <View
      testID="naat-card"
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
    >
      <View style={styles.accentRow}>
        <View style={[styles.accentLine, { backgroundColor: `${theme.bookmark}80` }]} />
        <MaterialIcons name="auto-awesome" size={16} color={theme.bookmark} />
        <View style={[styles.accentLine, { backgroundColor: `${theme.bookmark}80` }]} />
      </View>
      <View style={styles.headerRow}>
        <RtlText align="center" style={[styles.title, { color: theme.text }]}>{isPashto ? naat.title_ps : naat.title_fa}</RtlText>
      </View>

      <RtlText align="center" style={[styles.subtitle, { color: theme.textSecondary }]}>{isPashto ? naat.title_fa : naat.title_ps}</RtlText>
      <RtlText align="center" style={[styles.reciter, { color: theme.textSecondary }]}>{naat.reciter_name}</RtlText>

      {isActive && durationMillis > 0 && (
        <View style={styles.seekSection}>
          <NaatProgressBar
            positionMillis={positionMillis}
            durationMillis={durationMillis}
            onSeek={onSeek}
            fillColor={theme.tint}
            trackColor={theme.backgroundSecondary}
            textColor={theme.textSecondary}
          />
        </View>
      )}

      <View style={styles.metaColumn}>
          <View style={styles.durationRow}>
            <MaterialIcons name="schedule" size={14} color={theme.textSecondary} />
            <RtlText align="center" wrap={false} style={[styles.duration, { color: theme.textSecondary }]}>
              {formatDuration(naat.duration_seconds)}
            </RtlText>
          </View>
          <RtlText align="center" style={[styles.sizeText, { color: theme.textSecondary }]}>{formatSize(naat.file_size_mb)}</RtlText>
          <RtlText
            testID="naat-card-download-status"
            align="center"
            style={[styles.downloadText, { color: naat.isDownloaded ? theme.tint : theme.textSecondary }]}
          >
            {downloadStatus}
          </RtlText>
      </View>

      <View style={styles.actions}>
        <Pressable
          testID="naat-card-play-button"
          accessibilityLabel={isActive && isPlaying ? tUi('توقف نعت', language) : tUi('پخش نعت', language)}
          accessibilityHint={isActive && isPlaying ? tUi('توقف', language) : tUi('پخش', language)}
          hitSlop={8}
          onPress={onPlay}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.tint },
            pressed && styles.iconPressed,
          ]}
        >
          <View style={styles.actionButtonContent}>
            <MaterialIcons name={isActive && isPlaying ? 'pause' : 'play-arrow'} size={24} color="#fff" />
            <RtlText align="center" wrap={false} style={styles.primaryActionText}>{playLabel}</RtlText>
          </View>
        </Pressable>
        <Pressable
          testID="naat-card-download-button"
          accessibilityLabel={tUi('دانلود نعت', language)}
          accessibilityHint={downloadStatus}
          accessibilityState={{ disabled: isDownloading }}
          disabled={isDownloading}
          hitSlop={8}
          onPress={onDownload}
          style={({ pressed }) => [
            styles.actionButton,
            styles.downloadActionButton,
            {
              backgroundColor: naat.isDownloaded ? `${theme.tint}18` : theme.backgroundSecondary,
              borderColor: naat.isDownloaded ? `${theme.tint}55` : theme.cardBorder,
              opacity: isDownloading ? 0.72 : 1,
            },
            pressed && styles.iconPressed,
          ]}
        >
          <View style={styles.actionButtonContent}>
            {isDownloading ? (
              <ActivityIndicator size="small" color={theme.tint} />
            ) : (
              <MaterialIcons
                name={naat.isDownloaded ? 'offline-pin' : 'download'}
                size={22}
                color={naat.isDownloaded ? theme.tint : theme.text}
              />
            )}
            <RtlText align="center" wrap={false} style={[styles.secondaryActionText, { color: naat.isDownloaded ? theme.tint : theme.text }]}>
              {isDownloading ? `${Math.round((naat.downloadProgress ?? 0) * 100)}٪` : downloadLabel}
            </RtlText>
          </View>
        </Pressable>
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
    alignItems: 'center',
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
  seekSection: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  metaColumn: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
    maxWidth: 180,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  actionButtonContent: {
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  downloadActionButton: {
    borderWidth: 1,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
    fontWeight: '700',
  },
  secondaryActionText: {
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
    fontWeight: '700',
  },
  iconPressed: {
    opacity: 0.85,
  },
});
