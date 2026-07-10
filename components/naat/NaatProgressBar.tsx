import React, { useCallback, useMemo, useRef, useState } from 'react';
import { I18nManager, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

type Props = {
  positionMillis: number;
  durationMillis: number;
  onSeek?: (millis: number) => void;
  fillColor: string;
  trackColor: string;
  textColor: string;
  large?: boolean;
};

const SEEK_THROTTLE_MS = 70;

export function formatNaatTime(millis: number) {
  const totalSeconds = Math.max(0, Math.floor(millis / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function NaatProgressBar({
  positionMillis,
  durationMillis,
  onSeek,
  fillColor,
  trackColor,
  textColor,
  large = false,
}: Props) {
  const [seekingRatio, setSeekingRatio] = useState<number | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const trackRef = useRef<View>(null);
  const trackMetricsRef = useRef({ left: 0, width: 0 });
  const seekRatioRef = useRef<number | null>(null);
  const lastSeekAtRef = useRef(0);

  const progress = durationMillis > 0 ? positionMillis / durationMillis : 0;
  const displayProgress = seekingRatio !== null ? seekingRatio : progress;
  const clampedProgress = Math.max(0, Math.min(displayProgress, 1));
  const fillWidth = trackWidth ? trackWidth * clampedProgress : 0;
  const thumbSize = large ? 18 : 16;
  const thumbOffset = Math.max(0, Math.min(Math.max(trackWidth - thumbSize, 0), fillWidth - thumbSize / 2));

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
      // iOS: forced-LTR bar + pageX align without inversion (fixed in 1a9445e).
      // Android under forceRTL: touch coords are still mirrored → invert ratio only there.
      if (Platform.OS === 'android' && I18nManager.isRTL) {
        return 1 - rawRatio;
      }
      return rawRatio;
    },
    [trackWidth],
  );

  const commitSeek = useCallback(
    (ratio: number, force = false) => {
      if (!onSeek || durationMillis <= 0) return;
      const now = Date.now();
      if (!force && now - lastSeekAtRef.current < SEEK_THROTTLE_MS) return;
      lastSeekAtRef.current = now;
      onSeek(Math.max(0, Math.min(durationMillis, ratio * durationMillis)));
    },
    [durationMillis, onSeek],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => Boolean(onSeek && durationMillis > 0),
        onMoveShouldSetPanResponder: () => Boolean(onSeek && durationMillis > 0),
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
          commitSeek(ratio);
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
    [commitSeek, computeRatio, durationMillis, onSeek, trackWidth, updateTrackMetrics],
  );

  return (
    <View style={styles.container}>
      <View style={{ direction: 'ltr', width: '100%' }}>
        <View
          ref={trackRef}
          style={[
            styles.track,
            large && styles.trackLarge,
            { backgroundColor: trackColor },
          ]}
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
              styles.fill,
              {
                width: fillWidth,
                backgroundColor: fillColor,
                left: 0,
              },
            ]}
          />
          {onSeek && durationMillis > 0 && (
            <View
              style={[
                styles.thumb,
                large && styles.thumbLarge,
                {
                  backgroundColor: fillColor,
                  left: thumbOffset,
                },
              ]}
            />
          )}
        </View>
      </View>
      <View style={styles.timeRow}>
        <Text style={[styles.timeText, large && styles.timeTextLarge, { color: textColor }]}>
          {formatNaatTime(seekingRatio !== null ? seekingRatio * durationMillis : positionMillis)}
        </Text>
        <Text style={[styles.timeText, large && styles.timeTextLarge, { color: textColor }]}>
          {formatNaatTime(durationMillis)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  track: {
    height: 6,
    borderRadius: BorderRadius.full,
    position: 'relative',
    direction: 'ltr',
  },
  trackLarge: {
    height: 8,
  },
  fill: {
    height: '100%',
    position: 'absolute',
    borderRadius: BorderRadius.full,
  },
  thumb: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  thumbLarge: {
    top: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  timeRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  timeTextLarge: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
  },
});
