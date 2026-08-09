import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { hasUsableLocationHeading, shouldUseMagnetometerFallback } from '@/utils/qiblaHeadingLifecycle';

const DEAD_BAND = 1.5;
const MAX_JUMP = 65;
const ALIGNMENT_THRESHOLD = 4;
const ANIM_MS = 180;
const HEADING_WATCHDOG_MS = 3500;
const MAGNETOMETER_WATCHDOG_MS = 2500;

/**
 * Android expo-location heading reads ~10° high vs iOS (Kaaba appears left of truth).
 * Subtracting degrees from heading rotates the dial so the marker moves right to match iPhone.
 */
const ANDROID_HEADING_CORRECTION_DEG = Platform.OS === 'android' ? -10 : 0;

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
  isLocationPermissionDenied: boolean;
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
  let heading: number;
  if (Platform.OS === 'ios') {
    heading = normalize((Math.atan2(x, y) * 180) / Math.PI);
  } else {
    heading = normalize((Math.atan2(-x, y) * 180) / Math.PI);
  }
  return normalize(heading + ANDROID_HEADING_CORRECTION_DEG);
}

function pickLocationHeading(sample: Location.LocationHeadingObject): number {
  const raw = sample.trueHeading >= 0 ? sample.trueHeading : sample.magHeading;
  return normalize(raw + ANDROID_HEADING_CORRECTION_DEG);
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
    isLocationPermissionDenied: false,
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
          isLocationPermissionDenied: prev.isLocationPermissionDenied,
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
    let starting = false;
    let didReceiveHeadingWatchSample = false;
    let magnetometerStarted = false;
    let headingWatchdog: ReturnType<typeof setTimeout> | null = null;
    let magnetometerWatchdog: ReturnType<typeof setTimeout> | null = null;

    const clearHeadingWatchdog = () => {
      if (headingWatchdog) clearTimeout(headingWatchdog);
      headingWatchdog = null;
    };

    const clearMagnetometerWatchdog = () => {
      if (magnetometerWatchdog) clearTimeout(magnetometerWatchdog);
      magnetometerWatchdog = null;
    };

    const resetSession = () => {
      continuousHeading.current = 0;
      alignedRef.current = false;
      lowAccuracySince.current = null;
      hasSampleRef.current = false;
      headingRotation.value = 0;
      setState((previous) => ({
        ...previous,
        heading: 0,
        mode: 'none',
        accuracyLevel: 'low',
        isDegraded: false,
        isAligned: false,
        showCalibration: false,
        sensorStatus: 'loading',
        isLocationPermissionDenied: false,
      }));
    };

    const markUnavailable = () => {
      if (cancelled || locationSub || magnetSub) return;
      setState((previous) => ({
        ...previous,
        mode: 'none',
        sensorStatus: 'unavailable',
      }));
    };

    const startMagnetometer = async () => {
      if (magnetometerStarted || cancelled) return Boolean(magnetSub);
      magnetometerStarted = true;
      const available = await Magnetometer.isAvailableAsync();
      if (!available || cancelled) {
        markUnavailable();
        return false;
      }
      Magnetometer.setUpdateInterval(100);
      magnetSub = Magnetometer.addListener((data) => {
        if (cancelled) return;
        clearMagnetometerWatchdog();
        applyHeading(magnetometerToHeading(data.x, data.y), 'magnetometer');
      });
      magnetometerWatchdog = setTimeout(() => {
        if (cancelled || magnetSub === null) return;
        magnetSub.remove();
        magnetSub = null;
        markUnavailable();
      }, MAGNETOMETER_WATCHDOG_MS);
      return true;
    };

    const start = async () => {
      if (starting || cancelled || locationSub || magnetSub) return;
      starting = true;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setState((previous) => ({ ...previous, isLocationPermissionDenied: true }));
          const ok = await startMagnetometer();
          if (!ok) setState((s) => ({ ...s, sensorStatus: 'unavailable', mode: 'none' }));
          return;
        }

        setState((previous) => ({ ...previous, isLocationPermissionDenied: false }));

        try {
          const initial = await Location.getHeadingAsync();
          if (!cancelled && hasUsableLocationHeading(initial)) {
            applyHeading(pickLocationHeading(initial), 'location', initial.accuracy);
          }
        } catch {
          // continue to watch
        }

        headingWatchdog = setTimeout(() => {
          if (
            cancelled ||
            !shouldUseMagnetometerFallback({ didReceiveHeadingWatchSample, fallbackAlreadyStarted: magnetometerStarted })
          ) {
            return;
          }
          locationSub?.remove();
          locationSub = null;
          void startMagnetometer();
        }, HEADING_WATCHDOG_MS);

        const subscription = await Location.watchHeadingAsync((sample) => {
          if (cancelled || !hasUsableLocationHeading(sample)) return;
          didReceiveHeadingWatchSample = true;
          clearHeadingWatchdog();
          applyHeading(pickLocationHeading(sample), 'location', sample.accuracy);
        });

        if (cancelled || magnetometerStarted) {
          subscription.remove();
          return;
        }
        locationSub = subscription;
      } catch {
        const ok = await startMagnetometer();
        if (!ok) setState((s) => ({ ...s, sensorStatus: 'unavailable', mode: 'none' }));
      } finally {
        starting = false;
      }
    };

    resetSession();
    void start();

    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && !locationSub && !magnetSub) {
        resetSession();
        void start();
      }
    });

    return () => {
      cancelled = true;
      clearHeadingWatchdog();
      clearMagnetometerWatchdog();
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
