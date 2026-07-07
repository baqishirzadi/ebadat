import React, { memo, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { CalendarModeTabs } from '@/components/jantari/CalendarModeTabs';
import { CountdownChips } from '@/components/jantari/CountdownChips';
import { DayDetailSheet } from '@/components/jantari/DayDetailSheet';
import { EventsList } from '@/components/jantari/EventsList';
import { FastingCard } from '@/components/jantari/FastingCard';
import { JantariHeader } from '@/components/jantari/JantariHeader';
import { MonthGrid } from '@/components/jantari/MonthGrid';
import { TodayHeroCard } from '@/components/jantari/TodayHeroCard';
import { TodayPrayerTimesCard } from '@/components/jantari/TodayPrayerTimesCard';
import { SectionHeader } from '@/components/home/SectionHeader';
import { AdhanHealthBanner } from '@/components/prayer/AdhanHealthBanner';
import { RtlView } from '@/components/ui/RtlView';
import { Spacing } from '@/constants/theme';
import type { CalendarGridMode } from '@/utils/calendarMonthGrid';
import { warmCalendarEventsCache } from '@/utils/calendarEvents';
import { debugLog } from '@/utils/debugLog';

type DeferredSection = 'grid' | 'events' | 'extras' | 'banner';

const SECTION_STAGGER_MS = 280;

export function JantariScreen() {
  const [gridMode, setGridMode] = useState<CalendarGridMode>('shamsi');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [deferred, setDeferred] = useState<Set<DeferredSection>>(new Set());

  useEffect(() => {
    const screenMount = Date.now();
    let cancelled = false;
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    // #region agent log
    debugLog({
      location: 'JantariScreen.tsx:mount',
      message: 'Jantari screen mounted',
      data: { screenMount },
      hypothesisId: 'C',
    });
    // #endregion

    const bootTimer = setTimeout(() => {
      if (cancelled) return;

      const warmStart = Date.now();
      warmCalendarEventsCache(new Date());

      // #region agent log
      debugLog({
        location: 'JantariScreen.tsx:prefetch',
        message: 'events cache warmed',
        data: { warmMs: Date.now() - warmStart, sinceMountMs: Date.now() - screenMount },
        hypothesisId: 'A',
        runId: 'post-fix',
      });
      // #endregion

      const sections: DeferredSection[] = ['grid', 'events', 'extras', 'banner'];
      sections.forEach((section, index) => {
        const timer = setTimeout(() => {
          if (cancelled) return;
          // #region agent log
          debugLog({
            location: 'JantariScreen.tsx:defer',
            message: 'section enabled',
            data: { section, index, sinceMountMs: Date.now() - screenMount },
            hypothesisId: 'C',
            runId: 'post-fix',
          });
          // #endregion
          setDeferred((prev) => {
            const next = new Set(prev);
            next.add(section);
            return next;
          });
        }, index * SECTION_STAGGER_MS);
        timers.push(timer);
      });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(bootTimer);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Spacing.xxl }}
        removeClippedSubviews={Platform.OS === 'android'}
      >
        <RtlView>
          <JantariHeader />
          <TodayHeroCard />
          <SectionHeader title="اوقات نماز" />
          <TodayPrayerTimesCard />
          {deferred.has('grid') ? (
            <>
              <SectionHeader title="تقویم" />
              <CalendarModeTabs mode={gridMode} onModeChange={setGridMode} />
              <MonthGrid mode={gridMode} onDayPress={setSelectedDate} />
            </>
          ) : (
            <View style={styles.placeholder} />
          )}
          {deferred.has('events') ? (
            <>
              <SectionHeader title="مناسبت‌ها" />
              <EventsList />
            </>
          ) : null}
          {deferred.has('extras') ? (
            <>
              <SectionHeader title="شمارش معکوس" />
              <CountdownChips />
              <FastingCard />
            </>
          ) : null}
          {deferred.has('banner') ? <AdhanHealthBanner /> : null}
        </RtlView>
      </ScrollView>

      <DayDetailSheet
        visible={selectedDate !== null}
        date={selectedDate}
        onClose={() => setSelectedDate(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    minHeight: 280,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
});

export default memo(JantariScreen);
