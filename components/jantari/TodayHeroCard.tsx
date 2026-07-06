import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { getCalendarTruth } from '@/utils/calendarTruth';
import { formatAfghanSolarHijriDate } from '@/utils/afghanSolarHijri';
import { formatHijriDate } from '@/utils/islamicCalendar';

const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
const GREG_MONTHS = [
  'جنوری', 'فبروری', 'مارچ', 'اپریل', 'می', 'جون',
  'جولای', 'اگست', 'سپتمبر', 'اکتوبر', 'نومبر', 'دسمبر',
];

export function TodayHeroCard() {
  const { theme } = useApp();
  const truth = getCalendarTruth();
  const greg = truth.gregorianDate;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.accent }]}>
      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>امروز</Text>
      <Text style={[styles.line, { color: theme.text }]}>
        شمسی: {formatAfghanSolarHijriDate(truth.shamsi, 'dari')} • {WEEKDAYS[truth.weekday]}
      </Text>
      <Text style={[styles.line, { color: theme.text }]}>
        قمری: {formatHijriDate(truth.hijri, 'dari')} • {WEEKDAYS[truth.weekday]}
      </Text>
      <Text style={[styles.line, { color: theme.text }]}>
        میلادی: {WEEKDAYS[greg.getDay()]} • {greg.getDate()} {GREG_MONTHS[greg.getMonth()]} •{' '}
        {String(greg.getMonth() + 1).padStart(2, '0')}/{String(greg.getDate()).padStart(2, '0')}/{greg.getFullYear()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: 6,
  },
  sectionLabel: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  line: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    lineHeight: 24,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
