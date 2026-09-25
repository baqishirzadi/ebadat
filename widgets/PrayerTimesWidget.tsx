import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetSnapshot } from '@/utils/widgetSnapshot';
import { toArabicNumeralsString } from '@/utils/numbers';

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
  const isPashto = snapshot?.appLanguage === 'pashto';
  const selectedFont = isPashto ? snapshot?.pashtoFont : snapshot?.dariFont;
  const regularFontFamily = selectedFont === 'nastaliq'
    ? 'NotoNastaliqUrdu'
    : selectedFont === 'amiri'
      ? 'Amiri'
      : 'Vazirmatn';
  const boldFontFamily = regularFontFamily === 'Vazirmatn'
    ? 'Vazirmatn-Bold'
    : regularFontFamily === 'Amiri'
      ? 'Amiri-Bold'
      : 'NotoNastaliqUrdu';
  const weekdayLabel = isPashto ? snapshot?.weekdayPashto : snapshot?.weekdayDari;
  const hijriLabel = isPashto ? snapshot?.hijriDisplayPashto : snapshot?.hijriDisplay;
  const shamsiLabel = isPashto ? snapshot?.shamsiDisplayPashto : snapshot?.shamsiDisplay;
  const sunriseLabel = isPashto ? snapshot?.sunriseDisplayPashto : snapshot?.sunriseDisplay;
  // Xiaomi/MIUI and some launchers honor a shorter minimum height than the
  // Pixel launcher. Keep a deliberately compact composition for those bounds
  // instead of allowing the lower prayer row to be clipped.
  const compact = height < 145 || width < 300;
  const rootPaddingVertical = compact ? 5 : 7;
  const rootPaddingHorizontal = compact ? 6 : 8;
  const prayerLabelSize = isPashto
    ? (compact ? 14 : 15)
    : (compact ? 9 : 10);
  const prayerTimeSize = isPashto
    ? (compact ? 20 : 22)
    : (compact ? 13 : 15);
  const prayerChipPaddingVertical = isPashto ? 4 : (compact ? 3 : 4);
  const prayerTimeMarginTop = isPashto ? -10 : 1;
  const compactDateSize = isPashto ? 12 : 13;
  const fullDateSize = isPashto ? 11 : 12;
  const solarDateSize = isPashto ? 16 : 18;
  const hijriDateSize = isPashto ? 12 : 13;
  const sunriseDateSize = isPashto ? 10 : 11;
  const pashtoHeaderSize = compact ? 17 : 18;
  const pashtoGregHijriSize = 15;
  const pashtoSunriseLineSize = 14;

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
          text="اپ پرانیزئ"
          style={{ fontSize: compact ? 11 : 12, fontFamily: 'Vazirmatn', color: TEXT_SECONDARY, marginTop: 4 }}
        />
      </FlexWidget>
    );
  }

  const prayers = snapshot.prayers ?? [];
  const prayersRtl = [...prayers].reverse();
  const sunriseParts = (sunriseLabel || '').trim().split(/\s+/).filter(Boolean);
  const sunriseTimeOnly = sunriseParts.slice(-1)[0] || '';
  const sunriseCaption =
    sunriseParts.length > 1 ? sunriseParts.slice(0, -1).join(' ') : (isPashto ? 'لمر ختل' : '');
  const solarDisplay = shamsiLabel || snapshot.shamsiDisplay || '';
  const pashtoHeaderText = [weekdayLabel, solarDisplay].filter(Boolean).join('، ');
  // Day/year in Eastern Arabic numerals; month abbreviation stays Latin.
  const pashtoGregorianDisplay = toArabicNumeralsString(snapshot.gregorianDisplay || '');

  // Title + one horizontal date row (gregorian / sunrise / hijri).
  // Keep each cell as FlexWidget > TextWidget — no LTR isolates and
  // no flex on TextWidget itself (those produced Null RemoteViews on One UI).
  const pashtoHeader = isPashto ? (
    <FlexWidget
      style={{
        width: 'match_parent',
        alignItems: 'center',
      }}
    >
      <TextWidget
        text={pashtoHeaderText}
        maxLines={1}
        allowFontScaling={false}
        style={{
          fontSize: pashtoHeaderSize,
          fontFamily: boldFontFamily,
          color: ACCENT,
          adjustsFontSizeToFit: true,
        }}
      />
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 3,
        }}
      >
        <FlexWidget style={{ flex: 1.15, alignItems: 'center' }}>
          <TextWidget
            text={`${pashtoGregorianDisplay} میلادي`.trim()}
            maxLines={1}
            allowFontScaling={false}
            style={{
              fontSize: pashtoGregHijriSize,
              fontFamily: boldFontFamily,
              color: TEXT_SECONDARY,
              adjustsFontSizeToFit: true,
            }}
          />
        </FlexWidget>
        <FlexWidget style={{ flex: 0.85, alignItems: 'center' }}>
          <TextWidget
            text={`${sunriseCaption || 'لمر ختل'}${sunriseTimeOnly ? ` ${sunriseTimeOnly}` : ''}`.trim()}
            maxLines={1}
            allowFontScaling={false}
            style={{
              fontSize: pashtoSunriseLineSize,
              fontFamily: boldFontFamily,
              color: ACCENT,
              adjustsFontSizeToFit: true,
            }}
          />
        </FlexWidget>
        <FlexWidget style={{ flex: 1.4, alignItems: 'center' }}>
          <TextWidget
            text={`قمري ${hijriLabel || ''}`.trim()}
            maxLines={1}
            allowFontScaling={false}
            style={{
              fontSize: pashtoGregHijriSize,
              fontFamily: boldFontFamily,
              color: TEXT_PRIMARY,
              adjustsFontSizeToFit: true,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  ) : null;

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
        {isPashto ? (
          pashtoHeader
        ) : compact ? (
          <FlexWidget
            style={{
              width: 'match_parent',
              alignItems: 'center',
            }}
          >
            <TextWidget
              text={`${weekdayLabel || ''} • ${shamsiLabel || snapshot.shamsiDisplay}`}
              maxLines={1}
              allowFontScaling={false}
              style={{ fontSize: compactDateSize, fontFamily: boldFontFamily, color: TEXT_SECONDARY, adjustsFontSizeToFit: true }}
            />
            <TextWidget
              text={`${hijriLabel || ''} • ${snapshot.gregorianDisplay || ''}`}
              maxLines={1}
              allowFontScaling={false}
              style={{ fontSize: compactDateSize, fontFamily: boldFontFamily, color: TEXT_PRIMARY, marginTop: 1, adjustsFontSizeToFit: true }}
            />
            {sunriseLabel ? (
              <TextWidget
                text={sunriseLabel}
                maxLines={1}
                allowFontScaling={false}
                style={{ fontSize: sunriseDateSize, fontFamily: boldFontFamily, color: ACCENT, marginTop: 1, adjustsFontSizeToFit: true }}
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
              text={`${weekdayLabel || ''}${snapshot.gregorianDisplay ? ` • ${snapshot.gregorianDisplay}` : ''}`}
              allowFontScaling={false}
              maxLines={1}
              style={{ fontSize: fullDateSize, fontFamily: boldFontFamily, color: TEXT_SECONDARY, adjustsFontSizeToFit: true }}
            />
            <TextWidget
              text={shamsiLabel || snapshot.shamsiDisplay}
              allowFontScaling={false}
              maxLines={1}
              style={{ fontSize: solarDateSize, fontFamily: boldFontFamily, color: ACCENT, marginTop: 1, adjustsFontSizeToFit: true }}
            />
            <TextWidget
              text={hijriLabel || ''}
              allowFontScaling={false}
              maxLines={1}
              style={{ fontSize: hijriDateSize, fontFamily: regularFontFamily, color: TEXT_PRIMARY, marginTop: 1, adjustsFontSizeToFit: true }}
            />
            {sunriseLabel ? (
              <TextWidget
                text={sunriseLabel}
                allowFontScaling={false}
                maxLines={1}
                style={{ fontSize: sunriseDateSize, fontFamily: regularFontFamily, color: TEXT_SECONDARY, marginTop: 1, adjustsFontSizeToFit: true }}
              />
            ) : null}
          </FlexWidget>
        )}
        <FlexWidget
          style={{
            flexDirection: 'row',
            width: 'match_parent',
            justifyContent: 'flex-start',
            marginTop: compact ? 5 : 7,
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
                paddingVertical: prayerChipPaddingVertical,
                alignItems: 'center',
              }}
            >
              <TextWidget
                text={isPashto ? prayer.labelPashto || prayer.labelDari : prayer.labelDari}
                maxLines={1}
                allowFontScaling={false}
                style={{
                  fontSize: prayerLabelSize,
                  fontFamily: boldFontFamily,
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
                  fontFamily: boldFontFamily,
                  color: active ? TINT : TEXT_SECONDARY,
                  marginTop: prayerTimeMarginTop,
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
