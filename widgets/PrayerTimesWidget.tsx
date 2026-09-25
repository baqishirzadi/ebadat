import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetSnapshot } from '@/utils/widgetSnapshot';
import { toArabicNumeralsString, toLatinNumeralsString } from '@/utils/numbers';

const TINT = '#1a4d3e';
const ACTIVE_BG = '#ffffff';
const INACTIVE_BG = '#ffffff1f';
const TEXT_PRIMARY = '#ffffff';
const TEXT_SECONDARY = '#ffffffd9';
const ACCENT = '#8bd9b8';

const WEEKDAY_SHORT_EN: Record<string, string> = {
  Sunday: 'Sun',
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
};

const HIJRI_MONTH_SHORT_EN: Record<string, string> = {
  'Rabi al-Awwal': 'Rabi I',
  'Rabi al-Thani': 'Rabi II',
  'Jumada al-Awwal': 'Jumada I',
  'Jumada al-Thani': 'Jumada II',
};

/** English Hijri: "4 Jumada I" (day + short month, no year/prefix). */
function englishHijriCell(hijriDisplay: string): string {
  const parts = hijriDisplay.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return hijriDisplay.trim();
  const day = parts[0];
  const yearMaybe = parts[parts.length - 1];
  const monthTokens = /^\d+$/.test(yearMaybe) ? parts.slice(1, -1) : parts.slice(1);
  const monthFull = monthTokens.join(' ');
  const monthShort = HIJRI_MONTH_SHORT_EN[monthFull] || monthFull;
  return `${day} ${monthShort}`.trim();
}

/** English hero: "Fri · 12 Rabi II" — Qamari first (day + short month, no year). */
function englishHeaderTitle(weekday: string, hijriDisplay: string): string {
  const shortDay = WEEKDAY_SHORT_EN[weekday] || weekday.slice(0, 3);
  return [shortDay, englishHijriCell(hijriDisplay)].filter(Boolean).join(' · ');
}

/** English solar cell: "3 Mizan" (drop year). */
function englishSolarShort(shamsi: string): string {
  const parts = shamsi.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : shamsi.trim();
}

interface PrayerTimesWidgetProps {
  snapshot: WidgetSnapshot | null;
  /** Android supplies the actual widget bounds (dp) for every update/resize. */
  width?: number;
  height?: number;
}

