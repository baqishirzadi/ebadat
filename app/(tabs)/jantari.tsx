/**
 * Jantari — Islamic calendar hub
 */

import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountdownChips } from '@/components/jantari/CountdownChips';
import { EventsList } from '@/components/jantari/EventsList';
import { FastingCard, HijriOffsetRow } from '@/components/jantari/FastingCard';
import { MonthGrid } from '@/components/jantari/MonthGrid';
import { TodayHeroCard } from '@/components/jantari/TodayHeroCard';
import { AdhanHealthBanner } from '@/components/prayer/AdhanHealthBanner';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import type { CalendarGridMode } from '@/utils/calendarMonthGrid';
import { getCalendarTruth } from '@/utils/calendarTruth';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fa-AF', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function JantariScreen() {
  const { theme } = useApp();
  const { state, updateSettings } = usePrayer();
  const insets = useSafeAreaInsets();
  const truth = getCalendarTruth();

  const [gridMode, setGridMode] = useState<CalendarGridMode>('qamari');
  const [displayYear, setDisplayYear] = useState(truth.hijri.year);
  const [displayMonth, setDisplayMonth] = useState(truth.hijri.month);

  const handleModeChange = (mode: CalendarGridMode) => {
    setGridMode(mode);
    if (mode === 'qamari') {
      setDisplayYear(truth.hijri.year);
      setDisplayMonth(truth.hijri.month);
    } else if (mode === 'shamsi') {
      setDisplayYear(truth.shamsi.year);
      setDisplayMonth(truth.shamsi.month);
    } else {
      setDisplayYear(truth.gregorianDate.getFullYear());
      setDisplayMonth(truth.gregorianDate.getMonth() + 1);
    }
  };

  const prayers = state.prayerTimes
    ? [
        { key: 'fajr', label: 'صبح', time: state.prayerTimes.fajr },
        { key: 'dhuhr', label: 'ظهر', time: state.prayerTimes.dhuhr },
        { key: 'asr', label: 'عصر', time: state.prayerTimes.asr },
        { key: 'maghrib', label: 'مغرب', time: state.prayerTimes.maghrib },
        { key: 'isha', label: 'عشا', time: state.prayerTimes.isha },
      ]
    : [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.sm, paddingBottom: Spacing.xxl }}
    >
      <Text style={[styles.screenTitle, { color: theme.text }]}>جنتری</Text>
      <TodayHeroCard />
      <CountdownChips />
      <FastingCard />
      <MonthGrid
        mode={gridMode}
        year={displayYear}
        month={displayMonth}
        onModeChange={handleModeChange}
        onMonthChange={(year, month) => {
          setDisplayYear(year);
          setDisplayMonth(month);
        }}
      />
      <EventsList hijriMonth={displayMonth} shamsiMonth={truth.shamsi.month} />
      <HijriOffsetRow
        offset={state.settings.hijriOffsetDays}
        onChange={(offset) => updateSettings({ hijriOffsetDays: offset })}
      />

      {prayers.length > 0 ? (
        <View style={[styles.prayerCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>اوقات نماز امروز</Text>
          {prayers.map((p) => (
            <View key={p.key} style={styles.prayerRow}>
              <Text style={[styles.prayerTime, { color: theme.tint }]}>{formatTime(p.time)}</Text>
              <Text style={[styles.prayerLabel, { color: theme.text }]}>{p.label}</Text>
            </View>
          ))}
          <Pressable onPress={() => router.push('/adhan-settings')} style={styles.adhanLink}>
            <Text style={{ color: theme.tint, fontFamily: 'Vazirmatn-Bold' }}>تنظیمات اذان</Text>
          </Pressable>
        </View>
      ) : null}

      <AdhanHealthBanner />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.heading,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: Spacing.md,
  },
  prayerCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: Spacing.xs,
  },
  prayerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  prayerLabel: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    writingDirection: 'rtl',
  },
  prayerTime: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    fontVariant: ['tabular-nums'],
  },
  adhanLink: {
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
});
