import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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

interface NextPrayerCardProps {
  prayerTimes: PrayerTimes | null;
}

export function NextPrayerCard({ prayerTimes }: NextPrayerCardProps) {
  const { theme } = useApp();
  const { state } = usePrayer();
  const [now, setNow] = useState(() => new Date());

  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(timer);
    }, []),
  );

  if (!prayerTimes) {
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.accent }]}>
        <Text style={[styles.empty, { color: theme.textSecondary }]}>اوقات نماز در دسترس نیست</Text>
      </View>
    );
  }

  const next = getNextPrayer(prayerTimes, now);
  const remaining = next.time.getTime() - now.getTime();
  const adhanOn = state.adhanPreferences.masterEnabled;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.accent }]}>
      <View style={[styles.innerBorder, { borderColor: theme.accent }]} />
      <Text style={[styles.label, { color: theme.textSecondary }]}>نماز بعدی</Text>
      <Text style={[styles.prayerName, { color: theme.text }]}>{next.nameDari}</Text>
      <Text style={[styles.time, { color: theme.accent }]}>{formatTime(next.time)}</Text>
      <Text style={[styles.countdown, { color: theme.tint }]}>{formatCountdown(remaining)}</Text>
      <Text style={[styles.hint, { color: theme.textSecondary }]}>
        {adhanOn ? 'اذان فعال است' : 'اذان غیرفعال است'}
      </Text>
    </View>
  );
}

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
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  prayerName: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.heading,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  time: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 32,
    textAlign: 'center',
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
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: Spacing.xs,
  },
  empty: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    textAlign: 'center',
    writingDirection: 'rtl',
    paddingVertical: Spacing.lg,
  },
});
