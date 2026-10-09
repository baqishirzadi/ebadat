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

/** Gregorian day and English month code, omitting the year. Latin digits in every language. */
function gregorianCell(gregorianDisplay: string): string {
  const parts = gregorianDisplay.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return toLatinNumeralsString(gregorianDisplay.trim());
  const day = toLatinNumeralsString(parts[0]);
  const monthKey = toLatinNumeralsString(parts[1]).toUpperCase();
  return `${day} ${monthKey}`;
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

  // Use the same 0.88 medium-widget scale as iOS at the configured 4x2 size.
  // A narrow legacy placement can shrink down to 0.76 while keeping all rows.
  const scale = Math.min(0.88, Math.max(0.76, height / 125));
  // Android sizes each line from the font's Windows metrics. Noto Naskh and
  // Amiri boxes are taller than Dari's Vazirmatn, so Arabic and Pashto type
  // is scaled down until the wrap_content card fits the same launcher cell.
  const pashtoLineScale = isArabic
    ? 0.84
    : !isPashto
      ? 1
      : snapshot?.pashtoFont === 'amiri'
        ? 0.62
        : 0.84;
  const typeScale = scale * pashtoLineScale;
  // At that smaller size the bold Naskh strokes read thin. A tight shadow in
  // the text color thickens them without changing the line box.
  const pashtoWeight = (color: `#${string}`) =>
    isPashto || isArabic
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

  const weekdayLabel = isTurkish
    ? ({ Sunday: 'Pazar', Monday: 'Pazartesi', Tuesday: 'Salı', Wednesday: 'Çarşamba', Thursday: 'Perşembe', Friday: 'Cuma', Saturday: 'Cumartesi' } as Record<string, string>)[snapshot.weekdayEnglish || ''] || snapshot.weekdayEnglish
    : isLatin
      ? snapshot.weekdayEnglish || snapshot.weekdayDari
      : isArabic
        ? ({ 'یکشنبه': 'الأحد', 'دوشنبه': 'الإثنين', 'سه‌شنبه': 'الثلاثاء', 'چهارشنبه': 'الأربعاء', 'پنجشنبه': 'الخميس', 'جمعه': 'الجمعة', 'شنبه': 'السبت' } as Record<string, string>)[snapshot.weekdayDari] || snapshot.weekdayDari
        : isPashto
          ? snapshot.weekdayPashto
          : snapshot.weekdayDari;
  const hijriLabel = isTurkish
    ? (snapshot.hijriDisplayEnglish || snapshot.hijriDisplay || '')
        .replace('Muharram', 'Muharrem').replace('Safar', 'Safer')
        .replace('Rabi al-Awwal', 'Rebiülevvel').replace('Rabi al-Thani', 'Rebiülahir')
        .replace('Jumada al-Awwal', 'Cemaziyelevvel').replace('Jumada al-Thani', 'Cemaziyelahir')
        .replace('Rajab', 'Recep').replace('Shaban', 'Şaban').replace('Ramadan', 'Ramazan')
        .replace('Shawwal', 'Şevval').replace('Dhul Qadah', 'Zilkade').replace('Dhul Hijjah', 'Zilhicce')
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
  const headerTitleText = isLatin
    ? englishHeaderTitle(weekdayLabel || '', solarDisplay)
    : [weekdayLabel, solarDisplay].filter(Boolean).join('، ');
  const gregorianText = gregorianCell(snapshot.gregorianDisplay || '');
  const hijriText = isLatin ? englishHijriDate(hijriLabel || '') : (hijriLabel || '');
  const sunriseCell = `${sunriseCaption}${sunriseTimeOnly ? ` ${sunriseTimeOnly}` : ''}`.trim();
  const dateCells: WidgetDateCell[] = isLatin
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
          ...pashtoWeight(ACCENT),
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
            const prayerName = isTurkish
              ? ({ fajr: 'Sabah', dhuhr: 'Öğle', asr: 'İkindi', maghrib: 'Akşam', isha: 'Yatsı' } as const)[prayer.key]
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
                    ...pashtoWeight(active ? TINT : TEXT_PRIMARY),
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
                    ...pashtoWeight(active ? TINT : TEXT_SECONDARY),
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
