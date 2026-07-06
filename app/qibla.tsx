/**
 * Qibla Compass Screen
 * Reuses adhan/prayer city; requests location for live compass heading.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  AppState,
  Alert,
  Pressable,
  Linking,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
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
import { calculateQibla, distanceToKaaba } from '@/utils/prayerTimes';
import { Typography, Spacing } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';
import { CitySelectorModal } from '@/components/prayer/CitySelectorModal';
import { CityKey, getCity } from '@/utils/cities';
import { detectLocationAndFindCity } from '@/utils/gpsLocation';
import { hydratePrayerCityFromStorage } from '@/utils/qiblaLocationReady';

const KAABA_IMAGE = require('@/assets/images/kaaba.png');

const { width } = Dimensions.get('window');
const COMPASS_SIZE = width * 0.8;
const DEAD_BAND_DEGREES = 1.5;
const MAX_HEADING_JUMP = 65;

type QiblaSensorStatus = 'loading' | 'ready' | 'calibrating' | 'unstable' | 'unavailable';
type LocationResolveStatus = 'idle' | 'resolving' | 'resolved' | 'denied';
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
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [heading, setHeading] = useState(0);
  const [sensorStatus, setSensorStatus] = useState<QiblaSensorStatus>('loading');
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [headingPermissionDenied, setHeadingPermissionDenied] = useState(false);
  const [locationResolveStatus, setLocationResolveStatus] = useState<LocationResolveStatus>(() =>
    state.settings.selectedCity ? 'resolved' : 'idle',
  );
  const compassRotation = useSharedValue(0);
  const needleRotation = useSharedValue(0);
  const subscriptionRef = useRef<HeadingSubscription>(null);
  const headingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingRef = useRef<number | null>(null);
  const focusedRef = useRef(false);
  const rejectedSamplesRef = useRef(0);
  const prepareInFlightRef = useRef(false);

  const hasResolvedCity = Boolean(state.settings.selectedCity);
  const effectiveLocation = state.location;
  const effectiveLocationName = state.locationName;
  const bearingLocation = gpsCoords
    ? { ...effectiveLocation, latitude: gpsCoords.lat, longitude: gpsCoords.lon }
    : effectiveLocation;
  const qiblaDirection = calculateQibla(bearingLocation);
  const distance = Math.round(distanceToKaaba(bearingLocation));
  const qiblaDirectionLabel = Math.round(qiblaDirection).toLocaleString('fa-AF');
  const headingLabel = Math.round(heading).toLocaleString('fa-AF');
  const distanceLabel = distance.toLocaleString('fa-AF');
  const hasLiveCompass = sensorStatus !== 'unavailable' && headingRef.current !== null;
  const isSensorWarming = sensorStatus === 'loading' && !hasLiveCompass;
  const needsCitySetup = !hasResolvedCity && locationResolveStatus === 'denied' && !isPreparing;

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
    [compassRotation, needleRotation, qiblaDirection],
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
        return;
      }

      const delta = shortestAngleDelta(previousHeading, normalized);
      const maxJump = source === 'location' ? MAX_HEADING_JUMP : MAX_HEADING_JUMP - 10;

      if (Math.abs(delta) > maxJump) {
        rejectedSamplesRef.current += 1;
        setSensorStatus('unstable');
        return;
      }

      rejectedSamplesRef.current = 0;
      if (Math.abs(delta) < DEAD_BAND_DEGREES) {
        setSensorStatus(currentStatus);
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
    },
    [clearHeadingTimeout, commitHeading],
  );

  const requestCompassPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const existing = await Location.getForegroundPermissionsAsync();
      if (existing.status === 'granted') {
        setHeadingPermissionDenied(false);
        return true;
      }
      const requested = await Location.requestForegroundPermissionsAsync();
      const granted = requested.status === 'granted';
      setHeadingPermissionDenied(!granted);
      return granted;
    } catch {
      setHeadingPermissionDenied(true);
      return false;
    }
  }, []);

  const startMagnetometerFallback = useCallback(async () => {
    const available = await Magnetometer.isAvailableAsync();
    if (!available) {
      clearHeadingTimeout();
      setSensorStatus('unavailable');
      return false;
    }

    Magnetometer.setUpdateInterval(120);
    subscriptionRef.current = Magnetometer.addListener((data) => {
      const rawHeading = Math.atan2(-data.x, data.y) * (180 / Math.PI);
      consumeHeadingSample(rawHeading, 'magnetometer');
    });
    setSensorStatus((current) => (current === 'loading' ? 'ready' : current));
    return true;
  }, [clearHeadingTimeout, consumeHeadingSample]);

  const startHeadingUpdates = useCallback(async () => {
    stopSensorUpdates();
    setSensorStatus(headingRef.current === null ? 'loading' : 'ready');

    headingTimeoutRef.current = setTimeout(() => {
      if (headingRef.current !== null) return;
      setSensorStatus('unavailable');
      stopSensorUpdates();
    }, 6500);

    await requestCompassPermissions();

    try {
      const initialHeading = await Location.getHeadingAsync();
      consumeHeadingSample(
        pickHeadingFromLocation(initialHeading),
        'location',
        initialHeading.accuracy,
      );

      subscriptionRef.current = await Location.watchHeadingAsync(
        (sample) => {
          consumeHeadingSample(pickHeadingFromLocation(sample), 'location', sample.accuracy);
        },
        () => {
          setSensorStatus('unstable');
        },
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
    }
  }, [
    clearHeadingTimeout,
    consumeHeadingSample,
    requestCompassPermissions,
    startMagnetometerFallback,
    stopSensorUpdates,
  ]);

  const saveQiblaCity = useCallback(
    async (cityKey: CityKey) => {
      const city = getCity(cityKey);
      if (!city) {
        Alert.alert('انتخاب شهر', 'شهر انتخاب‌شده پیدا نشد.');
        return false;
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
        setGpsCoords(null);
        setCityPickerVisible(false);
        setLocationResolveStatus('resolved');
        headingRef.current = null;
        requestPrayerSchedule('qibla-city-selected').catch(() => {});
        return true;
      } catch {
        Alert.alert('انتخاب شهر', 'ذخیره شهر انجام نشد. لطفاً دوباره تلاش کنید.');
        return false;
      } finally {
        setIsResolvingLocation(false);
      }
    },
    [requestPrayerSchedule, setCustomLocation],
  );

  const detectQiblaLocation = useCallback(async () => {
    setIsResolvingLocation(true);
    setLocationResolveStatus('resolving');
    try {
      const result = await detectLocationAndFindCity();
      if (result.success && result.cityKey) {
        if (result.coordinates) {
          setGpsCoords(result.coordinates);
          const city = getCity(result.cityKey);
          if (city) {
            await setCustomLocation(
              {
                latitude: result.coordinates.lat,
                longitude: result.coordinates.lon,
                altitude: city.altitude || 0,
                timezone: city.timezone,
              },
              city.name,
              result.cityKey,
            );
            setCityPickerVisible(false);
            setLocationResolveStatus('resolved');
            requestPrayerSchedule('qibla-gps-location').catch(() => {});
            return;
          }
        }
        await saveQiblaCity(result.cityKey as CityKey);
        return;
      }
      setLocationResolveStatus('denied');
      Alert.alert('موقعیت پیدا نشد', result.error || 'لطفاً شهر را دستی انتخاب کنید.');
    } catch {
      setLocationResolveStatus('denied');
      Alert.alert('موقعیت پیدا نشد', 'لطفاً شهر را دستی انتخاب کنید.');
    } finally {
      setIsResolvingLocation(false);
    }
  }, [saveQiblaCity]);

  const prepareQibla = useCallback(async () => {
    if (prepareInFlightRef.current) return;
    prepareInFlightRef.current = true;
    setIsPreparing(true);

    try {
      let cityReady = Boolean(state.settings.selectedCity);
      if (!cityReady) {
        cityReady = await hydratePrayerCityFromStorage(
          setCustomLocation,
          state.settings.selectedCity,
        );
      }

      if (!cityReady) {
        setLocationResolveStatus('resolving');
        const result = await detectLocationAndFindCity();
        if (result.success && result.cityKey) {
          await saveQiblaCity(result.cityKey as CityKey);
        } else {
          setLocationResolveStatus('denied');
        }
      } else {
        setLocationResolveStatus('resolved');
      }
    } catch {
      setLocationResolveStatus('denied');
    } finally {
      setIsPreparing(false);
      prepareInFlightRef.current = false;
    }
  }, [saveQiblaCity, setCustomLocation, state.settings.selectedCity]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      void prepareQibla();
      void startHeadingUpdates();

      return () => {
        focusedRef.current = false;
        prepareInFlightRef.current = false;
        stopSensorUpdates();
      };
    }, [prepareQibla, startHeadingUpdates, stopSensorUpdates]),
  );

  useEffect(() => {
    if (state.settings.selectedCity) {
      setLocationResolveStatus('resolved');
    }
  }, [state.settings.selectedCity]);

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
    if (headingRef.current === null) {
      needleRotation.value = withTiming(qiblaDirection, { duration: 280, easing: Easing.out(Easing.cubic) });
      return;
    }
    commitHeading(headingRef.current);
  }, [commitHeading, needleRotation, qiblaDirection]);

  const compassStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${compassRotation.value}deg` }],
  }));

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${needleRotation.value}deg` }],
  }));

  const qiblaOffset = Math.abs(shortestAngleDelta(heading, qiblaDirection));
  const isAligned = hasLiveCompass && sensorStatus === 'ready' && qiblaOffset <= 5;

  const statusColor =
    sensorStatus === 'calibrating' || sensorStatus === 'unstable'
      ? '#D97706'
      : isAligned
        ? '#22C55E'
        : theme.tint;

  const statusText = !hasLiveCompass
    ? 'جهت قبله بر اساس شهر شما؛ برای قطب‌نمای زنده گوشی را آرام بچرخانید'
    : sensorStatus === 'calibrating'
      ? 'قطب‌نما در حال کالیبراسیون است'
      : sensorStatus === 'unstable'
        ? 'حسگر ناپایدار است؛ گوشی را آرام حرکت دهید'
        : isAligned
          ? 'جهت قبله صحیح است'
          : 'دستگاه را بچرخانید';

  const hintText =
    !hasLiveCompass || sensorStatus === 'calibrating' || sensorStatus === 'unstable'
      ? 'اگر قطب‌نما دقیق نیست، دستگاه را به شکل ۸ حرکت دهید'
      : 'همان شهر اذان برای جهت قبله استفاده می‌شود';

  const renderCompass = () => (
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

      <View
        style={[
          styles.centerIcon,
          {
            backgroundColor: theme.background,
            borderColor: theme.cardBorder,
            shadowColor: theme.text,
          },
        ]}
      >
        <Image source={KAABA_IMAGE} style={styles.kaabaImage} contentFit="contain" transition={200} />
      </View>

      {isSensorWarming && (
        <View style={[styles.compassOverlay, { backgroundColor: `${theme.background}CC` }]}>
          <ActivityIndicator size="large" color={theme.tint} />
          <CenteredText style={[styles.compassOverlayText, { color: theme.textSecondary }]}>
            در حال آماده‌سازی قطب‌نما...
          </CenteredText>
        </View>
      )}
    </View>
  );

  if (needsCitySetup) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen
          options={{
            title: 'قبله‌نما',
            headerStyle: { backgroundColor: theme.surahHeader },
            headerTintColor: '#fff',
          }}
        />
        <View style={[styles.setupPanel, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <MaterialIcons name="explore" size={48} color={theme.tint} />
          <CenteredText style={[styles.setupTitle, { color: theme.text }]}>قبله‌نما</CenteredText>
          <CenteredText style={[styles.setupText, { color: theme.textSecondary }]}>
            برای نمایش دقیق جهت قبله، اجازه موقعیت را بدهید تا نزدیک‌ترین شهر پیدا شود.
          </CenteredText>
          <Pressable
            testID="qibla-detect-precise-location"
            disabled={isResolvingLocation}
            onPress={detectQiblaLocation}
            style={({ pressed }) => [
              styles.primaryAction,
              { backgroundColor: theme.tint, opacity: isResolvingLocation ? 0.7 : pressed ? 0.88 : 1 },
            ]}
          >
            {isResolvingLocation ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="my-location" size={22} color="#fff" />
                <CenteredText style={styles.primaryActionText}>استفاده از موقعیت من</CenteredText>
              </>
            )}
          </Pressable>
          <Pressable
            testID="qibla-change-city"
            disabled={isResolvingLocation}
            onPress={() => setCityPickerVisible(true)}
            style={({ pressed }) => [
              styles.secondaryAction,
              { borderColor: theme.cardBorder, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <CenteredText style={[styles.secondaryActionText, { color: theme.text }]}>انتخاب شهر</CenteredText>
          </Pressable>
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
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.background }]}
      bounces={false}
    >
      <Stack.Screen
        options={{
          title: 'قبله‌نما',
          headerStyle: { backgroundColor: theme.surahHeader },
          headerTintColor: '#fff',
        }}
      />

      {(isPreparing || state.isLoading) && (
        <View style={[styles.locationBanner, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
          <ActivityIndicator size="small" color={theme.tint} />
          <CenteredText style={[styles.locationBannerText, { color: theme.textSecondary }]}>
            در حال آماده‌سازی شهر اذان...
          </CenteredText>
        </View>
      )}

      {locationResolveStatus === 'resolving' && !isPreparing && (
        <View style={[styles.locationBanner, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
          <ActivityIndicator size="small" color={theme.tint} />
          <CenteredText style={[styles.locationBannerText, { color: theme.textSecondary }]}>
            در حال یافتن نزدیک‌ترین شهر...
          </CenteredText>
        </View>
      )}

      {headingPermissionDenied && (
        <Pressable
          testID="qibla-heading-permission-banner"
          onPress={() => Linking.openSettings().catch(() => {})}
          style={({ pressed }) => [
            styles.locationBanner,
            { backgroundColor: theme.backgroundSecondary, borderColor: theme.tint, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <MaterialIcons name="location-disabled" size={20} color={theme.tint} />
          <CenteredText style={[styles.locationBannerText, { color: theme.text }]}>
            برای قطب‌نمای زنده، اجازه موقعیت را در تنظیمات فعال کنید
          </CenteredText>
        </Pressable>
      )}

      <Pressable
        testID="qibla-location-chip"
        onPress={() => setCityPickerVisible(true)}
        style={({ pressed }) => [
          styles.locationChip,
          { backgroundColor: theme.card, borderColor: theme.cardBorder, opacity: pressed ? 0.88 : 1 },
        ]}
      >
        <MaterialIcons name="location-on" size={20} color={theme.tint} />
        <View style={styles.locationChipLabels}>
          <CenteredText style={[styles.locationChipText, { color: theme.text }]}>{effectiveLocationName}</CenteredText>
          {hasResolvedCity && (
            <CenteredText style={[styles.locationChipCaption, { color: theme.textSecondary }]}>
              همان شهر اذان شما
            </CenteredText>
          )}
        </View>
        <MaterialIcons name="keyboard-arrow-down" size={22} color={theme.textSecondary} />
      </Pressable>

      <CenteredText style={[styles.distanceText, { color: theme.textSecondary }]}>
        {distanceLabel} کیلومتر تا کعبه
      </CenteredText>

      {renderCompass()}

      <View style={[styles.statusContainer, { backgroundColor: statusColor }]}>
        <MaterialIcons
          name={
            isAligned
              ? 'check-circle'
              : sensorStatus === 'calibrating' || sensorStatus === 'unstable'
                ? 'sync'
                : 'explore'
          }
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
          <CenteredText style={[styles.degreeValue, { color: theme.text }]}>
            {hasLiveCompass ? `${headingLabel}°` : '—'}
          </CenteredText>
        </View>
      </View>

      <CenteredText style={[styles.hint, { color: theme.textSecondary }]}>{hintText}</CenteredText>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  setupPanel: {
    width: '100%',
    maxWidth: 430,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  setupTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.subtitle,
  },
  setupText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    lineHeight: 24,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  locationChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.xs,
    maxWidth: width * 0.92,
  },
  locationChipLabels: {
    flex: 1,
    alignItems: 'center',
  },
  locationChipText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  locationChipCaption: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    marginTop: 2,
  },
  locationBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.md,
    maxWidth: width * 0.92,
  },
  locationBannerText: {
    flex: 1,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  distanceText: {
    fontSize: Typography.ui.caption,
    marginBottom: Spacing.md,
  },
  compassContainer: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: COMPASS_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  compassOverlayText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
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
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  kaabaImage: {
    width: 52,
    height: 52,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 30,
    marginTop: Spacing.lg,
    maxWidth: width * 0.92,
  },
  statusText: {
    flex: 1,
    fontSize: Typography.ui.body,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  degreeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
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
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    writingDirection: 'rtl',
  },
  primaryAction: {
    marginTop: Spacing.sm,
    minHeight: 50,
    width: '100%',
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
  secondaryAction: {
    minHeight: 44,
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  secondaryActionText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
});
