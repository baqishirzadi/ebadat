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
      color: '#DC2626',
    }));
    const afghan = getAfghanHolidaysForMonth(0, shamsiMonth).map((d) => ({
      key: `a-${d.shamsiMonth}-${d.shamsiDay}`,
      title: d.nameDari,
      subtitle: d.descriptionDari,
      day: d.shamsiDay,
      color: theme.tint,
    }));
    return [...islamic, ...afghan].sort((a, b) => a.day - b.day);
  }, [hijriMonth, shamsiMonth, theme.tint]);

  if (events.length === 0) return null;

  return (
    <RtlView style={[styles.wrapper, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <RtlText align="center" style={[styles.title, { color: theme.text }]}>مناسبت‌های این ماه</RtlText>
      {events.map((event, index) => (
        <RtlView key={event.key} style={[styles.row, { borderBottomColor: theme.divider }]}>
          <RtlView style={styles.timeline}>
            <View style={[styles.dot, { backgroundColor: event.color }]} />
            {index < events.length - 1 ? (
              <View style={[styles.line, { backgroundColor: theme.divider }]} />
            ) : null}
          </RtlView>
          <RtlView style={styles.content}>
            <RtlView style={styles.titleRow}>
              <RtlText align="right" style={[styles.eventTitle, { color: theme.text }]}>{event.title}</RtlText>
              <RtlText align="right" style={[styles.day, { color: theme.tint }]}>
                {toArabicNumerals(event.day)}
              </RtlText>
            </RtlView>
            <RtlText align="right" style={[styles.subtitle, { color: theme.textSecondary }]}>{event.subtitle}</RtlText>
          </RtlView>
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
  timeline: {
    width: 20,
    alignItems: 'center',
    paddingTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 24,
    marginTop: 4,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  day: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    minWidth: 24,
  },
  eventTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    flex: 1,
  },
  subtitle: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
});
