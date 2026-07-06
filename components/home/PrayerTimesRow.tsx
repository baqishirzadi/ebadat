import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { PrayerTimes } from '@/utils/prayerTimes';

const PRAYERS = [
  { key: 'fajr' as const, label: 'صبح' },
  { key: 'dhuhr' as const, label: 'ظهر' },
  { key: 'asr' as const, label: 'عصر' },
  { key: 'maghrib' as const, label: 'مغرب' },
  { key: 'isha' as const, label: 'عشا' },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fa-AF', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getCurrentPrayerKey(times: PrayerTimes, now: Date): string | null {
  const order = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  let current: string | null = null;
  for (const key of order) {
    if (times[key] <= now) current = key;
  }
  return current;
}

interface PrayerTimesRowProps {
  prayerTimes: PrayerTimes | null;
}

export function PrayerTimesRow({ prayerTimes }: PrayerTimesRowProps) {
  const { theme } = useApp();
  const now = new Date();
  const current = prayerTimes ? getCurrentPrayerKey(prayerTimes, now) : null;

  return (
    <Pressable onPress={() => router.push('/(tabs)/jantari' as never)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        style={styles.scroll}
      >
        {PRAYERS.map((prayer) => {
          const time = prayerTimes?.[prayer.key];
          const active = current === prayer.key;
          return (
            <View
              key={prayer.key}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.tint : theme.card,
                  borderColor: active ? theme.tint : theme.cardBorder,
                },
              ]}
            >
              <Text style={[styles.chipLabel, { color: active ? '#fff' : theme.text }]}>{prayer.label}</Text>
              <Text style={[styles.chipTime, { color: active ? '#fff' : theme.textSecondary }]}>
                {time ? formatTime(time) : '--:--'}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: Spacing.md,
  },
  row: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    flexDirection: 'row-reverse',
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    minWidth: 72,
  },
  chipLabel: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  chipTime: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
