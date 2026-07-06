import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const DEAD_BAND = 1.5;
const MAX_JUMP = 65;
const ALIGNMENT_THRESHOLD = 3;

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

export function useQiblaHeading(qiblaBearing: number, enabled: boolean) {
  const headingRotation = useSharedValue(0);
  const needleRotation = useSharedValue(0);
  const continuousHeading = useRef(0);
  const alignedRef = useRef(false);
  const lowAccuracySince = useRef<number | null>(null);

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
      if (Math.abs(delta) > MAX_JUMP) return;
      if (Math.abs(delta) < DEAD_BAND) return;

      continuousHeading.current += delta;
      const display = normalize(continuousHeading.current);

      headingRotation.value = withSpring(-display, { damping: 18, stiffness: 120 });
      const needleTarget = normalize(qiblaBearing - display);
      needleRotation.value = withSpring(needleTarget, { damping: 18, stiffness: 120 });

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
            : accuracy === undefined
              ? 'loading'
              : (accuracy ?? 0) >= 2
                ? 'ready'
                : accuracy === 1
                  ? 'ready'
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
    [headingRotation, needleRotation, qiblaBearing],
  );

  useEffect(() => {
    if (!enabled) return;

    let subscription: { remove: () => void } | null = null;
    let magnetSub: { remove: () => void } | null = null;
    let cancelled = false;

    const start = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setState((s) => ({ ...s, sensorStatus: 'unavailable', mode: 'none' }));
          return;
        }

        subscription = await Location.watchHeadingAsync((sample) => {
          if (cancelled) return;
          const heading = sample.trueHeading >= 0 ? sample.trueHeading : sample.magHeading;
          applyHeading(heading, 'location', sample.accuracy);
        });
      } catch {
        try {
          Magnetometer.setUpdateInterval(120);
          magnetSub = Magnetometer.addListener((data) => {
            if (cancelled) return;
            const angle = normalize((Math.atan2(data.y, data.x) * 180) / Math.PI);
            applyHeading(angle, 'magnetometer');
          });
        } catch {
          setState((s) => ({ ...s, sensorStatus: 'unavailable', mode: 'none' }));
        }
      }
    };

    void start();

    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && !subscription && !magnetSub) {
        void start();
      }
    });

    return () => {
      cancelled = true;
      subscription?.remove();
      magnetSub?.remove();
      appSub.remove();
    };
  }, [applyHeading, enabled]);

  return { ...state, headingRotation, needleRotation };
}
