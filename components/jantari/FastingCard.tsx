import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { isFastingDay } from '@/utils/islamicCalendar';

export function FastingCard() {
  const { theme } = useApp();
  const fasting = isFastingDay(new Date());

  if (!fasting.isFasting) return null;

  return (
    <RtlView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.tint }]}>
      <RtlText align="center" style={[styles.title, { color: theme.tint }]}>روزه امروز</RtlText>
      <RtlText align="center" style={[styles.reason, { color: theme.text }]}>{fasting.reasonDari}</RtlText>
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
  reason: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
});
