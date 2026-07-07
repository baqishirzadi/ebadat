import { router } from 'expo-router';
import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useTodayCalendar } from '@/hooks/useTodayCalendar';
import {
  formatGregorianParts,
  formatHijriSlash,
  formatShamsiSlash,
  WEEKDAYS_AR,
  WEEKDAYS_DARI,
} from '@/utils/calendarDisplay';
import { toArabicNumerals } from '@/utils/numbers';

function TodayDateCardInner() {
  const { theme } = useApp();
  const truth = useTodayCalendar();
  const greg = formatGregorianParts(truth.gregorianDate);

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/jantari' as never)}
      style={[styles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
    >
      <RtlText style={[styles.heading, { color: theme.textSecondary }]}>این تاریخ امروز است</RtlText>

      <RtlText style={[styles.weekday, { color: theme.text }]}>
        {WEEKDAYS_DARI[truth.weekday]}
      </RtlText>

      <RtlText style={[styles.shamsiDate, { color: theme.tint }]}>
        {formatShamsiSlash(truth.shamsi)}
      </RtlText>

      <RtlView style={[styles.row, { borderTopColor: theme.divider }]}>
        <RtlText style={[styles.emoji, { color: theme.text }]}>🌙</RtlText>
        <View style={styles.rowBody}>
          <RtlText style={[styles.rowLabel, { color: theme.textSecondary }]}>قمری</RtlText>
          <RtlText style={[styles.rowValue, { color: theme.text }]}>
            {WEEKDAYS_AR[truth.weekday]} • {toArabicNumerals(truth.hijri.day)} •{' '}
            {truth.hijri.monthNameDari} • {formatHijriSlash(truth.hijri)}
          </RtlText>
        </View>
      </RtlView>

      <RtlView style={[styles.row, { borderTopColor: theme.divider }]}>
        <RtlText style={[styles.emoji, { color: theme.text }]}>🗓️</RtlText>
        <View style={styles.rowBody}>
          <RtlText style={[styles.rowLabel, { color: theme.textSecondary }]}>میلادی</RtlText>
          <RtlText style={[styles.rowValue, { color: theme.text }]}>
            {greg.weekdayEn} • {greg.day} • {greg.monthEn}
          </RtlText>
        </View>
      </RtlView>
    </Pressable>
  );
}

export const TodayDateCard = memo(TodayDateCardInner);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  heading: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
  weekday: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.subtitle,
    marginTop: Spacing.xs,
  },
  shamsiDate: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.display,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  emoji: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
  },
  rowValue: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    lineHeight: 22,
  },
});