export function PrayerTimesWidget({ snapshot, width = 320, height = 110 }: PrayerTimesWidgetProps) {
  const language = snapshot?.appLanguage || 'dari';
  const isPashto = language === 'pashto';
  const isEnglish = language === 'english';
  const selectedFont = isPashto ? snapshot?.pashtoFont : snapshot?.dariFont;
  // English uses Vazirmatn (Latin + Arabic already registered for the app).
  const regularFontFamily = isEnglish
    ? 'Vazirmatn'
    : selectedFont === 'nastaliq'
      ? 'NotoNastaliqUrdu'
      : selectedFont === 'amiri'
        ? 'Amiri'
        : 'Vazirmatn';
  const boldFontFamily = isEnglish
    ? 'Vazirmatn-Bold'
    : regularFontFamily === 'Vazirmatn'
      ? 'Vazirmatn-Bold'
      : regularFontFamily === 'Amiri'
        ? 'Amiri-Bold'
        : 'NotoNastaliqUrdu';

  // Xiaomi/MIUI and some launchers honor a shorter minimum height than the
  // Pixel launcher. Keep a deliberately compact composition for those bounds
  // instead of allowing the lower prayer row to be clipped.
  const compact = height < 145 || width < 300;
  const rootPaddingVertical = isEnglish ? (compact ? 7 : 9) : compact ? 5 : 7;
  const rootPaddingHorizontal = compact ? 6 : 8;
  // Nastaliq needs tight negative margin; Latin chips need breathing room.
  const prayerLabelSize = isEnglish ? 11 : compact ? 14 : 15;
  const prayerTimeSize = isEnglish ? 18 : compact ? 20 : 22;
  const prayerChipPaddingVertical = isEnglish ? 5 : 4;
  const prayerTimeMarginTop = isEnglish ? 1 : -10;
  const headerTitleSize = isEnglish ? 20 : compact ? 17 : 18;
  const gregHijriSize = isEnglish ? 16 : 15;
  const sunriseLineSize = isEnglish ? 16 : 14;

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
          text={isEnglish ? 'Ebadat' : 'عبادت'}
          style={{ fontSize: compact ? 16 : 18, fontFamily: boldFontFamily, color: TEXT_PRIMARY }}
        />
        <TextWidget
          text={isEnglish ? 'Open the app' : 'اپ پرانیزئ'}
          style={{ fontSize: compact ? 11 : 12, fontFamily: regularFontFamily, color: TEXT_SECONDARY, marginTop: 4 }}
        />
      </FlexWidget>
    );
  }

  const weekdayLabel = isEnglish
    ? snapshot.weekdayEnglish || snapshot.weekdayDari
    : isPashto
      ? snapshot.weekdayPashto
      : snapshot.weekdayDari;
  const hijriLabel = isEnglish
    ? snapshot.hijriDisplayEnglish || snapshot.hijriDisplay
    : isPashto
      ? snapshot.hijriDisplayPashto
      : snapshot.hijriDisplay;
  const shamsiLabel = isEnglish
    ? snapshot.shamsiDisplayEnglish || snapshot.shamsiDisplay
    : isPashto
      ? snapshot.shamsiDisplayPashto
      : snapshot.shamsiDisplay;
  const sunriseLabel = isEnglish
    ? snapshot.sunriseDisplayEnglish || snapshot.sunriseDisplay
    : isPashto
      ? snapshot.sunriseDisplayPashto
      : snapshot.sunriseDisplay;

  const localizeDigits = (value: string) =>
    isEnglish ? toLatinNumeralsString(value) : toArabicNumeralsString(toLatinNumeralsString(value));

  const prayers = snapshot.prayers ?? [];
  // English is LTR: Fajr on the left. Dari/Pashto stay RTL on the chips.
  const prayersOrdered = isEnglish ? prayers : [...prayers].reverse();
  const sunriseParts = (sunriseLabel || '').trim().split(/\s+/).filter(Boolean);
  const sunriseTimeOnly = sunriseParts.length ? localizeDigits(sunriseParts.slice(-1)[0] || '') : '';
  const sunriseCaption = isEnglish
    ? 'Sun'
    : sunriseParts.length > 1
      ? sunriseParts.slice(0, -1).join(' ')
      : isPashto
        ? 'لمر ختل'
        : 'طلوع';

  const solarDisplay = shamsiLabel || snapshot.shamsiDisplay || '';
  const headerTitleText = isEnglish
    ? englishHeaderTitle(weekdayLabel || '', hijriLabel || '')
    : [weekdayLabel, solarDisplay].filter(Boolean).join('، ');
  const gregorianDisplay = isEnglish
    ? toLatinNumeralsString(snapshot.gregorianDisplay || '')
    : toArabicNumeralsString(snapshot.gregorianDisplay || '');
  // English row: solar · sunrise · Gregorian (Qamari is the accent title).
  // Dari/Pashto keep Gregorian · sunrise · Hijri with calendar labels.
  const leftDateCell = isEnglish
    ? englishSolarShort(solarDisplay)
    : isPashto
      ? `${gregorianDisplay} میلادي`.trim()
      : `${gregorianDisplay} میلادی`.trim();
  const rightDateCell = isEnglish
    ? gregorianDisplay.trim()
    : isPashto
      ? `قمري ${hijriLabel || ''}`.trim()
      : `قمری ${hijriLabel || ''}`.trim();
  const sunriseCell = `${sunriseCaption}${sunriseTimeOnly ? ` ${sunriseTimeOnly}` : ''}`.trim();

  // Title + one horizontal date row.
  // Keep each cell as FlexWidget > TextWidget — no LTR isolates and
  // no flex on TextWidget itself (those produced Null RemoteViews on One UI).
  const sharedHeader = (
    <FlexWidget
      style={{
        width: 'match_parent',
        alignItems: 'center',
      }}
    >
      <TextWidget
        text={headerTitleText}
        maxLines={1}
        allowFontScaling={false}
        style={{
          fontSize: headerTitleSize,
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
            text={leftDateCell}
            maxLines={1}
            allowFontScaling={false}
            style={{
              fontSize: gregHijriSize,
              fontFamily: boldFontFamily,
              color: TEXT_SECONDARY,
              adjustsFontSizeToFit: true,
            }}
          />
        </FlexWidget>
        <FlexWidget style={{ flex: 0.85, alignItems: 'center' }}>
          <TextWidget
            text={sunriseCell}
            maxLines={1}
            allowFontScaling={false}
            style={{
              fontSize: sunriseLineSize,
              fontFamily: boldFontFamily,
              color: ACCENT,
              adjustsFontSizeToFit: true,
            }}
          />
        </FlexWidget>
        <FlexWidget style={{ flex: 1.4, alignItems: 'center' }}>
          <TextWidget
            text={rightDateCell}
            maxLines={1}
            allowFontScaling={false}
            style={{
              fontSize: gregHijriSize,
              fontFamily: boldFontFamily,
              color: TEXT_PRIMARY,
              adjustsFontSizeToFit: true,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );

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
        {sharedHeader}
        <FlexWidget
          style={{
            flexDirection: 'row',
            width: 'match_parent',
            justifyContent: 'flex-start',
            marginTop: compact ? 5 : 7,
          }}
        >
          {prayersOrdered.map((prayer) => {
            const active = snapshot.currentPrayer === prayer.key;
            const prayerName = isEnglish
              ? prayer.labelEnglish || prayer.labelDari
              : isPashto
                ? prayer.labelPashto || prayer.labelDari
                : prayer.labelDari;
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
                  text={prayerName}
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
                  text={localizeDigits(prayer.time12h)}
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
