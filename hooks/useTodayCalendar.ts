import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { usePrayer } from '@/context/PrayerContext';
import { getCalendarTruth, type CalendarTruth } from '@/utils/calendarTruth';

/** Cached today's calendar — refreshes on foreground, at midnight, every minute, and when the Hijri offset changes. */
export function useTodayCalendar(): CalendarTruth {
  const hijriOffsetDays = usePrayer().state.settings.hijriOffsetDays;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTick((t) => t + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const delay = Math.max(nextMidnight.getTime() - now.getTime(), 1000);
    const id = setTimeout(() => setTick((t) => t + 1), delay);
    return () => clearTimeout(id);
  }, [tick]);

  return useMemo(() => getCalendarTruth(new Date(), hijriOffsetDays), [tick, hijriOffsetDays]);
}
