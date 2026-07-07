import { router } from 'expo-router';
import React, { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { PRAYER_LABELS_DARI, PrayerTimes } from '@/utils/prayerTimes';

const PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fa-AF', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getCurrentPrayerKey(times: PrayerTimes, now: Date): string | null {
  let current: string | null = null;
  for (const key of PRAYER_KEYS) {
    if (times[key] <= now) current = key;
  }
  return current;
}

function TodayPrayerTimesCardInner() {
  const { theme } = useApp();
  const { state } = usePrayer();
  const prayerTimes = state.prayerTimes;
  const now = new Date();
  const current = prayerTimes ? getCurrentPrayerKey(prayerTimes, now) : null;

  if (!prayerTimes) return null;

  return (
    <RtlView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <RtlText style={[styles.title, { color: theme.text }]}>اوقات نماز امروز</RtlText>
      <RtlView style={styles.chips}>
        {PRAYER_KEYS.map((key) => {
          const active = current === key;
          return (
            <RtlView
              key={key}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.tint : theme.backgroundSecondary,
                  borderColor: active ? theme.tint : theme.cardBorder,
                },
              ]}
            >
              <RtlText align="center" style={[styles.chipLabel, { color: active ? '#fff' : theme.text }]}>
                {PRAYER_LABELS_DARI[key]}
              </RtlText>
              <RtlText align="center" style={[styles.chipTime, { color: active ? '#fff' : theme.textSecondary }]}>
                {formatTime(prayerTimes[key])}
              </RtlText>
            </RtlView>
          );
        })}
      </RtlView>
      <Pressable onPress={() => router.push('/adhan-settings')} style={styles.link}>
        <RtlText align="center" style={{ color: theme.tint, fontFamily: 'Vazirmatn-Bold', fontSize: Typography.ui.caption }}>
          تنظیمات اذان
        </RtlText>
      </Pressable>
    </RtlView>
  );
}

export const TodayPrayerTimesCard = memo(TodayPrayerTimesCardInner);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  title: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  chips: {
    flexDirection: 'row',
    gap: 4,
  },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  chipLabel: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 11,
  },
  chipTime: {
    fontFamily: 'Vazirmatn',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  link: {
    marginTop: Spacing.xs,
    alignItems: 'center',
  },
});
