/**
 * Qibla Compass Screen
 * Shows direction to Kaaba using device sensors
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, AppState, Alert, Pressable } from 'react-native';
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
import { DEFAULT_LOCATION, calculateQibla, distanceToKaaba } from '@/utils/prayerTimes';
import { Typography, Spacing } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';
import { CitySelectorModal } from '@/components/prayer/CitySelectorModal';
import { CityKey, getCity } from '@/utils/cities';
import { detectLocationAndFindCity } from '@/utils/gpsLocation';

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
  const { state, setCustomLocation, requestPrayerSchedule } = usePrayer();
  const [heading, setHeading] = useState(0);
  const [sensorStatus, setSensorStatus] = useState<QiblaSensorStatus>('loading');
  const [isLoading, setIsLoading] = useState(true);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const compassRotation = useSharedValue(0);
  const needleRotation = useSharedValue(0);
  const subscriptionRef = useRef<HeadingSubscription>(null);
  const headingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingRef = useRef<number | null>(null);
  const focusedRef = useRef(false);
  const rejectedSamplesRef = useRef(0);

  const hasResolvedCity = Boolean(state.settings.selectedCity);
  const effectiveLocation = hasResolvedCity ? state.location : DEFAULT_LOCATION;
  const effectiveLocationName = hasResolvedCity ? state.locationName : 'کابل';
  const qiblaDirection = calculateQibla(effectiveLocation);
  const distance = Math.round(distanceToKaaba(effectiveLocation));
  const qiblaDirectionLabel = Math.round(qiblaDirection).toLocaleString('fa-AF');
  const headingLabel = Math.round(heading).toLocaleString('fa-AF');
  const distanceLabel = distance.toLocaleString('fa-AF');
  const fallbackDescription = hasResolvedCity
    ? 'قطب‌نمای زنده در این دستگاه فعال نیست، اما جهت قبله بر اساس شهر انتخاب‌شده محاسبه شد.'
    : 'هنوز شهری برای نماز انتخاب نشده است؛ برای آسانی، جهت قبله با کابل نمایش داده شد. می‌توانید شهر را تغییر دهید یا موقعیت دقیق بگیرید.';

  const clearHeadingTimeout = useCallback(() => {
    if (headingTimeoutRef.current) {
      clearTimeout(headingTimeoutRef.current);
      headingTimeoutRef.current = null;
    }
  }, []);

  const stopSensorUpdates = useCallback(() => {
    clearHeadingTimeout();
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
  }, [clearHeadingTimeout]);

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
        clearHeadingTimeout();
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
    [clearHeadingTimeout, commitHeading]
  );

  const startMagnetometerFallback = useCallback(async () => {
    const available = await Magnetometer.isAvailableAsync();
    if (!available) {
      clearHeadingTimeout();
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
  }, [clearHeadingTimeout, consumeHeadingSample]);

  const startHeadingUpdates = useCallback(async () => {
    stopSensorUpdates();

    if (!hasResolvedCity) {
      setSensorStatus('unavailable');
      setIsLoading(false);
      return;
    }

    setSensorStatus((current) => (headingRef.current === null ? 'loading' : current));
    setIsLoading(headingRef.current === null);
    headingTimeoutRef.current = setTimeout(() => {
      if (headingRef.current !== null) return;
      setSensorStatus('unavailable');
      setIsLoading(false);
      stopSensorUpdates();
    }, 6500);

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
      if (__DEV__) {
        console.log('[Qibla] Location heading unavailable; trying magnetometer fallback:', error);
      }
    }

    try {
      const started = await startMagnetometerFallback();
      if (!started) {
        setSensorStatus('unavailable');
      }
    } catch (error) {
      if (__DEV__) {
        console.log('[Qibla] Magnetometer fallback unavailable:', error);
      }
      clearHeadingTimeout();
      setSensorStatus('unavailable');
      setIsLoading(false);
    }
  }, [clearHeadingTimeout, consumeHeadingSample, hasResolvedCity, startMagnetometerFallback, stopSensorUpdates]);

  const saveQiblaCity = useCallback(
    async (cityKey: CityKey) => {
      const city = getCity(cityKey);
      if (!city) {
        Alert.alert('انتخاب شهر', 'شهر انتخاب‌شده پیدا نشد.');
        return;
      }

      setIsResolvingLocation(true);
      try {
        await setCustomLocation(
          {
            latitude: city.lat,
            longitude: city.lon,
            altitude: city.altitude || 0,
            timezone: city.timezone,
          },
          city.name,
          city.key,
        );
        setCityPickerVisible(false);
        headingRef.current = null;
        requestPrayerSchedule('qibla-city-selected').catch(() => {});
      } catch {
        Alert.alert('انتخاب شهر', 'ذخیره شهر انجام نشد. لطفاً دوباره تلاش کنید.');
      } finally {
        setIsResolvingLocation(false);
      }
    },
    [requestPrayerSchedule, setCustomLocation],
  );

  const detectQiblaLocation = useCallback(async () => {
    setIsResolvingLocation(true);
    try {
      const result = await detectLocationAndFindCity();
      if (result.success && result.cityKey) {
        await saveQiblaCity(result.cityKey as CityKey);
        return;
      }
      Alert.alert('موقعیت پیدا نشد', result.error || 'لطفاً شهر را دستی انتخاب کنید.');
    } catch {
      Alert.alert('موقعیت پیدا نشد', 'لطفاً شهر را دستی انتخاب کنید.');
    } finally {
      setIsResolvingLocation(false);
    }
  }, [saveQiblaCity]);

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
        <View style={[styles.fallbackPanel, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <MaterialIcons name="explore" size={42} color={theme.tint} />
          </View>
          <CenteredText style={[styles.emptyTitle, { color: theme.text }]}>
            جهت قبله آماده است
          </CenteredText>
          <CenteredText style={[styles.emptyText, { color: theme.textSecondary }]}>
            {hasResolvedCity
              ? 'جهت قبله بر اساس شهر انتخاب‌شده محاسبه شده و قطب‌نمای زنده در حال بررسی است.'
              : 'شهر انتخاب نشده بود؛ جهت قبله با کابل نمایش داده شد و قطب‌نما در حال بررسی است.'}
          </CenteredText>

          <View style={[styles.fallbackStats, { borderColor: theme.cardBorder }]}>
            <View style={styles.fallbackStatRow}>
              <CenteredText style={[styles.fallbackStatLabel, { color: theme.textSecondary }]}>
                شهر
              </CenteredText>
              <CenteredText style={[styles.fallbackStatValue, { color: theme.text }]}>
                {effectiveLocationName}
              </CenteredText>
            </View>
            <View style={[styles.fallbackDivider, { backgroundColor: theme.divider }]} />
            <View style={styles.fallbackStatRow}>
              <CenteredText style={[styles.fallbackStatLabel, { color: theme.textSecondary }]}>
                جهت قبله
              </CenteredText>
              <CenteredText style={[styles.fallbackStatValue, { color: theme.text }]}>
                {qiblaDirectionLabel}°
              </CenteredText>
            </View>
            <View style={[styles.fallbackDivider, { backgroundColor: theme.divider }]} />
            <View style={styles.fallbackStatRow}>
              <CenteredText style={[styles.fallbackStatLabel, { color: theme.textSecondary }]}>
                فاصله تا کعبه
              </CenteredText>
              <CenteredText style={[styles.fallbackStatValue, { color: theme.text }]}>
                {distanceLabel} کیلومتر
              </CenteredText>
            </View>
          </View>

          <View style={styles.resolvingRow}>
            <ActivityIndicator size="small" color={theme.tint} />
            <CenteredText style={[styles.resolvingText, { color: theme.textSecondary }]}>
              در حال بررسی حسگر قطب‌نما...
            </CenteredText>
          </View>
        </View>
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
        <View style={[styles.fallbackPanel, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <MaterialIcons name="explore" size={42} color={theme.tint} />
          </View>
          <CenteredText style={[styles.emptyTitle, { color: theme.text }]}>
            جهت قبله آماده است
          </CenteredText>
          <CenteredText style={[styles.emptyText, { color: theme.textSecondary }]}>
            {fallbackDescription}
          </CenteredText>

          <View style={[styles.fallbackStats, { borderColor: theme.cardBorder }]}>
            <View style={styles.fallbackStatRow}>
              <CenteredText style={[styles.fallbackStatLabel, { color: theme.textSecondary }]}>
                شهر
              </CenteredText>
              <CenteredText style={[styles.fallbackStatValue, { color: theme.text }]}>
                {effectiveLocationName}
              </CenteredText>
            </View>
            <View style={[styles.fallbackDivider, { backgroundColor: theme.divider }]} />
            <View style={styles.fallbackStatRow}>
              <CenteredText style={[styles.fallbackStatLabel, { color: theme.textSecondary }]}>
                جهت قبله
              </CenteredText>
              <CenteredText style={[styles.fallbackStatValue, { color: theme.text }]}>
                {qiblaDirectionLabel}°
              </CenteredText>
            </View>
            <View style={[styles.fallbackDivider, { backgroundColor: theme.divider }]} />
            <View style={styles.fallbackStatRow}>
              <CenteredText style={[styles.fallbackStatLabel, { color: theme.textSecondary }]}>
                فاصله تا کعبه
              </CenteredText>
              <CenteredText style={[styles.fallbackStatValue, { color: theme.text }]}>
                {distanceLabel} کیلومتر
              </CenteredText>
            </View>
          </View>

          <View style={styles.secondaryActions}>
            <Pressable
              testID="qibla-change-city"
              disabled={isResolvingLocation}
              onPress={() => setCityPickerVisible(true)}
              style={({ pressed }) => [
                styles.secondaryAction,
                { borderColor: theme.cardBorder, opacity: isResolvingLocation ? 0.65 : 1 },
                pressed && styles.actionPressed,
              ]}
            >
              <CenteredText style={[styles.secondaryActionText, { color: theme.text }]}>
                {hasResolvedCity ? 'تغییر شهر' : 'انتخاب شهر'}
              </CenteredText>
            </Pressable>
            <Pressable
              testID="qibla-detect-precise-location"
              disabled={isResolvingLocation}
              onPress={detectQiblaLocation}
              style={({ pressed }) => [
                styles.secondaryAction,
                { borderColor: theme.cardBorder, opacity: isResolvingLocation ? 0.65 : 1 },
                pressed && styles.actionPressed,
              ]}
            >
              <CenteredText style={[styles.secondaryActionText, { color: theme.text }]}>موقعیت دقیق</CenteredText>
            </Pressable>
          </View>

          <CenteredText style={[styles.fallbackHint, { color: theme.textSecondary }]}>
            برای قطب‌نمای چرخان، حسگر قطب‌نما یا موقعیت گوشی را فعال و گوشی را آرام به شکل ۸ حرکت دهید.
          </CenteredText>

          {isResolvingLocation && (
            <View style={styles.resolvingRow}>
              <ActivityIndicator size="small" color={theme.tint} />
              <CenteredText style={[styles.resolvingText, { color: theme.textSecondary }]}>
                در حال ذخیره موقعیت...
              </CenteredText>
            </View>
          )}
        </View>

        <CitySelectorModal
          visible={cityPickerVisible}
          selectedCity={(state.settings.selectedCity as CityKey | null) ?? null}
          title="شهر قبله‌نما را انتخاب کنید"
          testID="qibla-city-selector"
          onSelectCity={(cityKey) => {
            saveQiblaCity(cityKey).catch(() => {});
          }}
          onClose={() => setCityPickerVisible(false)}
        />
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
          {effectiveLocationName}
        </CenteredText>
        <CenteredText style={[styles.distanceText, { color: theme.text }]}>
          {distanceLabel} کیلومتر تا کعبه
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
          <CenteredText style={[styles.degreeValue, { color: theme.text }]}>{qiblaDirectionLabel}°</CenteredText>
        </View>
        <View style={[styles.degreeDivider, { backgroundColor: theme.divider }]} />
        <View style={styles.degreeItem}>
          <CenteredText style={[styles.degreeLabel, { color: theme.textSecondary }]}>جهت فعلی</CenteredText>
          <CenteredText style={[styles.degreeValue, { color: theme.text }]}>{headingLabel}°</CenteredText>
        </View>
      </View>

      <CenteredText style={[styles.hint, { color: theme.textSecondary }]}>
        {hintText}
      </CenteredText>

      <CitySelectorModal
        visible={cityPickerVisible}
        selectedCity={(state.settings.selectedCity as CityKey | null) ?? null}
        title="شهر قبله‌نما را انتخاب کنید"
        testID="qibla-city-selector"
        onSelectCity={(cityKey) => {
          saveQiblaCity(cityKey).catch(() => {});
        }}
        onClose={() => setCityPickerVisible(false)}
      />
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
  emptyPanel: {
    width: '88%',
    maxWidth: 430,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  fallbackPanel: {
    width: '88%',
    maxWidth: 430,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  fallbackStats: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 14,
    marginTop: Spacing.lg,
    overflow: 'hidden',
  },
  fallbackStatRow: {
    minHeight: 54,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  fallbackStatLabel: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  fallbackStatValue: {
    flex: 1,
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  fallbackDivider: {
    height: 1,
    alignSelf: 'stretch',
  },
  fallbackHint: {
    marginTop: Spacing.md,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 21,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  emptyTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.subtitle,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  emptyText: {
    marginTop: Spacing.sm,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    lineHeight: 25,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  primaryAction: {
    marginTop: Spacing.lg,
    minHeight: 50,
    borderRadius: 25,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryActionText: {
    color: '#fff',
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  secondaryActions: {
    marginTop: Spacing.md,
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
  },
  secondaryAction: {
    minHeight: 44,
    minWidth: 112,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  secondaryActionText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
  },
  actionPressed: {
    opacity: 0.8,
  },
  resolvingRow: {
    marginTop: Spacing.md,
    minHeight: 32,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resolvingText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    writingDirection: 'rtl',
  },
});
