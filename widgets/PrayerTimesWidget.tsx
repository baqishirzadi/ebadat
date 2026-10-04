import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetSnapshot } from '@/utils/widgetSnapshot';
import { toArabicNumeralsString, toLatinNumeralsString } from '@/utils/numbers';

const TINT = '#1a4d3d';
const ACTIVE_BG = '#ffffff';
const INACTIVE_BG = '#ffffff1f';
const TEXT_PRIMARY = '#ffffff';
const TEXT_SECONDARY = '#ffffffd9';
const ACCENT = '#8cd9b8';
const BACKGROUND_GRADIENT = {
  from: '#0f1f14',
  to: TINT,
  orientation: 'TL_BR' as const,
} as const;

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

/** English Hijri, with the month style used by the iOS widget. */
function englishHijriDate(hijriDisplay: string): string {
  const parts = hijriDisplay.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return hijriDisplay.trim();
  const day = toLatinNumeralsString(parts[0]);
  const yearMaybe = parts[parts.length - 1];
  const hasYear = /^\d+$/.test(toLatinNumeralsString(yearMaybe));
  const monthTokens = hasYear ? parts.slice(1, -1) : parts.slice(1);
  const monthFull = monthTokens.join(' ');
  const monthShort = HIJRI_MONTH_SHORT_EN[monthFull] || monthFull;
  return [day, monthShort, hasYear ? toLatinNumeralsString(yearMaybe) : ''].filter(Boolean).join(' ');
}

/** English hero: weekday and Shamsi display, matching the iOS widget. */
function englishHeaderTitle(weekday: string, shamsiDisplay: string): string {
  const shortDay = WEEKDAY_SHORT_EN[weekday] || weekday.slice(0, 3);
  return [shortDay, toLatinNumeralsString(shamsiDisplay)].filter(Boolean).join(', ');
}

const GREG_MONTH_EN_TO_DARI: Record<string, string> = {
  JAN: 'جنوری',
  FEB: 'فبروری',
  MAR: 'مارچ',
  APR: 'اپریل',
  MAY: 'می',
  JUN: 'جون',
  JUL: 'جولای',
  AUG: 'اگست',
  SEP: 'سپتمبر',
  OCT: 'اکتوبر',
  NOV: 'نومبر',
  DEC: 'دسمبر',
};

const GREG_MONTH_EN_TO_PASHTO: Record<string, string> = {
  JAN: 'جنوري',
  FEB: 'فبروري',
  MAR: 'مارچ',
  APR: 'اپرېل',
  MAY: 'مۍ',
  JUN: 'جون',
  JUL: 'جولای',
  AUG: 'اګست',
  SEP: 'سپتمبر',
  OCT: 'اکتوبر',
  NOV: 'نومبر',
  DEC: 'دسمبر',
};

/** Gregorian day and month, omitting the year as on iOS. */
function gregorianCell(gregorianDisplay: string, isEnglish: boolean, isPashto: boolean): string {
  const parts = gregorianDisplay.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return isEnglish ? toLatinNumeralsString(gregorianDisplay.trim()) : toArabicNumeralsString(gregorianDisplay.trim());
  }
  const day = isEnglish ? toLatinNumeralsString(parts[0]) : toArabicNumeralsString(parts[0]);
  const monthKey = parts[1].toUpperCase();
  if (isEnglish) return `${day} ${monthKey}`;
  const month = (isPashto ? GREG_MONTH_EN_TO_PASHTO : GREG_MONTH_EN_TO_DARI)[monthKey] || parts[1];
  return `${day} ${month}`;
}

interface PrayerTimesWidgetProps {
  snapshot: WidgetSnapshot | null;
  /** Android supplies the actual widget bounds (dp) for every update/resize. */
  width?: number;
  height?: number;
}

type WidgetDateCell = {
  key: 'gregorian' | 'sunrise' | 'hijri';
  text: string;
  color: `#${string}`;
};

