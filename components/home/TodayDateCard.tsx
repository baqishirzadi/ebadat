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
  formatShamsiSlash,
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
      <RtlText align="center" style={[styles.heading, { color: theme.textSecondary }]}>این تاریخ امروز است</RtlText>

      <RtlText align="center" style={[styles.weekday, { color: theme.text }]}>
        {WEEKDAYS_DARI[truth.weekday]}
      </RtlText>

      <RtlText align="center" style={[styles.shamsiDate, { color: theme.tint }]}>
        {formatShamsiSlash(truth.shamsi)}
      </RtlText>

      <RtlView style={[styles.secondaryRow, { borderTopColor: theme.divider }]}>
        <View style={styles.secondaryItem}>
          <RtlText align="center" style={[styles.secondaryLabel, { color: theme.textSecondary }]}>قمری</RtlText>
          <RtlText align="center" style={[styles.qamariValue, { color: theme.tint }]}>
            {toArabicNumerals(truth.hijri.day)} {truth.hijri.monthNameDari} {toArabicNumerals(truth.hijri.year)}
          </RtlText>
        </View>
        <View style={[styles.secondaryDivider, { backgroundColor: theme.divider }]} />
        <View style={styles.secondaryItem}>
          <RtlText align="center" style={[styles.secondaryLabel, { color: theme.textSecondary }]}>میلادی</RtlText>
          <RtlText align="center" style={[styles.gregValue, { color: theme.text }]}>
            {greg.day} {greg.monthEn} {truth.gregorianDate.getUTCFullYear()}
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
    gap: 2,
  },
  heading: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
  weekday: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.subtitle,
    marginTop: 2,
  },
  shamsiDate: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.display,
    marginBottom: Spacing.sm,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  secondaryItem: {
    flex: 1,
    gap: 2,
  },
  secondaryDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: Spacing.md,
  },
  secondaryLabel: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
  },
  qamariValue: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  gregValue: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 20,
  },
});
