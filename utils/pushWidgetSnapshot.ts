import { Platform } from 'react-native';

import type { PrayerTimes } from '@/utils/prayerTimes';
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

    await requestWidgetUpdate({
      widgetName: 'PrayerTimesWidget',
      renderWidget: () =>
        React.createElement(PrayerTimesWidget, { snapshot }),
    });
  } catch (error) {
    console.warn('[pushWidgetSnapshot] Android widget refresh failed:', error);
  }
}

export async function pushWidgetSnapshot(
  prayerTimes: PrayerTimes | null,
  cityName: string,
  options?: { force?: boolean },
): Promise<void> {
  if (!prayerTimes) return;

  const now = Date.now();
  if (!options?.force && now - lastPushedAt < MIN_PUSH_INTERVAL_MS) {
    return;
  }

  lastPushedAt = now;
  const snapshot = buildWidgetSnapshot(prayerTimes, cityName);
  await writeWidgetSnapshot(snapshot);
  await refreshAndroidWidget(snapshot);
}
