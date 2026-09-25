import { Platform } from 'react-native';

import type { PrayerTimes } from '@/utils/prayerTimes';
import { getPrayerTimesForDateRange } from '@/utils/prayerTimesAgent';
import { addDaysToDateKey, buildDateFromLocalTimeInTimezone, getDateKeyInTimezone } from '@/utils/prayerTimezone';
import { buildWidgetSnapshot } from '@/utils/widgetSnapshot';
import { writeWidgetSnapshot } from '@/utils/widgetDataBridge';
import { resolvePrayerCalculationPolicy } from '@/utils/prayerCalculationPolicy';
import type { DailyHadithLanguage } from '@/utils/ahadith/daily';

let lastPushedAt = 0;
const MIN_PUSH_INTERVAL_MS = 15_000;

async function refreshAndroidWidget(snapshot: ReturnType<typeof buildWidgetSnapshot>): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const { getWidgetInfo, requestWidgetUpdateById } = await import('react-native-android-widget');
    const React = await import('react');
    const { PrayerTimesWidget } = await import('@/widgets/PrayerTimesWidget');
    const { refreshWidgetSnapshot } = await import('@/utils/widgetSnapshot');

    const freshSnapshot = refreshWidgetSnapshot(snapshot);
    const infos = await getWidgetInfo('PrayerTimesWidget');
    if (!infos.length) {
      console.warn('[pushWidgetSnapshot] no PrayerTimesWidget on launcher');
      return;
    }

    await Promise.all(
      infos.map((info) =>
        requestWidgetUpdateById({
          widgetName: 'PrayerTimesWidget',
          widgetId: info.widgetId,
          renderWidget: (widgetInfo) =>
            React.createElement(PrayerTimesWidget, {
              snapshot: freshSnapshot,
              width: widgetInfo.width,
              height: widgetInfo.height,
            }),
        }),
      ),
    );
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
    location?: { latitude: number; longitude: number; altitude?: number; timezone?: string };
    timezone?: string;
    appLanguage?: DailyHadithLanguage;
    dariFont?: 'vazirmatn' | 'amiri';
    pashtoFont?: 'amiri' | 'nastaliq';
    /** Days to prefetch into the widget snapshot. Default 30 for app-independent rollover. */
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
  const policy = resolvePrayerCalculationPolicy(options?.cityKey, options?.location);

  const horizonDays = Math.max(1, options?.horizonDays ?? 30);
  let multiDay: Array<{ dateKey: string; times: PrayerTimes; noonAnchor: Date }> | undefined;
  let sourceLabel: string | undefined;
  if ((options?.cityKey || options?.location) && horizonDays > 1) {
    try {
      const todayKey = getDateKeyInTimezone(new Date(), timezone);
      const previousDate = buildDateFromLocalTimeInTimezone(
        addDaysToDateKey(todayKey, -1),
        '12:00',
        timezone,
      );
      const bundles = await getPrayerTimesForDateRange({
        cityKey: options.cityKey,
        location: options.location,
        // Retain yesterday so the Android widget can carry Isha across
        // midnight without waiting for the app to open again.
        startDate: previousDate,
        days: horizonDays + 1,
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
    location: options?.location,
    calculationMethod: policy.adhanJsMethod,
    asrMethod: policy.madhab === 'Hanafi' ? 'Hanafi' : 'Standard',
    maghribOffsetMinutes: policy.maghribOffsetMinutes,
    fixedDhuhrLocalTime: policy.fixedDhuhrLocalTime,
    appLanguage: options?.appLanguage,
    dariFont: options?.dariFont,
    pashtoFont: options?.pashtoFont,
    multiDay,
  });
  await writeWidgetSnapshot(snapshot);

  // The multi-day calculation can finish after the app is backgrounded. The
  // widget still needs the freshly persisted snapshot at that point; keeping
  // this refresh behind an `AppState === active` guard left Samsung/Xiaomi
  // launchers showing the initial “open the app” placeholder indefinitely.
  if (Platform.OS === 'android') {
    await refreshAndroidWidget(snapshot);
  }
}

export function widgetDateKeyNow(timezone?: string): string {
  return getDateKeyInTimezone(new Date(), timezone);
}
