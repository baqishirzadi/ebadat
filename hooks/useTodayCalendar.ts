import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { getCalendarTruth, type CalendarTruth } from '@/utils/calendarTruth';

/** Cached today's calendar — refreshes on foreground, at midnight, and every minute. */
export function useTodayCalendar(): CalendarTruth {
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

  return useMemo(() => getCalendarTruth(), [tick]);
}
