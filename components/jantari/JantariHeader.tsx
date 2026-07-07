import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useTodayCalendar } from '@/hooks/useTodayCalendar';
import { formatShamsiSlash } from '@/utils/calendarDisplay';
import { toArabicNumerals } from '@/utils/numbers';

export function JantariHeader() {
  const truth = useTodayCalendar();
  const insets = useSafeAreaInsets();

  return (
    <RtlView style={[styles.wrapper, { paddingTop: insets.top + Spacing.sm }]}>
      <LinearGradient
        colors={['#0F1F14', '#1a4d3e', '#2d6a4f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <RtlText align="center" style={styles.title}>جنتری</RtlText>
        <RtlText align="center" style={styles.subtitle}>
          {formatShamsiSlash(truth.shamsi)} • {toArabicNumerals(truth.hijri.day)} {truth.hijri.monthNameDari}
        </RtlText>
      </LinearGradient>
    </RtlView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  gradient: {
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  title: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.heading,
    color: '#fff',
  },
  subtitle: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.8)',
  },
});
