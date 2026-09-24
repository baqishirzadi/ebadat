/**
 * Qibla Compass Screen
 * Uses unified heading hook + vector compass dial.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Pressable,
  Linking,
  ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalibrationOverlay } from '@/components/qibla/CalibrationOverlay';
import { QiblaDial } from '@/components/qibla/QiblaDial';
import CenteredText from '@/components/CenteredText';
import { CitySelectorModal } from '@/components/prayer/CitySelectorModal';
import { RtlView } from '@/components/ui/RtlView';
import { RtlText } from '@/components/ui/RtlText';
import { Typography, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { useQiblaHeading } from '@/hooks/useQiblaHeading';
import { CityKey, getCity, localizeCityName, normalizeCityKey } from '@/utils/cities';
import { detectLocationAndFindCity } from '@/utils/gpsLocation';
import { getDisplayQiblaBearing, distanceToKaaba } from '@/utils/prayerTimes';
import { hydratePrayerCityFromStorage } from '@/utils/qiblaLocationReady';
import { useI18n } from '@/utils/i18n/useI18n';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(width * 0.82, 340);

type LocationResolveStatus = 'idle' | 'resolving' | 'resolved' | 'denied';

export default function QiblaScreen() {
  const { theme } = useApp();
  const { language, n, t } = useI18n();
  const insets = useSafeAreaInsets();
  const { state, setCustomLocation, requestPrayerSchedule } = usePrayer();
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [compassActive, setCompassActive] = useState(false);
  const [locationResolveStatus, setLocationResolveStatus] = useState<LocationResolveStatus>(() =>
    state.settings.selectedCity ? 'resolved' : 'idle',
  );
  const prepareInFlightRef = useRef(false);

  const hasResolvedCity = Boolean(state.settings.selectedCity);
  const bearingLocation = gpsCoords
    ? { ...state.location, latitude: gpsCoords.lat, longitude: gpsCoords.lon }
    : state.location;
  const qiblaDirection = getDisplayQiblaBearing(
    bearingLocation,
    normalizeCityKey(state.settings.selectedCity),
  );
  const distance = Math.round(distanceToKaaba(bearingLocation));

  const {
    heading,
    headingRotation,
    isAligned,
    showCalibration,
    sensorStatus,
    isDegraded,
    isLocationPermissionDenied,
  } = useQiblaHeading(qiblaDirection, compassActive);

  const hasLiveCompass = sensorStatus !== 'unavailable' && sensorStatus !== 'loading';
  const isSensorWarming = sensorStatus === 'loading';
  const needsCitySetup = !hasResolvedCity && locationResolveStatus === 'denied' && !isPreparing;

  const qiblaDirectionLabel = n(Math.round(qiblaDirection));
  const headingLabel = n(Math.round(heading));
  const distanceLabel = n(distance);

  const saveQiblaCity = useCallback(
    async (cityKey: CityKey) => {
      const city = getCity(cityKey);
      if (!city) {
        Alert.alert(t('qibla.chooseCity'), t('qibla.cityMissing'));
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
        requestPrayerSchedule('qibla-city-selected').catch(() => {});
        return true;
      } catch {
        Alert.alert(t('qibla.chooseCity'), t('qibla.citySaveFailed'));
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
      Alert.alert(t('qibla.locationMissing'), result.error || t('qibla.chooseCityManually'));
    } catch {
      setLocationResolveStatus('denied');
      Alert.alert(t('qibla.locationMissing'), t('qibla.chooseCityManually'));
    } finally {
      setIsResolvingLocation(false);
    }
  }, [saveQiblaCity, setCustomLocation, requestPrayerSchedule]);

  const prepareQibla = useCallback(async () => {
    if (prepareInFlightRef.current) return;
    prepareInFlightRef.current = true;
    setIsPreparing(true);

    try {
      let cityReady = Boolean(state.settings.selectedCity);
      if (!cityReady) {
        cityReady = await hydratePrayerCityFromStorage(setCustomLocation, state.settings.selectedCity);
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
      setCompassActive(true);
      void prepareQibla();

      return () => {
        setCompassActive(false);
        prepareInFlightRef.current = false;
      };
    }, [prepareQibla]),
  );

  useEffect(() => {
    if (state.settings.selectedCity) {
      setLocationResolveStatus('resolved');
    }
  }, [state.settings.selectedCity]);

  const statusColor = isAligned
    ? '#22C55E'
    : sensorStatus === 'calibrating' || isDegraded
      ? '#D97706'
      : theme.tint;

  const statusText = !hasLiveCompass
    ? t('qibla.status.cityOnly')
    : sensorStatus === 'calibrating'
      ? t('qibla.status.calibrating')
      : isDegraded
        ? t('qibla.status.degraded')
        : isAligned
          ? t('qibla.status.aligned')
          : t('qibla.status.rotate');

  const hintText =
    showCalibration || sensorStatus === 'calibrating'
      ? t('qibla.hint.calibrate')
      : t('qibla.hint.city');

  const header = (
    <RtlView style={[styles.header, { backgroundColor: theme.surahHeader, paddingTop: insets.top + Spacing.xs }]}>
      <Pressable
        onPress={() => {
          if (router.canGoBack?.()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }}
        hitSlop={10}
        style={styles.headerBack}
      >
        <MaterialIcons name="arrow-forward" size={24} color="#fff" />
      </Pressable>
      <RtlText align="center" style={styles.headerTitle}>{t('qibla.title')}</RtlText>
      <View style={styles.headerBack} />
    </RtlView>
  );

  const cityModal = (
    <CitySelectorModal
      visible={cityPickerVisible}
      selectedCity={(state.settings.selectedCity as CityKey | null) ?? null}
      title={t('qibla.chooseCityTitle')}
      testID="qibla-city-selector"
      onSelectCity={(cityKey) => {
        saveQiblaCity(cityKey).catch(() => {});
      }}
      onClose={() => setCityPickerVisible(false)}
    />
  );

  if (needsCitySetup) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {header}
        <View style={styles.container}>
        <View style={[styles.setupPanel, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <MaterialIcons name="explore" size={48} color={theme.tint} />
          <CenteredText style={[styles.setupTitle, { color: theme.text }]}>{t('qibla.setup.title')}</CenteredText>
          <CenteredText style={[styles.setupText, { color: theme.textSecondary }]}>
            {t('qibla.setup.body')}
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
              <RtlView style={styles.actionRow}>
                <MaterialIcons name="my-location" size={22} color="#fff" />
                <CenteredText style={styles.primaryActionText}>{t('qibla.useMyLocation')}</CenteredText>
              </RtlView>
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
            <CenteredText style={[styles.secondaryActionText, { color: theme.text }]}>{t('qibla.chooseCity')}</CenteredText>
          </Pressable>
        </View>
        </View>
        {cityModal}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {header}
      <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.background }]} bounces={false}>
      <CalibrationOverlay visible={showCalibration} />

      {(isPreparing || state.isLoading) && (
        <RtlView style={[styles.banner, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
          <ActivityIndicator size="small" color={theme.tint} />
          <CenteredText style={[styles.bannerText, { color: theme.textSecondary }]}>{t('qibla.loadingCity')}</CenteredText>
        </RtlView>
      )}

      {locationResolveStatus === 'resolving' && !isPreparing && (
        <RtlView style={[styles.banner, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
          <ActivityIndicator size="small" color={theme.tint} />
          <CenteredText style={[styles.bannerText, { color: theme.textSecondary }]}>{t('qibla.findingCity')}</CenteredText>
        </RtlView>
      )}

      {isLocationPermissionDenied && (
        <Pressable
          testID="qibla-heading-permission-banner"
          onPress={() => Linking.openSettings().catch(() => {})}
          style={({ pressed }) => [
            styles.banner,
            { backgroundColor: theme.backgroundSecondary, borderColor: theme.tint, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <MaterialIcons name="location-disabled" size={20} color={theme.tint} />
          <CenteredText style={[styles.bannerText, { color: theme.text }]}>{t('qibla.permission')}</CenteredText>
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
          <CenteredText style={[styles.locationChipText, { color: theme.text }]}>{localizeCityName(state.locationName, language)}</CenteredText>
          {hasResolvedCity && (
            <CenteredText style={[styles.locationChipCaption, { color: theme.textSecondary }]}>{t('qibla.cityCaption')}</CenteredText>
          )}
        </View>
        <MaterialIcons name="keyboard-arrow-down" size={22} color={theme.textSecondary} />
      </Pressable>

      <CenteredText style={[styles.distanceText, { color: theme.textSecondary }]}>
        {t('qibla.distanceToKaaba', { distance: distanceLabel })}
      </CenteredText>

      <View testID="qibla-compass-status" style={styles.compassContainer}>
        <QiblaDial
          size={COMPASS_SIZE}
          heading={heading}
          headingRotation={headingRotation}
          qiblaBearing={qiblaDirection}
        />
        {isSensorWarming && (
          <View testID="qibla-compass-loading" style={[styles.compassOverlay, { backgroundColor: `${theme.background}CC` }]}>
            <ActivityIndicator size="large" color={theme.tint} />
            <CenteredText style={[styles.compassOverlayText, { color: theme.textSecondary }]}>
              {t('qibla.preparingCompass')}
            </CenteredText>
          </View>
        )}
      </View>

      <RtlView style={[styles.statusContainer, { backgroundColor: statusColor }]}>
        <MaterialIcons
          name={isAligned ? 'check-circle' : sensorStatus === 'calibrating' ? 'sync' : 'explore'}
          size={24}
          color="#fff"
        />
        <CenteredText style={styles.statusText}>{statusText}</CenteredText>
      </RtlView>

      <RtlView style={styles.degreeInfo}>
        <View style={styles.degreeItem}>
          <CenteredText style={[styles.degreeLabel, { color: theme.textSecondary }]}>{t('qibla.bearing')}</CenteredText>
          <CenteredText style={[styles.degreeValue, { color: theme.text }]}>{qiblaDirectionLabel}°</CenteredText>
        </View>
        <View style={[styles.degreeDivider, { backgroundColor: theme.divider }]} />
        <View style={styles.degreeItem}>
          <CenteredText style={[styles.degreeLabel, { color: theme.textSecondary }]}>{t('qibla.currentHeading')}</CenteredText>
          <CenteredText style={[styles.degreeValue, { color: theme.text }]}>
            {hasLiveCompass ? `${headingLabel}°` : '—'}
          </CenteredText>
        </View>
      </RtlView>

      <CenteredText style={[styles.hint, { color: theme.textSecondary }]}>{hintText}</CenteredText>
      <CenteredText style={[styles.mosqueNote, { color: theme.textSecondary }]}>
        {t('qibla.mosqueNote')}
      </CenteredText>
      {cityModal}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  mosqueNote: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 20,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    opacity: 0.8,
  },
  headerBack: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.subtitle,
    color: '#fff',
  },
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
  primaryAction: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  primaryActionText: {
    color: '#fff',
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  secondaryAction: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.md,
    maxWidth: width * 0.92,
  },
  bannerText: {
    flex: 1,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  locationChip: {
    flexDirection: 'row',
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
  distanceText: {
    fontSize: Typography.ui.caption,
    marginBottom: Spacing.md,
  },
  compassContainer: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    direction: 'ltr',
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
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    marginBottom: 4,
  },
  degreeValue: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.title,
  },
  degreeDivider: {
    width: 1,
    height: 40,
  },
  hint: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    lineHeight: 20,
  },
});
