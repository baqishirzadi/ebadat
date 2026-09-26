import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { PrayerChip } from '@/components/home/PrayerChip';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing } from '@/constants/theme';
import { usePrayer } from '@/context/PrayerContext';
import { formatPrayerTime12h } from '@/utils/formatPrayerTime';
import { getCurrentPrayerKey } from '@/utils/prayerDisplay';
import { displayPrayerLabel } from '@/utils/prayerCalculationPolicy';
import { PRAYER_LABELS_DARI, prayerLabel, PrayerTimes } from '@/utils/prayerTimes';
import { useApp } from '@/context/AppContext';

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
  const { theme, state: appState } = useApp();
  const { state } = usePrayer();
  const [now, setNow] = useState(() => new Date());
  const current = prayerTimes ? getCurrentPrayerKey(prayerTimes, now) : null;
  const timeZone = state.location?.timezone;

  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      const timer = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(timer);
    }, []),
  );

  return (
    <Pressable onPress={() => router.push('/(tabs)/jantari' as never)}>
      <RtlView
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.cardBorder },
        ]}
      >
        {PRAYERS.map((prayer) => {
          const time = prayerTimes?.[prayer.key];
          const active = current === prayer.key;
          return (
            <PrayerChip
              key={prayer.key}
              label={displayPrayerLabel(
                prayer.key,
                prayerLabel(prayer.key, appState.preferences.appLanguage),
                state.settings.selectedCity,
                state.location,
              )}
              time={time ? formatPrayerTime12h(time, timeZone) : '--:--'}
              active={active}
            />
          );
        })}
      </RtlView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: 4,
    alignItems: 'center',
  },
});
