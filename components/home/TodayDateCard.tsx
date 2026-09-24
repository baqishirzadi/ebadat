import { router } from 'expo-router';
import React, { memo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { useTodayCalendar } from '@/hooks/useTodayCalendar';
import {
  formatGregorianDateCompact,
  formatShamsiSlash,
  weekdayName,
} from '@/utils/calendarDisplay';
import { formatPrayerTime12h } from '@/utils/formatPrayerTime';
import { hijriMonthName } from '@/utils/islamicCalendar';
import { useI18n } from '@/utils/i18n/useI18n';

const pashtoDateMetrics = {
  amiri: {
    heading: { fontSize: 13, lineHeight: 20 },
    weekday: { fontSize: 17, lineHeight: 26, marginTop: 1 },
    shamsiDate: { fontSize: 25, lineHeight: 37, marginBottom: 3 },
    secondaryLabel: { fontSize: 12, lineHeight: 20 },
    secondaryValue: { fontSize: 13, lineHeight: 22 },
    sunriseValue: { fontSize: 12, lineHeight: 20 },
    gregorianValue: { fontSize: 13, lineHeight: 22 },
  },
  nastaliq: {
    heading: { fontSize: 12, lineHeight: 28, includeFontPadding: true },
    weekday: { fontSize: 15, lineHeight: 38, marginTop: 0, includeFontPadding: true },
    shamsiDate: { fontSize: 19, lineHeight: 43, marginBottom: 2, includeFontPadding: true },
    secondaryLabel: { fontSize: 12, lineHeight: 30, includeFontPadding: true },
    secondaryValue: { fontSize: 13, lineHeight: 32, includeFontPadding: true },
    sunriseValue: { fontSize: 12, lineHeight: 28, includeFontPadding: true },
    gregorianValue: { fontSize: 13, lineHeight: 30, includeFontPadding: true },
  },
} as const;

function TodayDateCardInner() {
  const { theme } = useApp();
  const { language, isPashto, fontFamily, t, n } = useI18n();
  const { state } = usePrayer();
  const truth = useTodayCalendar();
  const { width } = useWindowDimensions();
  const isNastaliq = fontFamily === 'NotoNastaliqUrdu';
  const narrowPashto = isPashto && width < 360;
  const pashtoFontMetrics = isPashto
    ? isNastaliq ? pashtoDateMetrics.nastaliq : pashtoDateMetrics.amiri
    : null;
  const sunrise = state.prayerTimes?.sunrise;
  const sunriseDisplay = sunrise
    ? formatPrayerTime12h(sunrise, state.location?.timezone)
    : '--:--';

  return (
    <Pressable
      testID="home-today-date-card"
      onPress={() => router.push('/(tabs)/jantari' as never)}
      style={[
        styles.container,
        isPashto && styles.containerPashto,
        narrowPashto && styles.containerPashtoNarrow,
        isPashto && isNastaliq && styles.containerPashtoNastaliq,
        { backgroundColor: theme.card, borderColor: theme.cardBorder },
      ]}
    >
      <RtlText testID="home-today-date-heading" align="center" style={[styles.heading, pashtoFontMetrics?.heading, { color: theme.textSecondary }]}>{t('home.date.today')}</RtlText>

      <RtlText align="center" style={[styles.weekday, pashtoFontMetrics?.weekday, { color: theme.text }]}>
        {weekdayName(truth.weekday, language)}
      </RtlText>

      <RtlText testID="home-today-shamsi-date" align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.shamsiDate, pashtoFontMetrics?.shamsiDate, { color: theme.tint }]}>
        {formatShamsiSlash(truth.shamsi, language)}
      </RtlText>

      <RtlView style={[styles.secondaryRow, isPashto && styles.secondaryRowPashto, { borderTopColor: theme.divider }]}>
        <View style={[styles.secondaryItem, isPashto && styles.hijriItemPashto]}>
          <RtlText align="center" style={[styles.secondaryLabel, pashtoFontMetrics?.secondaryLabel, { color: theme.textSecondary }]}>{t('calendar.label.hijri')}</RtlText>
          <RtlText align="center" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.95} style={[styles.qamariValue, pashtoFontMetrics?.secondaryValue, { color: theme.tint }]}>
            {n(truth.hijri.day)} {hijriMonthName(truth.hijri, language)} {n(truth.hijri.year)}
          </RtlText>
        </View>
        <View style={[styles.secondaryDivider, isPashto && styles.secondaryDividerPashto, { backgroundColor: theme.divider }]} />
        <View style={[styles.secondaryItem, isPashto && styles.sunriseItemPashto]}>
          <RtlText align="center" style={[styles.secondaryLabel, pashtoFontMetrics?.secondaryLabel, { color: theme.textSecondary }]}>{t('prayer.prayerName.sunrise')}</RtlText>
          <RtlText align="center" numberOfLines={1} style={[styles.sunriseValue, pashtoFontMetrics?.sunriseValue ?? pashtoFontMetrics?.secondaryValue, { color: theme.tint }]}>
            {sunriseDisplay}
          </RtlText>
        </View>
        <View style={[styles.secondaryDivider, isPashto && styles.secondaryDividerPashto, { backgroundColor: theme.divider }]} />
        <View style={[styles.secondaryItem, isPashto && styles.gregItemPashto]}>
          <RtlText align="center" style={[styles.secondaryLabel, pashtoFontMetrics?.secondaryLabel, { color: theme.textSecondary }]}>{t('calendar.label.gregorian')}</RtlText>
          <RtlText testID="home-today-gregorian-date" align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.95} style={[styles.gregValue, pashtoFontMetrics?.gregorianValue, { color: theme.text }]}>
            {formatGregorianDateCompact(truth.gregorianDate)}
          </RtlText>
        </View>
      </RtlView>
    </Pressable>
  );
}

export const TodayDateCard = memo(TodayDateCardInner);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: 2,
  },
  containerPashto: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  containerPashtoNarrow: {
    paddingHorizontal: Spacing.sm + 2,
  },
  containerPashtoNastaliq: {
    paddingBottom: Spacing.md,
  },
  heading: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
  weekday: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.subtitle,
    marginTop: 2,
  },
  shamsiDate: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.display,
    marginBottom: Spacing.sm,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  secondaryItem: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  hijriItemPashto: {
    flex: 1.35,
  },
  sunriseItemPashto: {
    flex: 0.7,
  },
  gregItemPashto: {
    flex: 1.2,
  },
  secondaryDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: Spacing.sm,
  },
  secondaryLabel: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
  },
  qamariValue: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  sunriseValue: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  gregValue: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 20,
  },
  secondaryRowPashto: {
    paddingTop: 6,
  },
  secondaryDividerPashto: {
    marginHorizontal: Spacing.xs,
  },
});
