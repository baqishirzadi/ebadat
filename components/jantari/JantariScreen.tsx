import React, { memo, useEffect, useState } from 'react';
import { InteractionManager, Platform, ScrollView, StyleSheet, View } from 'react-native';

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
import { useTodayCalendar } from '@/hooks/useTodayCalendar';
import type { CalendarGridMode } from '@/utils/calendarMonthGrid';

export function JantariScreen() {
  const truth = useTodayCalendar();
  const [gridMode, setGridMode] = useState<CalendarGridMode>('shamsi');
  const [showHealthBanner, setShowHealthBanner] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setShowHealthBanner(true));
    return () => task.cancel();
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
          <SectionHeader title="تقویم" />
          <CalendarModeTabs mode={gridMode} onModeChange={setGridMode} />
          <MonthGrid mode={gridMode} onDayPress={setSelectedDate} />
          <SectionHeader title="شمارش معکوس" />
          <CountdownChips />
          <FastingCard />
          <SectionHeader title="مناسبت‌ها" />
          <EventsList hijriMonth={truth.hijri.month} shamsiMonth={truth.shamsi.month} />
          {showHealthBanner ? <AdhanHealthBanner /> : null}
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

export default memo(JantariScreen);