export function PrayerTimesWidget({ snapshot, width = 320, height = 110 }: PrayerTimesWidgetProps) {
  const language = snapshot?.appLanguage || 'dari';
  const isPashto = language === 'pashto';
  const isEnglish = language === 'english';
  // Dari follows the app's non-Nastaliq font preference. English and Pashto
  // keep their existing font behavior.
  const regularFontFamily = isEnglish
    ? 'Vazirmatn'
    : isPashto
      ? snapshot?.pashtoFont === 'amiri' ? 'Amiri' : 'NotoNaskhArabic-Regular'
      : snapshot?.dariFont === 'amiri' ? 'Amiri' : 'Vazirmatn';
  const boldFontFamily = isEnglish
    ? 'Vazirmatn-Bold'
    : regularFontFamily === 'Amiri'
      ? 'Amiri-Bold'
      : regularFontFamily === 'NotoNaskhArabic-Regular'
        ? 'NotoNaskhArabic-Bold'
        : 'Vazirmatn-Bold';

  // Use the same 0.88 medium-widget scale as iOS at the configured 4x2 size.
  // A narrow legacy placement can shrink down to 0.76 while keeping all rows.
  const scale = Math.min(0.88, Math.max(0.76, height / 125));
  const rootPaddingVertical = 5 * scale;
  const rootPaddingHorizontal = 6 * scale;
  const prayerLabelSize = 13 * scale;
  const prayerTimeSize = 15 * scale;
  const prayerChipPaddingVertical = 2 * scale;
  const prayerTimeMarginTop = 0;
  const headerTitleSize = 20 * scale;
  const dateLineSize = 15 * scale;
  const sunriseLineSize = 15 * scale;
  const dateRowMarginTop = 3 * scale;
  const prayerRowMarginTop = 4 * scale;

  if (!snapshot) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundGradient: BACKGROUND_GRADIENT,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 10,
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text={isEnglish ? 'Ebadat' : 'عبادت'}
          style={{ fontSize: 18 * scale, fontFamily: boldFontFamily, color: TEXT_PRIMARY }}
        />
        <TextWidget
          text={
            isEnglish
              ? 'Open the app'
              : isPashto
                ? 'اپ پرانیزئ'
                : 'اپ را باز کنید'
          }
          style={{ fontSize: 12 * scale, fontFamily: regularFontFamily, color: TEXT_SECONDARY, marginTop: 4 * scale }}
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
  // Keep the localized sunrise caption short, matching the iOS widget.
  const sunriseCaption = isEnglish
    ? 'Sunrise'
    : isPashto
      ? 'لمر'
      : 'طلوع';

  const solarDisplay = shamsiLabel || snapshot.shamsiDisplay || '';
  const headerTitleText = isEnglish
    ? englishHeaderTitle(weekdayLabel || '', solarDisplay)
    : [weekdayLabel, solarDisplay].filter(Boolean).join('، ');
  const gregorianText = gregorianCell(snapshot.gregorianDisplay || '', isEnglish, isPashto);
  const hijriText = isEnglish ? englishHijriDate(hijriLabel || '') : (hijriLabel || '');
  const sunriseCell = `${sunriseCaption}${sunriseTimeOnly ? ` ${sunriseTimeOnly}` : ''}`.trim();
  const dateCells: WidgetDateCell[] = isEnglish
    ? [
        { key: 'gregorian', text: gregorianText, color: TEXT_SECONDARY },
        { key: 'sunrise', text: sunriseCell, color: ACCENT },
        { key: 'hijri', text: hijriText, color: TEXT_PRIMARY },
      ]
    : [
        { key: 'hijri', text: hijriText, color: TEXT_PRIMARY },
        { key: 'sunrise', text: sunriseCell, color: ACCENT },
        { key: 'gregorian', text: gregorianText, color: TEXT_SECONDARY },
      ];

  // Prefer the snapshot field; if a stale push left it null (seen after
  // Pashto ↔ Dari flips before SharedPreferences.commit), derive the active
  // chip from atMs so the white highlight still shows.
  const nowMs = Date.now();
  const activePrayerKey =
    snapshot.currentPrayer ??
    [...prayers]
      .filter((entry) => entry.atMs <= nowMs)
      .map((entry) => entry.key)
      .pop() ??
    null;

  // Title + Gregorian / sunrise / Hijri row, in each language's reading order.
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
          marginTop: dateRowMarginTop,
        }}
      >
        {dateCells.map((cell) => (
          <FlexWidget key={cell.key} style={{ flex: 1, alignItems: 'center' }}>
            <TextWidget
              text={cell.text}
              maxLines={1}
              allowFontScaling={false}
              style={{
                fontSize: cell.key === 'sunrise' ? sunriseLineSize : dateLineSize,
                fontFamily: boldFontFamily,
                color: cell.color,
                adjustsFontSizeToFit: true,
              }}
            />
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        // Keep the launcher cell transparent around the medium-height card.
        backgroundColor: '#00000000',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      clickAction="OPEN_APP"
    >
      <FlexWidget
        style={{
          height: 'wrap_content',
          width: 'match_parent',
          backgroundGradient: BACKGROUND_GRADIENT,
          borderRadius: 16,
          flexDirection: 'column',
          justifyContent: 'flex-start',
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
            alignItems: 'center',
            marginTop: prayerRowMarginTop,
          }}
        >
          {prayersOrdered.map((prayer) => {
            const active = activePrayerKey === prayer.key;
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
                  marginHorizontal: 1,
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
