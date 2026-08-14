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
  /** Android supplies the actual widget bounds (dp) for every update/resize. */
  width?: number;
  height?: number;
}

export function PrayerTimesWidget({ snapshot, width = 320, height = 110 }: PrayerTimesWidgetProps) {
  // Xiaomi/MIUI and some launchers honor a shorter minimum height than the
  // Pixel launcher. Keep a deliberately compact composition for those bounds
  // instead of allowing the lower prayer row to be clipped.
  const compact = height < 145 || width < 300;
  const rootPaddingVertical = compact ? 5 : 7;
  const rootPaddingHorizontal = compact ? 6 : 8;
  const prayerLabelSize = compact ? 9 : 10;
  const prayerTimeSize = compact ? 13 : 14;

  if (!snapshot) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: TINT,
          justifyContent: 'center',
          alignItems: 'center',
          padding: compact ? 10 : 16,
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="عبادت"
          style={{ fontSize: compact ? 16 : 18, fontFamily: 'Vazirmatn-Bold', color: TEXT_PRIMARY }}
        />
        <TextWidget
          text="اپ را باز کنید"
          style={{ fontSize: compact ? 11 : 12, fontFamily: 'Vazirmatn', color: TEXT_SECONDARY, marginTop: 4 }}
        />
      </FlexWidget>
    );
  }

  const prayers = snapshot.prayers ?? [];
  const prayersRtl = [...prayers].reverse();

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        // Keep the launcher cell transparent below the content card. This
        // removes the large dark tail on launchers that give the widget two
        // rows of height without changing the widget's requested size.
        backgroundColor: '#00000000',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
      }}
      clickAction="OPEN_APP"
    >
      <FlexWidget
        style={{
          height: 'wrap_content',
          width: 'match_parent',
          backgroundColor: TINT,
          borderRadius: 20,
          flexDirection: 'column',
          alignItems: 'center',
          paddingVertical: rootPaddingVertical,
          paddingHorizontal: rootPaddingHorizontal,
        }}
      >
        {compact ? (
          <FlexWidget
            style={{
              width: 'match_parent',
              alignItems: 'center',
            }}
          >
            <TextWidget
              text={`${snapshot.weekdayDari} • ${snapshot.shamsiDisplay}`}
              maxLines={1}
              allowFontScaling={false}
              style={{ fontSize: 13, fontFamily: 'Vazirmatn-Bold', color: TEXT_SECONDARY, adjustsFontSizeToFit: true }}
            />
            <TextWidget
              text={`${snapshot.hijriDisplay} • ${snapshot.gregorianDisplay || ''}`}
              maxLines={1}
              allowFontScaling={false}
              style={{ fontSize: 13, fontFamily: 'Vazirmatn-Bold', color: TEXT_PRIMARY, marginTop: 1, adjustsFontSizeToFit: true }}
            />
            {snapshot.sunriseDisplay ? (
              <TextWidget
                text={snapshot.sunriseDisplay}
                maxLines={1}
                allowFontScaling={false}
                style={{ fontSize: 11, fontFamily: 'Vazirmatn-Bold', color: ACCENT, marginTop: 1, adjustsFontSizeToFit: true }}
              />
            ) : null}
            {snapshot.hadithText ? (
              <TextWidget
                text={`حدیث روز • ${snapshot.hadithText}`}
                maxLines={1}
                allowFontScaling={false}
                style={{
                  fontSize: 11,
                  fontFamily: 'Vazirmatn-Bold',
                  color: ACCENT,
                  marginTop: 2,
                  adjustsFontSizeToFit: true,
                }}
              />
            ) : null}
          </FlexWidget>
        ) : (
          <FlexWidget
            style={{
              width: 'match_parent',
              alignItems: 'center',
            }}
          >
            <TextWidget
              text={snapshot.weekdayDari}
              allowFontScaling={false}
              style={{ fontSize: 14, fontFamily: 'Vazirmatn-Bold', color: TEXT_SECONDARY }}
            />
            <TextWidget
              text={snapshot.hijriDisplay}
              allowFontScaling={false}
              style={{ fontSize: 20, fontFamily: 'Vazirmatn-Bold', color: ACCENT, marginTop: 1 }}
            />
            <TextWidget
              text={snapshot.shamsiDisplay}
              allowFontScaling={false}
              style={{ fontSize: 16, fontFamily: 'Vazirmatn-Bold', color: TEXT_PRIMARY, marginTop: 1 }}
            />
            <TextWidget
              text={snapshot.gregorianDisplay || ''}
              allowFontScaling={false}
              style={{ fontSize: 12, fontFamily: 'Vazirmatn', color: TEXT_SECONDARY, marginTop: 1 }}
            />
            {snapshot.sunriseDisplay ? (
              <TextWidget
                text={snapshot.sunriseDisplay}
                allowFontScaling={false}
                style={{ fontSize: 11, fontFamily: 'Vazirmatn-Bold', color: ACCENT, marginTop: 2 }}
              />
            ) : null}
            {snapshot.hadithText ? (
              <TextWidget
                text={`حدیث روز • ${snapshot.hadithText}`}
                maxLines={2}
                allowFontScaling={false}
                style={{
                  fontSize: 11,
                  fontFamily: 'Vazirmatn',
                  color: TEXT_SECONDARY,
                  marginTop: 2,
                  adjustsFontSizeToFit: true,
                }}
              />
            ) : null}
          </FlexWidget>
        )}
        <FlexWidget
          style={{
            flexDirection: 'row',
            width: 'match_parent',
            justifyContent: 'flex-start',
            marginTop: compact ? 4 : 5,
          }}
        >
        {prayersRtl.map((prayer) => {
          const active = snapshot.currentPrayer === prayer.key;
          return (
            <FlexWidget
              key={prayer.key}
              style={{
                flex: 1,
                marginHorizontal: compact ? 1 : 2,
                backgroundColor: active ? ACTIVE_BG : INACTIVE_BG,
                borderRadius: 8,
                paddingVertical: compact ? 2 : 3,
                alignItems: 'center',
              }}
            >
              <TextWidget
                text={prayer.labelDari}
                maxLines={1}
                allowFontScaling={false}
                style={{
                  fontSize: prayerLabelSize,
                  fontFamily: 'Vazirmatn-Bold',
                  color: active ? TINT : TEXT_PRIMARY,
                  adjustsFontSizeToFit: true,
                }}
              />
              <TextWidget
                text={prayer.time12h}
                maxLines={1}
                allowFontScaling={false}
                style={{
                  fontSize: prayerTimeSize,
                  fontFamily: 'Vazirmatn-Bold',
                  color: active ? TINT : TEXT_SECONDARY,
                  marginTop: 1,
                  adjustsFontSizeToFit: true,
                }}
              />
            </FlexWidget>
          );
        })}
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
