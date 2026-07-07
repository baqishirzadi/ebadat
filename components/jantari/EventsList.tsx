import React, { useEffect, useState } from 'react';
import { ActivityIndicator, InteractionManager, StyleSheet, View } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useTodayCalendar } from '@/hooks/useTodayCalendar';
import {
  formatEventDateLabel,
  getEventCategoryColor,
  getUpcomingEvents,
  type CalendarEvent,
} from '@/utils/calendarEvents';
import { debugLog } from '@/utils/debugLog';

type EventRow = CalendarEvent & { color: string; dateLabel: string };

export function EventsList() {
  const { theme } = useApp();
  const truth = useTodayCalendar();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const mountAt = Date.now();

    // #region agent log
    debugLog({
      location: 'EventsList.tsx:mount',
      message: 'EventsList mounted',
      data: { mountAt },
      hypothesisId: 'A',
    });
    // #endregion

    const task = InteractionManager.runAfterInteractions(() => {
      const start = Date.now();
      const rows = getUpcomingEvents(truth.gregorianDate, 5).map((event) => ({
        ...event,
        color: getEventCategoryColor(event.category, theme),
        dateLabel: formatEventDateLabel(event),
      }));

      // #region agent log
      debugLog({
        location: 'EventsList.tsx:computed',
        message: 'events computed',
        data: {
          count: rows.length,
          computeMs: Date.now() - start,
          sinceMountMs: Date.now() - mountAt,
        },
        hypothesisId: 'A',
        runId: 'post-fix',
      });
      // #endregion

      if (!cancelled) {
        setEvents(rows);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [theme.bookmark, theme.tint, truth.gregorianDate]);

  if (loading) {
    return (
      <RtlView style={[styles.wrapper, styles.loadingWrap, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <ActivityIndicator size="small" color={theme.tint} />
      </RtlView>
    );
  }

  if (events.length === 0) return null;

  return (
    <RtlView style={[styles.wrapper, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <RtlText align="center" style={[styles.title, { color: theme.text }]}>مناسبت‌های آینده</RtlText>
      {events.map((event) => (
        <RtlView
          key={event.id}
          style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}
        >
          <View style={[styles.dot, { backgroundColor: event.color }]} />
          <RtlView style={styles.content}>
            <RtlText align="center" style={[styles.eventTitle, { color: theme.text }]}>
              {event.titleDari}
            </RtlText>
            <RtlText align="center" style={[styles.dateLabel, { color: theme.tint }]}>
              {event.dateLabel}
            </RtlText>
            <RtlText align="center" style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={2}>
              {event.descriptionDari}
            </RtlText>
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
    gap: Spacing.sm,
  },
  loadingWrap: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    marginBottom: Spacing.xs,
  },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    width: '100%',
    gap: 4,
    alignItems: 'center',
  },
  eventTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  dateLabel: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
  },
  subtitle: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 20,
  },
});
