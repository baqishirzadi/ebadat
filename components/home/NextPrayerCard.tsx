import { useFocusEffect } from '@react-navigation/native';
import React, { memo, useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { getNextPrayer, PrayerTimes } from '@/utils/prayerTimes';

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fa-AF', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const CountdownText = memo(function CountdownText({
  prayerTimes,
  tint,
}: {
  prayerTimes: PrayerTimes;
  tint: string;
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

  return (
    <Text style={[styles.countdown, { color: tint }]}>{formatCountdown(remaining)}</Text>
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
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.accent }]}>
        <RtlText style={[styles.empty, { color: theme.textSecondary }]}>اوقات نماز در دسترس نیست</RtlText>
      </View>
    );
  }

  const next = getNextPrayer(prayerTimes);
  const adhanOn = state.adhanPreferences.masterEnabled;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.accent }]}>
      <View style={[styles.innerBorder, { borderColor: theme.accent }]} />
      <RtlText align="center" style={[styles.label, { color: theme.textSecondary }]}>نماز بعدی</RtlText>
      <RtlText align="center" style={[styles.prayerName, { color: theme.text }]}>{next.nameDari}</RtlText>
      <RtlText align="center" style={[styles.time, { color: theme.accent }]}>{formatTime(next.time)}</RtlText>
      <CountdownText prayerTimes={prayerTimes} tint={theme.tint} />
      <RtlText align="center" style={[styles.hint, { color: theme.textSecondary }]}>
        {adhanOn ? 'اذان فعال است' : 'اذان غیرفعال است'}
      </RtlText>
    </View>
  );
}

export const NextPrayerCard = memo(NextPrayerCardInner);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
    position: 'relative',
    overflow: 'hidden',
  },
  innerBorder: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    opacity: 0.35,
  },
  label: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
  prayerName: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.heading,
  },
  time: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 32,
  },
  countdown: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.subtitle,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    marginTop: Spacing.xs,
  },
  empty: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    paddingVertical: Spacing.lg,
  },
});
