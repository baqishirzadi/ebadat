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
import { displayPrayerLabel } from '@/utils/prayerCalculationPolicy';
import { PRAYER_LABELS_DARI, prayerLabel } from '@/utils/prayerTimes';
import { useI18n } from '@/utils/i18n/useI18n';

const PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

function TodayPrayerTimesCardInner() {
  const { theme } = useApp();
  const { isPashto, language, t } = useI18n();
  const { state } = usePrayer();
  const prayerTimes = state.prayerTimes;
  const now = new Date();
  const current = prayerTimes ? getCurrentPrayerKey(prayerTimes, now) : null;

  if (!prayerTimes) return null;

  return (
    <RtlView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <RtlText align="center" style={[styles.title, { color: theme.text }]}>{t('calendar.prayerTimes.today')}</RtlText>
      <RtlView style={styles.chips}>
        {PRAYER_KEYS.map((key) => (
          <PrayerChip
            key={key}
            label={displayPrayerLabel(
              key,
              prayerLabel(key, language),
              state.settings.selectedCity,
              state.location,
            )}
            time={formatPrayerTime12h(prayerTimes[key], state.location?.timezone)}
            active={current === key}
          />
        ))}
      </RtlView>
      <Pressable onPress={() => router.push('/adhan-settings')} style={styles.link}>
        <RtlText align="center" style={{ color: theme.tint, fontFamily: 'Vazirmatn-Bold', fontSize: Typography.ui.caption }}>
          {t('calendar.prayerSettings')}
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
