import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { getCalendarTruth } from '@/utils/calendarTruth';
import { getNextSpecialDay, hijriToGregorian, SPECIAL_DAYS } from '@/utils/islamicCalendar';
import { toArabicNumerals } from '@/utils/numbers';

function daysUntil(target: Date): number {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function CountdownChips() {
  const { theme } = useApp();
  const truth = getCalendarTruth();

  const chips = useMemo(() => {
    const results: { label: string; days: number }[] = [];

    const ramadan = SPECIAL_DAYS.find((d) => d.month === 9 && d.day === 1);
    if (ramadan) {
      let target = hijriToGregorian(truth.hijri.year, 9, 1);
      if (target && target <= truth.gregorianDate) {
        target = hijriToGregorian(truth.hijri.year + 1, 9, 1);
      }
      if (target) {
        results.push({ label: 'تا رمضان', days: daysUntil(target) });
      }
    }

    const nextEid = getNextSpecialDay(truth.hijri);
    if (nextEid?.isEid) {
      const target = hijriToGregorian(truth.hijri.year, nextEid.month, nextEid.day)
        ?? hijriToGregorian(truth.hijri.year + 1, nextEid.month, nextEid.day);
      if (target) {
        results.push({ label: `تا ${nextEid.nameDari}`, days: daysUntil(target) });
      }
    }

    return results;
  }, [truth.gregorianDate, truth.hijri]);

  if (chips.length === 0) return null;

  return (
    <View style={styles.row}>
      {chips.map((chip) => (
        <View key={chip.label} style={[styles.chip, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
          <Text style={[styles.days, { color: theme.tint }]}>{toArabicNumerals(chip.days)} روز</Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{chip.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  days: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  label: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
