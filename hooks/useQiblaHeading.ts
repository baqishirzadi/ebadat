import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

const DEAD_BAND = 1.5;
const MAX_JUMP = 65;
const ALIGNMENT_THRESHOLD = 4;
const ANIM_MS = 180;

export type QiblaHeadingMode = 'location' | 'magnetometer' | 'none';
export type QiblaAccuracyLevel = 'high' | 'medium' | 'low';

export interface QiblaHeadingState {
  heading: number;
  mode: QiblaHeadingMode;
  accuracyLevel: QiblaAccuracyLevel;
  isDegraded: boolean;
  isAligned: boolean;
  showCalibration: boolean;
  sensorStatus: 'loading' | 'ready' | 'calibrating' | 'unavailable';
}

function normalize(angle: number): number {
  const n = angle % 360;
  return n < 0 ? n + 360 : n;
}

function shortestDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function accuracyFromSample(source: QiblaHeadingMode, accuracy?: number): QiblaAccuracyLevel {
  if (source === 'magnetometer') return 'low';
  if ((accuracy ?? 0) >= 2) return 'high';
  if (accuracy === 1) return 'medium';
  return 'low';
}

/** Platform-correct magnetometer → compass heading (degrees, 0=north). */
function magnetometerToHeading(x: number, y: number): number {
  if (Platform.OS === 'ios') {
    return normalize((Math.atan2(x, y) * 180) / Math.PI);
  }
  return normalize((Math.atan2(-x, y) * 180) / Math.PI);
}

function pickLocationHeading(sample: Location.LocationHeadingObject): number {
  const raw = sample.trueHeading >= 0 ? sample.trueHeading : sample.magHeading;
  return normalize(raw);
}

export function useQiblaHeading(qiblaBearing: number, enabled: boolean) {
  const headingRotation = useSharedValue(0);
  const continuousHeading = useRef(0);
  const alignedRef = useRef(false);
  const lowAccuracySince = useRef<number | null>(null);
  const hasSampleRef = useRef(false);

  const [state, setState] = useState<QiblaHeadingState>({
    heading: 0,
    mode: 'none',
    accuracyLevel: 'low',
    isDegraded: false,
    isAligned: false,
    showCalibration: false,
    sensorStatus: 'loading',
  });

  const applyHeading = useCallback(
    (raw: number, mode: QiblaHeadingMode, accuracy?: number) => {
      const normalized = normalize(raw);
      const delta = shortestDelta(continuousHeading.current, normalized);

      if (hasSampleRef.current && Math.abs(delta) > MAX_JUMP) return;
      if (hasSampleRef.current && Math.abs(delta) < DEAD_BAND) return;

      if (!hasSampleRef.current) {
        continuousHeading.current = normalized;
        hasSampleRef.current = true;
      } else {
        const smoothing =
          mode === 'location'
            ? (accuracy ?? 0) >= 3
              ? 0.4
              : accuracy === 2
                ? 0.28
                : 0.18
            : 0.22;
        continuousHeading.current = normalize(continuousHeading.current + delta * smoothing);
      }

      const display = continuousHeading.current;
      headingRotation.value = withTiming(-display, {
        duration: ANIM_MS,
        easing: Easing.out(Easing.cubic),
      });

      const aligned = Math.abs(shortestDelta(display, qiblaBearing)) <= ALIGNMENT_THRESHOLD;
      if (aligned && !alignedRef.current) {
        alignedRef.current = true;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (!aligned) {
        alignedRef.current = false;
      }

      const accuracyLevel = accuracyFromSample(mode, accuracy);
      const now = Date.now();
      if (accuracyLevel === 'low' && mode === 'location') {
        if (!lowAccuracySince.current) lowAccuracySince.current = now;
      } else {
        lowAccuracySince.current = null;
      }
      const showCalibration =
        lowAccuracySince.current !== null && now - lowAccuracySince.current > 3000;

      setState((prev) => {
        const sensorStatus =
          mode === 'magnetometer'
            ? 'ready'
            : !hasSampleRef.current
              ? 'loading'
              : (accuracy ?? 0) >= 2
                ? 'ready'
                : accuracy === 1
                  ? 'calibrating'
                  : 'calibrating';

        if (
          prev.heading === display &&
          prev.mode === mode &&
          prev.isAligned === aligned &&
          prev.showCalibration === showCalibration &&
          prev.accuracyLevel === accuracyLevel &&
          prev.sensorStatus === sensorStatus
        ) {
          return prev;
        }

        return {
          heading: display,
          mode,
          accuracyLevel,
          isDegraded: mode === 'magnetometer',
          isAligned: aligned,
          showCalibration,
          sensorStatus,
        };
      });
    },
    [headingRotation, qiblaBearing],
  );

  useEffect(() => {
    if (!enabled) return;

    let locationSub: { remove: () => void } | null = null;
    let magnetSub: { remove: () => void } | null = null;
    let cancelled = false;

    const startMagnetometer = async () => {
      const available = await Magnetometer.isAvailableAsync();
      if (!available || cancelled) return false;
      Magnetometer.setUpdateInterval(100);
      magnetSub = Magnetometer.addListener((data) => {
        if (cancelled) return;
        applyHeading(magnetometerToHeading(data.x, data.y), 'magnetometer');
      });
      return true;
    };

    const start = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          const ok = await startMagnetometer();
          if (!ok) setState((s) => ({ ...s, sensorStatus: 'unavailable', mode: 'none' }));
          return;
        }

        try {
          const initial = await Location.getHeadingAsync();
          if (!cancelled) {
            applyHeading(pickLocationHeading(initial), 'location', initial.accuracy);
          }
        } catch {
          // continue to watch
        }

        locationSub = await Location.watchHeadingAsync((sample) => {
          if (cancelled) return;
          applyHeading(pickLocationHeading(sample), 'location', sample.accuracy);
        });
      } catch {
        const ok = await startMagnetometer();
        if (!ok) setState((s) => ({ ...s, sensorStatus: 'unavailable', mode: 'none' }));
      }
    };

    void start();

    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && !locationSub && !magnetSub) {
        hasSampleRef.current = false;
        void start();
      }
    });

    return () => {
      cancelled = true;
      locationSub?.remove();
      magnetSub?.remove();
      appSub.remove();
    };
  }, [applyHeading, enabled]);

  // Reset smoothing when qibla bearing changes (city change)
  useEffect(() => {
    alignedRef.current = false;
  }, [qiblaBearing]);

  return { ...state, headingRotation };
};
