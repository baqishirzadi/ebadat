import React from 'react';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { PrayerTimesWidget } from '@/widgets/PrayerTimesWidget';
import { readWidgetSnapshot } from '@/utils/widgetDataBridge';

registerWidgetTaskHandler(async ({ widgetInfo, widgetAction, renderWidget }) => {
  if (widgetInfo.widgetName !== 'PrayerTimesWidget') return;

  if (widgetAction === 'WIDGET_DELETED') {
    return;
  }

  const snapshot = await readWidgetSnapshot();
  renderWidget(<PrayerTimesWidget snapshot={snapshot} />);
});
