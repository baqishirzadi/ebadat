import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { getAfghanHolidaysForMonth } from '@/utils/afghanHolidays';
import { SPECIAL_DAYS } from '@/utils/islamicCalendar';
import { toArabicNumerals } from '@/utils/numbers';

interface EventsListProps {
  hijriMonth: number;
  shamsiMonth: number;
}

export function EventsList({ hijriMonth, shamsiMonth }: EventsListProps) {
  const { theme } = useApp();

  const events = useMemo(() => {
    const islamic = SPECIAL_DAYS.filter((d) => d.month === hijriMonth).map((d) => ({
      key: `h-${d.month}-${d.day}`,
      title: d.nameDari,
      subtitle: d.descriptionDari,
      day: d.day,
    }));
    const afghan = getAfghanHolidaysForMonth(0, shamsiMonth).map((d) => ({
      key: `a-${d.shamsiMonth}-${d.shamsiDay}`,
      title: d.nameDari,
      subtitle: d.descriptionDari,
      day: d.shamsiDay,
    }));
    return [...islamic, ...afghan].sort((a, b) => a.day - b.day);
  }, [hijriMonth, shamsiMonth]);

  if (events.length === 0) return null;

  return (
    <RtlView style={[styles.wrapper, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <RtlText style={[styles.title, { color: theme.text }]}>مناسبت‌های این ماه</RtlText>
      {events.map((event) => (
        <RtlView key={event.key} style={[styles.row, { borderBottomColor: theme.divider }]}>
          <RtlText align="center" style={[styles.day, { color: theme.tint }]}>
            {toArabicNumerals(event.day)}
          </RtlText>
          <View style={styles.textBlock}>
            <RtlText style={[styles.eventTitle, { color: theme.text }]}>{event.title}</RtlText>
            <RtlText style={[styles.subtitle, { color: theme.textSecondary }]}>{event.subtitle}</RtlText>
          </View>
        </RtlView>
      ))}
    </RtlView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  title: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  day: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    width: 28,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  eventTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
  },
  subtitle: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
});
