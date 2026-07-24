import { AppState, Platform } from 'react-native';

import type { PrayerTimes } from '@/utils/prayerTimes';
import { getPrayerTimesForDateRange } from '@/utils/prayerTimesAgent';
import { buildDateFromLocalTimeInTimezone, getDateKeyInTimezone } from '@/utils/prayerTimezone';
import { buildWidgetSnapshot } from '@/utils/widgetSnapshot';
import { writeWidgetSnapshot } from '@/utils/widgetDataBridge';

let lastPushedAt = 0;
const MIN_PUSH_INTERVAL_MS = 15_000;

async function refreshAndroidWidget(snapshot: ReturnType<typeof buildWidgetSnapshot>): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const { requestWidgetUpdate } = await import('react-native-android-widget');
    const React = await import('react');
    const { PrayerTimesWidget } = await import('@/widgets/PrayerTimesWidget');
    const { refreshWidgetSnapshot } = await import('@/utils/widgetSnapshot');

    const freshSnapshot = refreshWidgetSnapshot(snapshot);

    await requestWidgetUpdate({
      widgetName: 'PrayerTimesWidget',
      renderWidget: () =>
        React.createElement(PrayerTimesWidget, { snapshot: freshSnapshot }),
    });
  } catch (error) {
    console.warn('[pushWidgetSnapshot] Android widget refresh failed:', error);
  }
}

export async function pushWidgetSnapshot(
  prayerTimes: PrayerTimes | null,
  cityName: string,
  options?: {
    force?: boolean;
    cityKey?: string;
    location?: { latitude: number; longitude: number; timezone?: string };
    timezone?: string;
    /** Days to prefetch into the widget snapshot. Default 1 (cold-start safe). */
    horizonDays?: number;
  },
): Promise<void> {
  if (!prayerTimes) return;

  const now = Date.now();
  if (!options?.force && now - lastPushedAt < MIN_PUSH_INTERVAL_MS) {
    return;
  }

  lastPushedAt = now;
  const timezone =
    options?.timezone ||
    options?.location?.timezone ||
    'Asia/Kabul';

  const horizonDays = Math.max(1, options?.horizonDays ?? 1);
  let multiDay: Array<{ dateKey: string; times: PrayerTimes; noonAnchor: Date }> | undefined;
  let sourceLabel: string | undefined;
  if ((options?.cityKey || options?.location) && horizonDays > 1) {
    try {
      const bundles = await getPrayerTimesForDateRange({
        cityKey: options.cityKey,
        location: options.location,
        startDate: new Date(),
        days: horizonDays,
        // Widget prefetch must not compete with adhan sync on Diyanet I/O.
        allowNetwork: false,
      });
      sourceLabel = bundles[0]?.sourceLabel;
      multiDay = bundles.map((bundle) => ({
        dateKey: bundle.dateKey,
        times: bundle.times,
        noonAnchor: buildDateFromLocalTimeInTimezone(bundle.dateKey, '12:00', bundle.timezone || timezone),
      }));
    } catch (error) {
      console.warn('[pushWidgetSnapshot] multi-day prefetch failed:', error);
    }
  }

  const snapshot = buildWidgetSnapshot(prayerTimes, cityName, new Date(), {
    timezone,
    sourceLabel,
    multiDay,
  });
  await writeWidgetSnapshot(snapshot);

  if (Platform.OS === 'android' && AppState.currentState === 'active') {
    await refreshAndroidWidget(snapshot);
  }
}

export function widgetDateKeyNow(timezone?: string): string {
  return getDateKeyInTimezone(new Date(), timezone);
}
