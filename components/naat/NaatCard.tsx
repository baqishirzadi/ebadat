import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, View, Text, PanResponder, I18nManager } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Naat } from '@/types/naat';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

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

function formatTime(millis?: number) {
  if (!millis || millis <= 0) return '0:00';
  const totalSeconds = Math.floor(millis / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const SEEK_THROTTLE_MS = 70;

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
  const { theme } = useApp();
  const downloadLabel = naat.isDownloaded
    ? 'آفلاین'
    : naat.downloadProgress !== undefined
      ? `در حال دانلود ${Math.round(naat.downloadProgress * 100)}٪`
      : 'دانلود نشده';
  const [trackWidth, setTrackWidth] = useState(0);
  const [seekingRatio, setSeekingRatio] = useState<number | null>(null);
  const trackRef = useRef<View>(null);
  const trackMetricsRef = useRef({ left: 0, width: 0 });
  const seekRatioRef = useRef<number | null>(null);
  const lastSeekAtRef = useRef(0);
  useEffect(() => {
    if (!isActive) setSeekingRatio(null);
  }, [isActive]);
  const displayProgress = seekingRatio !== null ? seekingRatio : Math.max(0, Math.min(progress, 1));
  const clampedProgress = Math.max(0, Math.min(displayProgress, 1));
  const fillWidth = trackWidth ? trackWidth * clampedProgress : 0;
  const thumbRadius = 8;
  const thumbOffset = Math.max(0, Math.min(Math.max(trackWidth - thumbRadius * 2, 0), fillWidth - thumbRadius));

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
      if (!onSeek || durationMillis <= 0) return;
      const now = Date.now();
      if (!force && now - lastSeekAtRef.current < SEEK_THROTTLE_MS) return;
      lastSeekAtRef.current = now;
      onSeek(ratio * durationMillis);
    },
    [durationMillis, onSeek],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isActive && !!onSeek,
        onMoveShouldSetPanResponder: () => isActive && !!onSeek,
        onStartShouldSetPanResponderCapture: () => isActive && !!onSeek,
        onMoveShouldSetPanResponderCapture: () => isActive && !!onSeek,
        onPanResponderGrant: (evt) => {
          if (!trackWidth || !onSeek || durationMillis <= 0) return;
          updateTrackMetrics();
          const ratio = computeRatio(evt.nativeEvent.pageX);
          seekRatioRef.current = ratio;
          setSeekingRatio(ratio);
          commitSeek(ratio, true);
        },
        onPanResponderMove: (evt) => {
          if (!trackWidth || !onSeek || durationMillis <= 0) return;
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
    [durationMillis, isActive, onSeek, trackWidth, computeRatio, updateTrackMetrics, commitSeek],
  );

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={styles.accentRow}>
        <View style={[styles.accentLine, { backgroundColor: `${theme.bookmark}80` }]} />
        <MaterialIcons name="auto-awesome" size={16} color={theme.bookmark} />
        <View style={[styles.accentLine, { backgroundColor: `${theme.bookmark}80` }]} />
      </View>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text }]}>{naat.title_fa}</Text>
      </View>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{naat.title_ps}</Text>
      <Text style={[styles.reciter, { color: theme.textSecondary }]}>{naat.reciter_name}</Text>

      {isActive && durationMillis > 0 && (
        <View style={styles.seekSection}>
          <View
            ref={trackRef}
            style={[styles.seekTrack, { backgroundColor: theme.backgroundSecondary }]}
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
                styles.seekFill,
                {
                  width: fillWidth,
                  backgroundColor: theme.tint,
                  left: 0,
                },
              ]}
            />
            <View
              style={[
                styles.seekThumb,
                {
                  backgroundColor: theme.tint,
                  left: thumbOffset,
                },
              ]}
            />
          </View>
          <View style={styles.timeRow}>
            <Text style={[styles.timeText, { color: theme.textSecondary }]}>
              {formatTime(seekingRatio !== null ? seekingRatio * durationMillis : positionMillis)}
            </Text>
            <Text style={[styles.timeText, { color: theme.textSecondary }]}>{formatTime(durationMillis)}</Text>
          </View>
        </View>
      )}

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
            <MaterialIcons name={isActive && isPlaying ? 'pause' : 'play-arrow'} size={22} color="#fff" />
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
  seekSection: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  seekTrack: {
    height: 6,
    borderRadius: BorderRadius.full,
    position: 'relative',
    direction: 'ltr',
  },
  seekFill: {
    height: '100%',
    position: 'absolute',
    borderRadius: BorderRadius.full,
  },
  seekThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  timeRow: {
    marginTop: Spacing.xs,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
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
