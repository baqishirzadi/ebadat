import React from 'react';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { PrayerTimesWidget } from '@/widgets/PrayerTimesWidget';
import { readWidgetSnapshot } from '@/utils/widgetDataBridge';
import { refreshWidgetSnapshot } from '@/utils/widgetSnapshot';

registerWidgetTaskHandler(async ({ widgetInfo, widgetAction, renderWidget }) => {
  if (widgetInfo.widgetName !== 'PrayerTimesWidget') return;

  if (widgetAction === 'WIDGET_DELETED') {
    return;
  }

  try {
    const stored = await readWidgetSnapshot();
    const snapshot = stored ? refreshWidgetSnapshot(stored) : null;
    renderWidget(<PrayerTimesWidget snapshot={snapshot} />);
  } catch (error) {
    console.warn('[widgetTaskHandler] Failed to render widget:', error);
    renderWidget(<PrayerTimesWidget snapshot={null} />);
  }
});
