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

/** Dari Gregorian: "۲۵ سپتمبر ۲۰۲۶" from snapshot "25 SEP 2026". */
function dariGregorianShort(gregorianDisplay: string): string {
  const parts = gregorianDisplay.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const day = toArabicNumeralsString(parts[0]);
    const monthKey = parts[1].toUpperCase();
    const month = GREG_MONTH_EN_TO_DARI[monthKey] || parts[1];
    const year = parts.length >= 3 ? toArabicNumeralsString(parts[2]) : '';
    return `${day} ${month}${year ? ` ${year}` : ''}`.trim();
  }
  return toArabicNumeralsString(gregorianDisplay.trim());
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
  // English uses Vazirmatn. Dari widget is always Nastaliq.
  const regularFontFamily = isEnglish
    ? 'Vazirmatn'
    : language === 'dari' || selectedFont === 'nastaliq'
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

  // One frame for Dari, Pashto, and English. Type matches the polished
  // Pashto card, a step larger so the copy reads heavier on a 1-row cell.
  const oneRow = height < 140;
  const short = height < 125;
  const rootPaddingVertical = oneRow ? 4 : 5;
  const rootPaddingHorizontal = 6;
  const isDari = !isEnglish && !isPashto;
  const nastaliq = !isEnglish && regularFontFamily === 'NotoNastaliqUrdu';
  const prayerLabelSize = short ? 15 : 16;
  const prayerTimeSize = short ? 20 : 22;
  const prayerChipPaddingVertical = 3;
  const prayerTimeMarginTop = nastaliq ? -8 : 1;
  const headerTitleSize = short ? 18 : 20;
  const gregHijriSize = short ? 15 : 16;
  const sunriseLineSize = short ? 14 : 15;
  const dateRowMarginTop = oneRow ? 2 : 3;
  const prayerRowMarginTop = oneRow ? 3 : 4;

  if (!snapshot) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: TINT,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 10,
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text={isEnglish ? 'Ebadat' : 'عبادت'}
          style={{ fontSize: short ? 15 : 18, fontFamily: boldFontFamily, color: TEXT_PRIMARY }}
        />
        <TextWidget
          text={isEnglish ? 'Open the app' : 'اپ پرانیزئ'}
          style={{ fontSize: short ? 11 : 12, fontFamily: regularFontFamily, color: TEXT_SECONDARY, marginTop: 4 }}
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
  // Dari always uses the short طلوع caption so the middle cell stays one size.
  const sunriseCaption = isEnglish
    ? 'Sun'
    : isDari
      ? 'طلوع'
      : sunriseParts.length > 1
        ? sunriseParts.slice(0, -1).join(' ')
        : 'لمر ختل';

  const solarDisplay = shamsiLabel || snapshot.shamsiDisplay || '';
  const headerTitleText = isEnglish
    ? englishHeaderTitle(weekdayLabel || '', hijriLabel || '')
    : [weekdayLabel, solarDisplay].filter(Boolean).join('، ');
  const gregorianDisplay = isEnglish
    ? toLatinNumeralsString(snapshot.gregorianDisplay || '')
    : toArabicNumeralsString(snapshot.gregorianDisplay || '');
  // English row: solar · sunrise · Gregorian (Qamari is the accent title).
  // Pashto keeps Gregorian · sunrise · Hijri with calendar labels.
  // Dari shortens those cells so they stay one type size.
  const leftDateCell = isEnglish
    ? englishSolarShort(solarDisplay)
    : isDari
      ? dariGregorianShort(snapshot.gregorianDisplay || '')
      : `${gregorianDisplay} میلادي`.trim();
  const rightDateCell = isEnglish
    ? gregorianDisplay.trim()
    : isDari
      ? (hijriLabel || '').trim()
      : `قمري ${hijriLabel || ''}`.trim();
  const sunriseCell = `${sunriseCaption}${sunriseTimeOnly ? ` ${sunriseTimeOnly}` : ''}`.trim();

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
          marginTop: dateRowMarginTop,
        }}
      >
        <FlexWidget style={{ flex: 1, alignItems: 'center' }}>
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
        <FlexWidget style={{ flex: 1, alignItems: 'center' }}>
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
        <FlexWidget style={{ flex: 1, alignItems: 'center' }}>
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
          // Fill the 1-row launcher cell. Legacy 2-row placements stay
          // wrap_content so a short card is not stretched into empty green.
          height: oneRow ? 'match_parent' : 'wrap_content',
          width: 'match_parent',
          backgroundColor: TINT,
          borderRadius: 16,
          flexDirection: 'column',
          justifyContent: oneRow ? 'space-between' : 'flex-start',
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
