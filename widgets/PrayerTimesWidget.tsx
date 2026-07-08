import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetSnapshot } from '@/utils/widgetSnapshot';

const TINT = '#1a4d3e';
const ACTIVE_BG = '#ffffff';
const INACTIVE_BG = '#ffffff1f';
const TEXT_PRIMARY = '#ffffff';
const TEXT_SECONDARY = '#ffffffd9';
const ACCENT = '#8bd9b8';

interface PrayerTimesWidgetProps {
  snapshot: WidgetSnapshot | null;
}

export function PrayerTimesWidget({ snapshot }: PrayerTimesWidgetProps) {
  if (!snapshot) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: TINT,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="عبادت"
          style={{ fontSize: 18, fontFamily: 'Vazirmatn-Bold', color: TEXT_PRIMARY }}
        />
        <TextWidget
          text="اپ را باز کنید"
          style={{ fontSize: 12, fontFamily: 'Vazirmatn', color: TEXT_SECONDARY, marginTop: 6 }}
        />
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: TINT,
        flexDirection: 'column',
        padding: 12,
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_APP"
    >
      <FlexWidget
        style={{
          flexDirection: 'column',
          alignItems: 'center',
          width: 'match_parent',
        }}
      >
        <TextWidget
          text={snapshot.weekdayDari}
          style={{ fontSize: 14, fontFamily: 'Vazirmatn-Bold', color: TEXT_SECONDARY }}
        />
        <TextWidget
          text={snapshot.shamsiDisplay}
          style={{ fontSize: 20, fontFamily: 'Vazirmatn-Bold', color: ACCENT, marginTop: 2 }}
        />
        <TextWidget
          text={`قمری: ${snapshot.hijriDisplay}`}
          style={{ fontSize: 12, fontFamily: 'Vazirmatn', color: TEXT_SECONDARY, marginTop: 2 }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          flexDirection: 'row',
          width: 'match_parent',
          justifyContent: 'space-between',
        }}
      >
        {snapshot.prayers.map((prayer) => {
          const active = snapshot.currentPrayer === prayer.key;
          return (
            <FlexWidget
              key={prayer.key}
              style={{
                flex: 1,
                marginHorizontal: 2,
                backgroundColor: active ? ACTIVE_BG : INACTIVE_BG,
                borderRadius: 10,
                paddingVertical: 6,
                alignItems: 'center',
              }}
            >
              <TextWidget
                text={prayer.labelDari}
                style={{
                  fontSize: 10,
                  fontFamily: 'Vazirmatn-Bold',
                  color: active ? TINT : TEXT_PRIMARY,
                }}
              />
              <TextWidget
                text={prayer.time12h}
                style={{
                  fontSize: 11,
                  fontFamily: 'Vazirmatn-Bold',
                  color: active ? TINT : TEXT_SECONDARY,
                  marginTop: 2,
                }}
              />
            </FlexWidget>
          );
        })}
      </FlexWidget>
    </FlexWidget>
  );
}
