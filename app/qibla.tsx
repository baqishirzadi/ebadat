/**
 * Qibla Compass Screen
 * Shows direction to Kaaba using device sensors
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, AppState } from 'react-native';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { Stack, useFocusEffect } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { usePrayer } from '@/context/PrayerContext';
import { useApp } from '@/context/AppContext';
import { distanceToKaaba } from '@/utils/prayerTimes';
import { Typography, Spacing } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = width * 0.8;
const DEAD_BAND_DEGREES = 1.5;
const MAX_HEADING_JUMP = 65;

type QiblaSensorStatus = 'loading' | 'ready' | 'calibrating' | 'unstable' | 'unavailable';
type HeadingSubscription = { remove: () => void } | null;

type HeadingSampleSource = 'location' | 'magnetometer';

function normalizeAngle(angle: number): number {
  const normalized = angle % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function shortestAngleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function animateAngle(sharedValue: Animated.SharedValue<number>, target: number) {
  const delta = shortestAngleDelta(sharedValue.value, target);
  sharedValue.value = withTiming(sharedValue.value + delta, {
    duration: 220,
    easing: Easing.out(Easing.cubic),
  });
}

function getStatusFromAccuracy(source: HeadingSampleSource, accuracy?: number): QiblaSensorStatus {
  if (source === 'magnetometer') {
    return 'ready';
  }
  if ((accuracy ?? 0) >= 2) {
    return 'ready';
  }
  if (accuracy === 1) {
    return 'unstable';
  }
  return 'calibrating';
}

function pickHeadingFromLocation(heading: Location.LocationHeadingObject): number {
  const preferred = heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading;
  return normalizeAngle(preferred);
}

export default function QiblaScreen() {
  const { theme } = useApp();
  const { state } = usePrayer();
  const [heading, setHeading] = useState(0);
  const [sensorStatus, setSensorStatus] = useState<QiblaSensorStatus>('loading');
  const [isLoading, setIsLoading] = useState(true);
  const compassRotation = useSharedValue(0);
  const needleRotation = useSharedValue(0);
  const subscriptionRef = useRef<HeadingSubscription>(null);
  const headingRef = useRef<number | null>(null);
  const focusedRef = useRef(false);
  const rejectedSamplesRef = useRef(0);

  const qiblaDirection = state.qiblaDirection;
  const distance = Math.round(distanceToKaaba(state.location));

  const stopSensorUpdates = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
  }, []);

  const commitHeading = useCallback(
    (nextHeading: number) => {
      setHeading(nextHeading);
      animateAngle(compassRotation, -nextHeading);
      animateAngle(needleRotation, normalizeAngle(qiblaDirection - nextHeading));
    },
    [compassRotation, needleRotation, qiblaDirection]
  );

  const consumeHeadingSample = useCallback(
    (rawHeading: number, source: HeadingSampleSource, accuracy?: number) => {
      const normalized = normalizeAngle(rawHeading);
      const currentStatus = getStatusFromAccuracy(source, accuracy);
      const previousHeading = headingRef.current;

      if (previousHeading === null) {
        headingRef.current = normalized;
        rejectedSamplesRef.current = 0;
        commitHeading(normalized);
        setSensorStatus(currentStatus);
        setIsLoading(false);
        return;
      }

      const delta = shortestAngleDelta(previousHeading, normalized);
      const maxJump = source === 'location' ? MAX_HEADING_JUMP : MAX_HEADING_JUMP - 10;

      if (Math.abs(delta) > maxJump) {
        rejectedSamplesRef.current += 1;
        setSensorStatus('unstable');
        setIsLoading(false);
        return;
      }

      rejectedSamplesRef.current = 0;
      if (Math.abs(delta) < DEAD_BAND_DEGREES) {
        setSensorStatus(currentStatus);
        setIsLoading(false);
        return;
      }

      const smoothing =
        source === 'location'
          ? accuracy && accuracy >= 3
            ? 0.35
            : accuracy === 2
              ? 0.26
              : 0.18
          : 0.22;

      const smoothedHeading = normalizeAngle(previousHeading + delta * smoothing);
      headingRef.current = smoothedHeading;
      commitHeading(smoothedHeading);
      setSensorStatus(currentStatus);
      setIsLoading(false);
    },
    [commitHeading]
  );

  const startMagnetometerFallback = useCallback(async () => {
    const available = await Magnetometer.isAvailableAsync();
    if (!available) {
      setSensorStatus('unavailable');
      setIsLoading(false);
      return false;
    }

    Magnetometer.setUpdateInterval(120);
    subscriptionRef.current = Magnetometer.addListener((data) => {
      const rawHeading = Math.atan2(-data.x, data.y) * (180 / Math.PI);
      consumeHeadingSample(rawHeading, 'magnetometer');
    });
    setSensorStatus((current) => (current === 'loading' ? 'ready' : current));
    setIsLoading(false);
    return true;
  }, [consumeHeadingSample]);

  const startHeadingUpdates = useCallback(async () => {
    stopSensorUpdates();
    setSensorStatus((current) => (headingRef.current === null ? 'loading' : current));
    setIsLoading(headingRef.current === null);

    try {
      const initialHeading = await Location.getHeadingAsync();
      consumeHeadingSample(
        pickHeadingFromLocation(initialHeading),
        'location',
        initialHeading.accuracy
      );

      subscriptionRef.current = await Location.watchHeadingAsync(
        (sample) => {
          consumeHeadingSample(pickHeadingFromLocation(sample), 'location', sample.accuracy);
        },
        () => {
          setSensorStatus('unstable');
        }
      );
      return;
    } catch (error) {
      console.warn('Location heading unavailable, falling back to magnetometer:', error);
    }

    try {
      const started = await startMagnetometerFallback();
      if (!started) {
        setSensorStatus('unavailable');
      }
    } catch (error) {
      console.error('Magnetometer error:', error);
      setSensorStatus('unavailable');
      setIsLoading(false);
    }
  }, [consumeHeadingSample, startMagnetometerFallback, stopSensorUpdates]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      void startHeadingUpdates();

      return () => {
        focusedRef.current = false;
        stopSensorUpdates();
      };
    }, [startHeadingUpdates, stopSensorUpdates])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (!focusedRef.current) return;
      if (nextState === 'active') {
        void startHeadingUpdates();
        return;
      }
      stopSensorUpdates();
    });

    return () => {
      subscription.remove();
    };
  }, [startHeadingUpdates, stopSensorUpdates]);

  useEffect(() => {
    if (headingRef.current === null) return;
    commitHeading(headingRef.current);
  }, [commitHeading, qiblaDirection]);

  const compassStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${compassRotation.value}deg` }],
  }));

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${needleRotation.value}deg` }],
  }));

  const qiblaOffset = Math.abs(shortestAngleDelta(heading, qiblaDirection));
  const isAligned = sensorStatus === 'ready' && qiblaOffset <= 5;
  const isAvailable = sensorStatus !== 'unavailable';

  const statusColor =
    sensorStatus === 'calibrating' || sensorStatus === 'unstable'
      ? '#D97706'
      : isAligned
        ? '#22C55E'
        : theme.tint;

  const statusText =
    sensorStatus === 'calibrating'
      ? 'قطب‌نما در حال کالیبراسیون است'
      : sensorStatus === 'unstable'
        ? 'حسگر ناپایدار است؛ گوشی را آرام حرکت دهید'
        : isAligned
          ? 'جهت قبله صحیح است'
          : 'دستگاه را بچرخانید';

  const hintText =
    sensorStatus === 'calibrating' || sensorStatus === 'unstable'
      ? 'برای دقت بیشتر، گوشی را به شکل ۸ حرکت دهید و از قاب‌های آهنی یا مقناطیسی دور نگه دارید'
      : 'اگر قطب‌نما دقیق نیست، دستگاه را به شکل ۸ حرکت دهید';

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen
          options={{
            title: 'قبله‌نما',
            headerStyle: { backgroundColor: theme.surahHeader },
            headerTintColor: '#fff',
          }}
        />
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  if (!isAvailable) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen
          options={{
            title: 'قبله‌نما',
            headerStyle: { backgroundColor: theme.surahHeader },
            headerTintColor: '#fff',
          }}
        />
        <MaterialIcons name="compass-calibration" size={64} color={theme.textSecondary} />
        <CenteredText style={[styles.errorText, { color: theme.text }]}>
          قطب‌نمای دستگاه در دسترس نیست
        </CenteredText>
        <CenteredText style={[styles.errorSubtext, { color: theme.textSecondary }]}>
          جهت قبله از موقعیت شما: {Math.round(qiblaDirection)}°
        </CenteredText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'قبله‌نما',
          headerStyle: { backgroundColor: theme.surahHeader },
          headerTintColor: '#fff',
        }}
      />

      <View style={styles.locationInfo}>
        <CenteredText style={[styles.locationText, { color: theme.textSecondary }]}>
          {state.locationName}
        </CenteredText>
        <CenteredText style={[styles.distanceText, { color: theme.text }]}>
          {distance.toLocaleString('fa-AF')} کیلومتر تا کعبه
        </CenteredText>
      </View>

      <View style={styles.compassContainer}>
        <Animated.View style={[styles.compass, compassStyle]}>
          <View style={[styles.compassCircle, { borderColor: theme.cardBorder }]}> 
            <CenteredText style={[styles.cardinalN, { color: '#EF4444' }]}>N</CenteredText>
            <CenteredText style={[styles.cardinalE, { color: theme.textSecondary }]}>E</CenteredText>
            <CenteredText style={[styles.cardinalS, { color: theme.textSecondary }]}>S</CenteredText>
            <CenteredText style={[styles.cardinalW, { color: theme.textSecondary }]}>W</CenteredText>

            {[...Array(72)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.degreeMark,
                  {
                    transform: [
                      { rotate: `${i * 5}deg` },
                      { translateY: -COMPASS_SIZE / 2 + 10 },
                    ],
                    backgroundColor: i % 18 === 0 ? theme.text : theme.cardBorder,
                    height: i % 18 === 0 ? 12 : i % 6 === 0 ? 8 : 4,
                  },
                ]}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[styles.needleContainer, needleStyle]}>
          <View style={[styles.needle, { backgroundColor: isAligned ? '#22C55E' : theme.tint }]}>
            <MaterialIcons name="navigation" size={32} color="#fff" />
          </View>
          <View style={[styles.needleTail, { backgroundColor: isAligned ? '#22C55E' : theme.tint }]} />
        </Animated.View>

        <View style={[styles.centerIcon, { backgroundColor: theme.background }]}> 
          <CenteredText style={styles.kaabaEmoji}>🕋</CenteredText>
        </View>
      </View>

      <View style={[styles.statusContainer, { backgroundColor: statusColor }]}>
        <MaterialIcons
          name={isAligned ? 'check-circle' : sensorStatus === 'calibrating' || sensorStatus === 'unstable' ? 'sync' : 'explore'}
          size={24}
          color="#fff"
        />
        <CenteredText style={styles.statusText}>{statusText}</CenteredText>
      </View>

      <View style={styles.degreeInfo}>
        <View style={styles.degreeItem}>
          <CenteredText style={[styles.degreeLabel, { color: theme.textSecondary }]}>جهت قبله</CenteredText>
          <CenteredText style={[styles.degreeValue, { color: theme.text }]}>{Math.round(qiblaDirection)}°</CenteredText>
        </View>
        <View style={[styles.degreeDivider, { backgroundColor: theme.divider }]} />
        <View style={styles.degreeItem}>
          <CenteredText style={[styles.degreeLabel, { color: theme.textSecondary }]}>جهت فعلی</CenteredText>
          <CenteredText style={[styles.degreeValue, { color: theme.text }]}>{Math.round(heading)}°</CenteredText>
        </View>
      </View>

      <CenteredText style={[styles.hint, { color: theme.textSecondary }]}>
        {hintText}
      </CenteredText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  locationText: {
    fontSize: Typography.ui.caption,
  },
  distanceText: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  compassContainer: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compass: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  compassCircle: {
    width: COMPASS_SIZE - 20,
    height: COMPASS_SIZE - 20,
    borderRadius: (COMPASS_SIZE - 20) / 2,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardinalN: {
    position: 'absolute',
    top: 20,
    fontSize: 20,
    fontWeight: '700',
  },
  cardinalE: {
    position: 'absolute',
    right: 20,
    fontSize: 16,
    fontWeight: '600',
  },
  cardinalS: {
    position: 'absolute',
    bottom: 20,
    fontSize: 16,
    fontWeight: '600',
  },
  cardinalW: {
    position: 'absolute',
    left: 20,
    fontSize: 16,
    fontWeight: '600',
  },
  degreeMark: {
    position: 'absolute',
    width: 2,
    borderRadius: 1,
  },
  needleContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  needle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -COMPASS_SIZE / 3,
  },
  needleTail: {
    width: 4,
    height: COMPASS_SIZE / 3 - 30,
    borderRadius: 2,
    marginTop: -5,
  },
  centerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  kaabaEmoji: {
    fontSize: 36,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 30,
    marginTop: Spacing.xl,
  },
  statusText: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    color: '#fff',
  },
  degreeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  degreeItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  degreeLabel: {
    fontSize: Typography.ui.caption,
  },
  degreeValue: {
    fontSize: Typography.ui.heading,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  degreeDivider: {
    width: 1,
    height: 40,
  },
  hint: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: Typography.ui.body,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
