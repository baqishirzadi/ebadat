import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetSnapshot } from '@/utils/widgetSnapshot';
import { toArabicNumeralsString, toLatinNumeralsString } from '@/utils/numbers';

const ACTIVE_BG = '#ffffff';
const INACTIVE_BG = '#ffffff1f';
const TEXT_PRIMARY = '#ffffff';
const TEXT_SECONDARY = '#ffffffd9';

type WidgetPalette = {
  gradientFrom: `#${string}`;
  gradientTo: `#${string}`;
  accent: `#${string}`;
  chipText: `#${string}`;
};

function widgetPalette(themeMode: string | undefined): WidgetPalette {
  switch (themeMode) {
    case 'night':
      return {
        gradientFrom: '#000000',
        gradientTo: '#141414',
        accent: '#f2f2f2',
        chipText: '#111111',
      };
    case 'sapphire':
      return {
        gradientFrom: '#152a45',
        gradientTo: '#1e3a5f',
        accent: '#d6e4f5',
        chipText: '#1e3a5f',
      };
    case 'burgundy':
      return {
        gradientFrom: '#4a1e28',
        gradientTo: '#6b2d3c',
        accent: '#f6d5dc',
        chipText: '#6b2d3c',
      };
    default:
      return {
        gradientFrom: '#0f1f14',
        gradientTo: '#1a4d3d',
        accent: '#8cd9b8',
        chipText: '#1a4d3d',
      };
  }
}

const WEEKDAY_SHORT_EN: Record<string, string> = {
  Sunday: 'Sun',
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
};

/** Distinct Turkish shorts. Cuma and Cumartesi must not both collapse to "Cum". */
const WEEKDAY_SHORT_TR: Record<string, string> = {
  Sunday: 'Paz',
  Monday: 'Pzt',
  Tuesday: 'Sal',
  Wednesday: 'Çar',
  Thursday: 'Per',
  Friday: 'Cum',
  Saturday: 'Cmt',
};

