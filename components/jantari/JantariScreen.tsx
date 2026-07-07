import React, { memo, useEffect, useState } from 'react';
import { InteractionManager, Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarModeTabs } from '@/components/jantari/CalendarModeTabs';
import { CountdownChips } from '@/components/jantari/CountdownChips';
import { EventsList } from '@/components/jantari/EventsList';
import { FastingCard } from '@/components/jantari/FastingCard';
import { MonthGrid } from '@/components/jantari/MonthGrid';
import { TodayHeroCard } from '@/components/jantari/TodayHeroCard';
import { TodayPrayerTimesCard } from '@/components/jantari/TodayPrayerTimesCard';
import { AdhanHealthBanner } from '@/components/prayer/AdhanHealthBanner';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useTodayCalendar } from '@/hooks/useTodayCalendar';
import type { CalendarGridMode } from '@/utils/calendarMonthGrid';

export function JantariScreen() {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const truth = useTodayCalendar();
  const [gridMode, setGridMode] = useState<CalendarGridMode>('qamari');
  const [showHealthBanner, setShowHealthBanner] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setShowHealthBanner(true));
    return () => task.cancel();
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.sm, paddingBottom: Spacing.xxl }}
      removeClippedSubviews={Platform.OS === 'android'}
    >
      <RtlView>
        <RtlText align="center" style={[styles.screenTitle, { color: theme.text }]}>
          جنتری
        </RtlText>
        <TodayHeroCard />
        <CountdownChips />
        <FastingCard />
        <CalendarModeTabs mode={gridMode} onModeChange={setGridMode} />
        <MonthGrid mode={gridMode} />
        <EventsList hijriMonth={truth.hijri.month} shamsiMonth={truth.shamsi.month} />
        <TodayPrayerTimesCard />
        {showHealthBanner ? <AdhanHealthBanner /> : null}
      </RtlView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.heading,
    marginBottom: Spacing.md,
  },
});

export default memo(JantariScreen);
