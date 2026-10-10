import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useDiyanetHijriDate } from '@/hooks/useDiyanetHijri';
import { usePrayer } from '@/context/PrayerContext';
import { turkishFastingLabel } from '@/utils/diyanetHijri';
import { isFastingDay } from '@/utils/islamicCalendar';
import { useI18n } from '@/utils/i18n/useI18n';

export function FastingCard() {
  const { theme } = useApp();
  const hijriOffsetDays = usePrayer().state.settings.hijriOffsetDays;
  const { isPashto, language, t } = useI18n();
  useDiyanetHijriDate(language === 'turkish');
  const fasting = useMemo(() => isFastingDay(new Date()), [hijriOffsetDays]);
  const turkishReason = language === 'turkish' ? turkishFastingLabel(new Date()) : null;
  const reason = language === 'turkish'
    ? turkishReason
    : fasting.isFasting
      ? (isPashto ? fasting.reasonPashto : fasting.reasonDari)
      : null;

  if (!reason) return null;

  return (
    <RtlView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.tint }]}>
      <RtlText align="center" style={[styles.title, language === 'turkish' && styles.titleTurkish, { color: theme.tint }]}>{t('calendar.fasting.today')}</RtlText>
      <RtlText align="center" style={[styles.reason, language === 'turkish' && styles.reasonTurkish, { color: theme.text }]}>{reason}</RtlText>
    </RtlView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 4,
  },
  title: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  titleTurkish: {
    fontFamily: undefined,
  },
  reason: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
  reasonTurkish: {
    fontFamily: undefined,
  },
});