const GREGORIAN_MONTH_TR: Record<string, string> = {
  JAN: 'Ocak',
  FEB: 'Şubat',
  MAR: 'Mart',
  APR: 'Nisan',
  MAY: 'Mayıs',
  JUN: 'Haziran',
  JUL: 'Temmuz',
  AUG: 'Ağustos',
  SEP: 'Eylül',
  OCT: 'Ekim',
  NOV: 'Kasım',
  DEC: 'Aralık',
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

/** Latin hero: short weekday plus the primary calendar date. */
function latinHeaderTitle(weekday: string, dateDisplay: string, language: string): string {
  const shortDay = language === 'turkish'
    ? WEEKDAY_SHORT_TR[weekday] || weekday
    : WEEKDAY_SHORT_EN[weekday] || weekday.slice(0, 3);
  return [shortDay, toLatinNumeralsString(dateDisplay)].filter(Boolean).join(', ');
}

/** Gregorian day and month, omitting the year. Turkish uses the full month name. */
function widgetPrayerClock(
  prayer: { time12h: string; atMs?: number },
  language: string,
): string {
  if ((language === 'turkish' || language === 'english') && prayer.atMs) {
    const date = new Date(prayer.atMs);
    const minutes = String(date.getMinutes()).padStart(2, '0');
    if (language === 'turkish') {
      return `${String(date.getHours()).padStart(2, '0')}:${minutes}`;
    }
    const suffix = date.getHours() >= 12 ? 'PM' : 'AM';
    const hours12 = date.getHours() % 12 || 12;
    return `${hours12}:${minutes} ${suffix}`;
  }
  return language === 'english' || language === 'turkish'
    ? toLatinNumeralsString(prayer.time12h)
    : toArabicNumeralsString(prayer.time12h);
}

function gregorianCell(gregorianDisplay: string, language: string): string {
  const parts = gregorianDisplay.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return toLatinNumeralsString(gregorianDisplay.trim());
  const day = toLatinNumeralsString(parts[0]);
  const monthKey = toLatinNumeralsString(parts[1]).toUpperCase();
  const month = language === 'turkish' ? GREGORIAN_MONTH_TR[monthKey] || monthKey : monthKey;
  return `${day} ${month}`;
}

interface PrayerTimesWidgetProps {
  snapshot: WidgetSnapshot | null;
  /** Android supplies the actual widget bounds (dp) for every update/resize. */
  width?: number;
  height?: number;
}

type WidgetDateCell = {
  key: 'gregorian' | 'sunrise' | 'hijri' | 'shamsi';
  text: string;
  color: `#${string}`;
};

export function PrayerTimesWidget({ snapshot, width = 320, height = 110 }: PrayerTimesWidgetProps) {
  const language = snapshot?.appLanguage || 'dari';
  const isPashto = language === 'pashto';
  const isTurkish = language === 'turkish';
  const isArabic = language === 'arabic';
  const isLatin = language === 'english' || isTurkish;
  // Dari follows the app's non-Nastaliq font preference. Arabic always uses
  // Noto Naskh. English and Pashto keep their existing font behavior.
  const regularFontFamily = isLatin
    ? 'Vazirmatn'
    : isArabic
      ? 'NotoNaskhArabic-Regular'
      : isPashto
        ? snapshot?.pashtoFont === 'amiri' ? 'Amiri' : 'NotoNaskhArabic-Regular'
        : snapshot?.dariFont === 'amiri' ? 'Amiri' : 'Vazirmatn';
  const boldFontFamily = isLatin
    ? 'Vazirmatn-Bold'
    : regularFontFamily === 'Amiri'
      ? 'Amiri-Bold'
      : regularFontFamily === 'NotoNaskhArabic-Regular'
        ? 'NotoNaskhArabic-Bold'
        : 'Vazirmatn-Bold';

  // Naskh and Amiri line boxes are taller than Dari's Vazirmatn. At Dari's
  // font size the prayer-time line is pushed out of this one-cell widget.
  // These scales keep the name and the time inside the same chip.
  const glyphScale = isArabic
    ? 0.84
    : !isPashto
      ? 1
      : snapshot?.pashtoFont === 'amiri'
        ? 0.62
        : 0.8;
  const lineBox = 1.4;
  // One home-screen row. These units match the padding and line boxes below,
  // so the three rows fit the real cell instead of a fixed two-row card.
  const contentUnits =
    10 +
    3 +
    4 +
    4 +
    (20 + 15 + 13 + 15) * glyphScale * lineBox;
  const scale = Math.min(0.88, Math.max(0.52, height / contentUnits));
  const typeScale = scale * glyphScale;
  // Bold Naskh strokes read thin at widget size. A tight shadow in the text
  // color thickens Arabic without changing the line box.
  const pashtoWeight = (color: `#${string}`) =>
    isArabic
      ? {
          fontWeight: '700' as const,
          textShadowColor: color,
          textShadowRadius: 1.2,
          textShadowOffset: { width: 0, height: 0 },
        }
      : null;
  const rootPaddingVertical = 5 * scale;
  const rootPaddingHorizontal = 6 * scale;
  const prayerLabelSize = 13 * typeScale;
  const prayerTimeSize = 15 * typeScale;
  const prayerChipPaddingVertical = 2 * scale;
  const prayerTimeMarginTop = 0;
  const headerTitleSize = 20 * typeScale;
  const dateLineSize = 15 * typeScale;
  const sunriseLineSize = 15 * typeScale;
  const dateRowMarginTop = 3 * scale;
  const prayerRowMarginTop = 4 * scale;
  const palette = widgetPalette(snapshot?.themeMode);
  const backgroundGradient = {
    from: palette.gradientFrom,
    to: palette.gradientTo,
    orientation: 'TL_BR' as const,
  };

  if (!snapshot) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundGradient,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 10,
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text={isLatin ? 'Ibadet' : 'عبادت'}
          style={{ fontSize: 18 * typeScale, fontFamily: boldFontFamily, color: TEXT_PRIMARY, ...pashtoWeight(TEXT_PRIMARY) }}
        />
        <TextWidget
          text={
            isTurkish
              ? 'Uygulamayı açın'
              : language === 'english'
                ? 'Open the app'
                : isArabic
                  ? 'افتحوا التطبيق'
                  : isPashto
                    ? 'اپ پرانیزئ'
                    : 'اپ را باز کنید'
          }
          style={{ fontSize: 12 * typeScale, fontFamily: regularFontFamily, color: TEXT_SECONDARY, marginTop: 4 * scale }}
        />
      </FlexWidget>
    );
  }

  const weekdayLabel = isLatin
    ? snapshot.weekdayEnglish || snapshot.weekdayDari
    : isArabic
        ? ({ 'یکشنبه': 'الأحد', 'دوشنبه': 'الإثنين', 'سه‌شنبه': 'الثلاثاء', 'چهارشنبه': 'الأربعاء', 'پنجشنبه': 'الخميس', 'جمعه': 'الجمعة', 'شنبه': 'السبت' } as Record<string, string>)[snapshot.weekdayDari] || snapshot.weekdayDari
        : isPashto
          ? snapshot.weekdayPashto
          : snapshot.weekdayDari;
  const hijriLabel = isTurkish
    ? (snapshot.hijriDisplayTurkish
        || (snapshot.hijriDisplayEnglish || snapshot.hijriDisplay || '')
        .replace('Muharram', 'Muharrem').replace('Safar', 'Safer')
        .replace('Rabi al-Awwal', 'Rebiülevvel').replace('Rabi al-Thani', 'Rebiülahir')
        .replace('Jumada al-Awwal', 'Cemaziyelevvel').replace('Jumada al-Thani', 'Cemaziyelahir')
        .replace('Rajab', 'Recep').replace('Shaban', 'Şaban').replace('Ramadan', 'Ramazan')
        .replace('Shawwal', 'Şevval').replace('Dhul Qadah', 'Zilkade').replace('Dhul Hijjah', 'Zilhicce'))
    : isLatin
      ? snapshot.hijriDisplayEnglish || snapshot.hijriDisplay
      : isArabic
        ? (snapshot.hijriDisplay || '')
            .replace('ربیع‌الاول', 'ربيع الأول').replace('ربیع‌الثانی', 'ربيع الثاني')
            .replace('جمادی‌الاول', 'جمادى الأولى').replace('جمادی‌الثانی', 'جمادى الثانية')
            .replace('ذوالقعده', 'ذو القعدة').replace('ذوالحجه', 'ذو الحجة')
            .replace('محرم', 'المحرم')
        : isPashto
          ? snapshot.hijriDisplayPashto
          : snapshot.hijriDisplay;
  const shamsiLabel = isTurkish
    ? (snapshot.shamsiDisplayEnglish || '')
        .replace('Hamal', 'Hamel').replace('Sawr', 'Sevr').replace('Jawza', 'Cevza')
        .replace('Saratan', 'Seretan').replace('Asad', 'Esed').replace('Sonbola', 'Sünbüle')
        .replace('Aqrab', 'Akrep').replace('Qaws', 'Kavs').replace('Jadi', 'Cedi').replace('Dalw', 'Delv')
    : isLatin
      ? snapshot.shamsiDisplayEnglish || snapshot.shamsiDisplay
      : isArabic
        ? (snapshot.shamsiDisplay || '')
            .replace('حمل', 'الحمل').replace('ثور', 'الثور').replace('جوزا', 'الجوزاء')
            .replace('سرطان', 'السرطان').replace('اسد', 'الأسد').replace('سنبله', 'السنبلة')
            .replace('میزان', 'الميزان').replace('عقرب', 'العقرب').replace('قوس', 'القوس')
            .replace('جدی', 'الجدي').replace('دلو', 'الدلو').replace('حوت', 'الحوت')
        : isPashto
          ? snapshot.shamsiDisplayPashto
          : snapshot.shamsiDisplay;
  const sunriseLabel = isTurkish
    ? (snapshot.sunriseDisplayEnglish || snapshot.sunriseDisplay || '').replace(/^Sunrise/, 'Güneş')
    : isLatin
      ? snapshot.sunriseDisplayEnglish || snapshot.sunriseDisplay
      : isArabic
        ? (snapshot.sunriseDisplay || '').replace('طلوع آفتاب', 'شروق الشمس')
        : isPashto
          ? snapshot.sunriseDisplayPashto
          : snapshot.sunriseDisplay;

  const localizeDigits = (value: string) =>
    isLatin ? toLatinNumeralsString(value) : toArabicNumeralsString(toLatinNumeralsString(value));

  const prayers = snapshot.prayers ?? [];
  // English is LTR: Fajr on the left. Dari/Pashto stay RTL on the chips.
  const prayersOrdered = isLatin ? prayers : [...prayers].reverse();
  const sunriseParts = (sunriseLabel || '').trim().split(/\s+/).filter(Boolean);
  const sunriseTimeOnly = sunriseParts.length ? localizeDigits(sunriseParts.slice(-1)[0] || '') : '';
  // Keep the localized sunrise caption short, matching the iOS widget.
  const sunriseCaption = isTurkish
    ? 'Güneş'
    : language === 'english'
      ? 'Sunrise'
      : isArabic
        ? 'الشروق'
        : isPashto
          ? 'لمر'
          : 'طلوع';

  const solarDisplay = shamsiLabel || snapshot.shamsiDisplay || '';
  const gregorianText = gregorianCell(snapshot.gregorianDisplay || '', language);
  const hijriText = isLatin ? englishHijriDate(hijriLabel || '') : (hijriLabel || '');
  const shamsiText = isLatin ? toLatinNumeralsString(solarDisplay) : solarDisplay;
  const hijriPrimary = isLatin || isArabic;
  const headerSubject = hijriPrimary ? hijriText : solarDisplay;
  const headerTitleText = isLatin
    ? latinHeaderTitle(weekdayLabel || '', headerSubject, language)
    : [weekdayLabel, headerSubject].filter(Boolean).join('، ');
  const sunriseCell = `${sunriseCaption}${sunriseTimeOnly ? ` ${sunriseTimeOnly}` : ''}`.trim();
  const calendarCell: WidgetDateCell = hijriPrimary
    ? { key: 'shamsi', text: shamsiText, color: TEXT_PRIMARY }
    : { key: 'hijri', text: hijriText, color: TEXT_PRIMARY };
  const dateCells: WidgetDateCell[] = isLatin
    ? [
        { key: 'gregorian', text: gregorianText, color: TEXT_SECONDARY },
        { key: 'sunrise', text: sunriseCell, color: palette.accent },
        calendarCell,
      ]
    : [
        calendarCell,
        { key: 'sunrise', text: sunriseCell, color: palette.accent },
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

  // Title plus the secondary date row, in each language's reading order.
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
          ...pashtoWeight(palette.accent),
          color: palette.accent,
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
          <FlexWidget key={cell.key} style={{ flex: 1, width: 0, alignItems: 'center' }}>
            <TextWidget
              text={cell.text}
              maxLines={1}
              allowFontScaling={false}
              style={{
                width: 'match_parent',
                textAlign: 'center',
                fontSize: cell.key === 'sunrise' ? sunriseLineSize : dateLineSize,
                fontFamily: boldFontFamily,
                ...pashtoWeight(cell.color),
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
        backgroundColor: '#00000000',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      clickAction="OPEN_APP"
    >
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundGradient,
          borderRadius: 16,
          flexDirection: 'column',
          justifyContent: 'center',
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
            const prayerName = isTurkish
              ? ({ fajr: 'İmsak', dhuhr: 'Öğle', asr: 'İkindi', maghrib: 'Akşam', isha: 'Yatsı' } as const)[prayer.key]
              : language === 'english'
                ? prayer.labelEnglish || prayer.labelDari
                : isArabic
                  ? ({ fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' } as const)[prayer.key]
                  : isPashto
                    ? prayer.labelPashto || prayer.labelDari
                    : prayer.labelDari;
            return (
              <FlexWidget
                key={prayer.key}
                style={{
                  flex: 1,
                  width: 0,
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
                    ...pashtoWeight(active ? palette.chipText : TEXT_PRIMARY),
                    color: active ? palette.chipText : TEXT_PRIMARY,
                    adjustsFontSizeToFit: true,
                  }}
                />
                <TextWidget
                  text={widgetPrayerClock(prayer, language)}
                  maxLines={1}
                  allowFontScaling={false}
                  style={{
                    fontSize: prayerTimeSize,
                    fontFamily: boldFontFamily,
                    ...pashtoWeight(active ? palette.chipText : TEXT_SECONDARY),
                    color: active ? palette.chipText : TEXT_SECONDARY,
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
