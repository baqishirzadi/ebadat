import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { RtlText } from '@/components/ui/RtlText';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { formatPrayerTime12h } from '@/utils/formatPrayerTime';
import { getPrayerProgress } from '@/utils/prayerDisplay';
import { getNextPrayer, PrayerTimes } from '@/utils/prayerTimes';
import { toArabicNumeralsString } from '@/utils/numbers';

const THEME_GRADIENT: [string, string, string] = ['#0F1F14', '#1a4d3e', '#2d6a4f'];
const RING_SIZE = 128;
const STROKE = 5;

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return toArabicNumeralsString(
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    );
  }
  return toArabicNumeralsString(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
}

function ProgressRingWithCountdown({
  progress,
  ringColor,
  countdown,
}: {
  progress: number;
  ringColor: string;
  countdown: string;
}) {
  const radius = (RING_SIZE - STROKE * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <View style={styles.ringContainer}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        <Text style={styles.countdownInside}>{countdown}</Text>
      </View>
    </View>
  );
}

const CountdownBlock = memo(function CountdownBlock({
  prayerTimes,
  ringColor,
}: {
  prayerTimes: PrayerTimes;
  ringColor: string;
}) {
  const [now, setNow] = useState(() => new Date());

  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(timer);
    }, []),
  );

  const next = getNextPrayer(prayerTimes, now);
  const remaining = next.time.getTime() - now.getTime();
  const progress = getPrayerProgress(prayerTimes, now);

  return (
    <ProgressRingWithCountdown
      progress={progress}
      ringColor={ringColor}
      countdown={formatCountdown(remaining)}
    />
  );
});

interface NextPrayerCardProps {
  prayerTimes: PrayerTimes | null;
}

function NextPrayerCardInner({ prayerTimes }: NextPrayerCardProps) {
  const { theme } = useApp();
  const { state } = usePrayer();

  if (!prayerTimes) {
    return (
      <View style={[styles.cardShell, styles.shadow]}>
        <LinearGradient colors={THEME_GRADIENT} style={styles.card}>
          <RtlText align="center" style={styles.empty}>اوقات نماز در دسترس نیست</RtlText>
        </LinearGradient>
      </View>
    );
  }

  const next = getNextPrayer(prayerTimes);
  const adhanOn = state.adhanPreferences.masterEnabled;

  return (
    <View style={[styles.cardShell, styles.shadow]}>
      <LinearGradient colors={THEME_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <RtlText align="center" style={styles.label}>نماز بعدی</RtlText>
        <RtlText align="center" style={styles.prayerName}>{next.nameDari}</RtlText>
        <RtlText align="center" style={[styles.time, { color: theme.bookmark }]}>
          {formatPrayerTime12h(next.time)}
        </RtlText>
        <CountdownBlock prayerTimes={prayerTimes} ringColor={theme.bookmark} />
        <RtlText align="center" style={styles.hint}>
          {adhanOn ? 'اذان فعال است' : 'اذان غیرفعال است'}
        </RtlText>
      </LinearGradient>
    </View>
  );
}

export const NextPrayerCard = memo(NextPrayerCardInner);

const styles = StyleSheet.create({
  cardShell: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  card: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
  },
  label: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.75)',
  },
  prayerName: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.heading,
    color: '#fff',
  },
  time: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownInside: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 20,
    color: '#fff',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  hint: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.65)',
    marginTop: Spacing.xs,
  },
  empty: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    color: 'rgba(255,255,255,0.7)',
    paddingVertical: Spacing.lg,
  },
});
