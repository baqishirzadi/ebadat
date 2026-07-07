import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { PrayerChip } from '@/components/home/PrayerChip';
import { RtlView } from '@/components/ui/RtlView';
import { Spacing } from '@/constants/theme';
import { formatPrayerTime12h } from '@/utils/formatPrayerTime';
import { getCurrentPrayerKey } from '@/utils/prayerDisplay';
import { PRAYER_LABELS_DARI, PrayerTimes } from '@/utils/prayerTimes';

const PRAYERS = [
  { key: 'fajr' as const, label: PRAYER_LABELS_DARI.fajr },
  { key: 'dhuhr' as const, label: PRAYER_LABELS_DARI.dhuhr },
  { key: 'asr' as const, label: PRAYER_LABELS_DARI.asr },
  { key: 'maghrib' as const, label: PRAYER_LABELS_DARI.maghrib },
  { key: 'isha' as const, label: PRAYER_LABELS_DARI.isha },
];

interface PrayerTimesRowProps {
  prayerTimes: PrayerTimes | null;
}

export function PrayerTimesRow({ prayerTimes }: PrayerTimesRowProps) {
  const now = new Date();
  const current = prayerTimes ? getCurrentPrayerKey(prayerTimes, now) : null;

  return (
    <Pressable onPress={() => router.push('/(tabs)/jantari' as never)}>
      <RtlView style={styles.row}>
        {PRAYERS.map((prayer) => {
          const time = prayerTimes?.[prayer.key];
          const active = current === prayer.key;
          return (
            <PrayerChip
              key={prayer.key}
              label={prayer.label}
              time={time ? formatPrayerTime12h(time) : '--:--'}
              active={active}
            />
          );
        })}
      </RtlView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: 4,
    marginBottom: Spacing.md,
  },
});
