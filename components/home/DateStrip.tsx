import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { getCalendarTruth } from '@/utils/calendarTruth';
import { formatAfghanSolarHijriDate } from '@/utils/afghanSolarHijri';
import { formatHijriDate } from '@/utils/islamicCalendar';

const GREGORIAN_MONTHS_FA = [
  'جنوری', 'فبروری', 'مارچ', 'اپریل', 'می', 'جون',
  'جولای', 'اگست', 'سپتمبر', 'اکتوبر', 'نومبر', 'دسمبر',
];

const WEEKDAYS_FA = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

export function DateStrip() {
  const { theme } = useApp();
  const truth = getCalendarTruth();

  const greg = truth.gregorianDate;
  const gregLine = `${WEEKDAYS_FA[greg.getDay()]} • ${greg.getDate()} ${GREGORIAN_MONTHS_FA[greg.getMonth()]}`;

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/jantari' as never)}
      style={[styles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
    >
      <Text style={[styles.primary, { color: theme.text }]}>
        {formatHijriDate(truth.hijri, 'dari')} قمری
      </Text>
      <Text style={[styles.secondary, { color: theme.textSecondary }]}>
        {formatAfghanSolarHijriDate(truth.shamsi, 'dari')} شمسی
      </Text>
      <Text style={[styles.secondary, { color: theme.textSecondary }]}>{gregLine} میلادی</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 4,
  },
  primary: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  secondary: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
