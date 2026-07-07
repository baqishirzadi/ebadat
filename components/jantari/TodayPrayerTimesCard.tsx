import { router } from 'expo-router';
import React, { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { PrayerChip } from '@/components/home/PrayerChip';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { formatPrayerTime12h } from '@/utils/formatPrayerTime';
import { getCurrentPrayerKey } from '@/utils/prayerDisplay';
import { PRAYER_LABELS_DARI } from '@/utils/prayerTimes';

const PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

function TodayPrayerTimesCardInner() {
  const { theme } = useApp();
  const { state } = usePrayer();
  const prayerTimes = state.prayerTimes;
  const now = new Date();
  const current = prayerTimes ? getCurrentPrayerKey(prayerTimes, now) : null;

  if (!prayerTimes) return null;

  return (
    <RtlView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <RtlText align="center" style={[styles.title, { color: theme.text }]}>اوقات نماز امروز</RtlText>
      <RtlView style={styles.chips}>
        {PRAYER_KEYS.map((key) => (
          <PrayerChip
            key={key}
            label={PRAYER_LABELS_DARI[key]}
            time={formatPrayerTime12h(prayerTimes[key])}
            active={current === key}
          />
        ))}
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
  link: {
    marginTop: Spacing.xs,
    alignItems: 'center',
  },
});
