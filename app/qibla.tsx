/**
 * Qibla Compass Screen
 * Shows direction to Kaaba using device sensors
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import { Stack } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { usePrayer } from '@/context/PrayerContext';
import { useApp } from '@/context/AppContext';
import { distanceToKaaba } from '@/utils/prayerTimes';
import { Typography, Spacing } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = width * 0.8;

export default function QiblaScreen() {
  const { theme } = useApp();
  const { state } = usePrayer();
  const [heading, setHeading] = useState(0);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const compassRotation = useSharedValue(0);
  const needleRotation = useSharedValue(0);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);

  const qiblaDirection = state.qiblaDirection;
  const distance = Math.round(distanceToKaaba(state.location));

  useEffect(() => {
    checkMagnetometer();
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkMagnetometer() {
    try {
      const available = await Magnetometer.isAvailableAsync();
      setIsAvailable(available);
      
      if (available) {
        Magnetometer.setUpdateInterval(100);
        subscriptionRef.current = Magnetometer.addListener((data) => {
          // Calculate heading from magnetometer data
          // Using atan2 with -x and y for correct orientation
          let angle = Math.atan2(-data.x, data.y) * (180 / Math.PI);
          angle = angle >= 0 ? angle : 360 + angle;
          
          // No platform-specific adjustment needed with corrected formula
          
          setHeading(angle);
          
          // Rotate compass (inverse of heading)
          compassRotation.value = withSpring(-angle, {
            damping: 20,
            stiffness: 100,
          });
          
          // Needle points to Qibla (qibla direction - heading)
          let qiblaAngle = qiblaDirection - angle;
          if (qiblaAngle < 0) qiblaAngle += 360;
          needleRotation.value = withSpring(qiblaAngle, {
            damping: 20,
            stiffness: 100,
          });
        });
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Magnetometer error:', error);
      setIsAvailable(false);
      setIsLoading(false);
    }
  }

  const compassStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${compassRotation.value}deg` }],
  }));

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${needleRotation.value}deg` }],
  }));

  // Check if aligned with Qibla (within 5 degrees)
  const qiblaOffset = Math.abs(((heading - qiblaDirection + 180) % 360) - 180);
  const isAligned = qiblaOffset <= 5;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen
          options={{
            title: 'قبله‌نما',
            headerStyle: { backgroundColor: theme.surahHeader, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
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
            headerStyle: { backgroundColor: theme.surahHeader, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
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
          headerStyle: { backgroundColor: theme.surahHeader, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
          headerTintColor: '#fff',
        }}
      />

      {/* Location Info */}
      <View style={styles.locationInfo}>
        <CenteredText style={[styles.locationText, { color: theme.textSecondary }]}>
          {state.locationName}
        </CenteredText>
        <CenteredText style={[styles.distanceText, { color: theme.text }]}>
          {distance.toLocaleString('fa-AF')} کیلومتر تا کعبه
        </CenteredText>
      </View>

      {/* Compass */}
      <View style={styles.compassContainer}>
        {/* Compass Rose */}
        <Animated.View style={[styles.compass, compassStyle]}>
          <View style={[styles.compassCircle, { borderColor: theme.cardBorder }]}>
            {/* Cardinal directions */}
            <CenteredText style={[styles.cardinalN, { color: '#EF4444' }]}>N</CenteredText>
            <CenteredText style={[styles.cardinalE, { color: theme.textSecondary }]}>E</CenteredText>
            <CenteredText style={[styles.cardinalS, { color: theme.textSecondary }]}>S</CenteredText>
            <CenteredText style={[styles.cardinalW, { color: theme.textSecondary }]}>W</CenteredText>
            
            {/* Degree markers */}
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

        {/* Qibla Needle */}
        <Animated.View style={[styles.needleContainer, needleStyle]}>
          <View style={[styles.needle, { backgroundColor: isAligned ? '#22C55E' : theme.tint }]}>
            <MaterialIcons name="navigation" size={32} color="#fff" />
          </View>
          <View style={[styles.needleTail, { backgroundColor: isAligned ? '#22C55E' : theme.tint }]} />
        </Animated.View>

        {/* Kaaba Icon at center */}
        <View style={[styles.centerIcon, { backgroundColor: theme.background }]}>
          <CenteredText style={styles.kaabaEmoji}>🕋</CenteredText>
        </View>
      </View>

      {/* Status */}
      <View style={[
        styles.statusContainer,
        { backgroundColor: isAligned ? '#22C55E' : theme.tint }
      ]}>
        <MaterialIcons
          name={isAligned ? 'check-circle' : 'explore'}
          size={24}
          color="#fff"
        />
        <CenteredText style={styles.statusText}>
          {isAligned ? 'جهت قبله صحیح است' : 'دستگاه را بچرخانید'}
        </CenteredText>
      </View>

      {/* Degree Info */}
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

      {/* Calibration hint */}
      <CenteredText style={[styles.hint, { color: theme.textSecondary }]}>
        اگر قطب‌نما دقیق نیست، دستگاه را به شکل ۸ حرکت دهید
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
