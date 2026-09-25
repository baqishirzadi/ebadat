import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/utils/i18n/useI18n';

interface PrayerChipProps {
  label: string;
  time: string;
  active?: boolean;
  /** Widget strip: white current-prayer chip on green. Card: tint fill on a light surface. */
  tone?: 'card' | 'widget';
  style?: ViewStyle;
}

export function PrayerChip({ label, time, active = false, tone = 'card', style }: PrayerChipProps) {
  const { theme } = useApp();
  const { language } = useI18n();
  const isRtlHome = language !== 'english';
  const tint = theme.tint;
  const onWidget = tone === 'widget';

  const backgroundColor = onWidget
    ? active ? '#ffffff' : '#ffffff1f'
    : active ? tint : theme.card;
  const borderColor = onWidget
    ? 'transparent'
    : active ? tint : theme.cardBorder;
  const labelColor = onWidget
    ? active ? tint : '#ffffff'
    : active ? '#fff' : theme.text;
  const timeColor = onWidget
    ? active ? tint : '#ffffffd9'
    : active ? '#fff' : theme.textSecondary;

  return (
    <View
      style={[
        styles.chip,
        onWidget && styles.chipOnWidget,
        {
          backgroundColor,
          borderColor,
          ...(active
            ? {
                shadowColor: onWidget ? '#000' : tint,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: onWidget ? 0.18 : 0.25,
                shadowRadius: 4,
                elevation: 3,
              }
            : null),
        },
        style,
      ]}
    >
      <RtlText align="center" style={[styles.label, isRtlHome && styles.labelPashto, { color: labelColor }]}>
        {label}
      </RtlText>
      <RtlText align="center" style={[styles.time, isRtlHome && styles.timePashto, { color: timeColor }]}>
        {time}
      </RtlText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 2,
    alignItems: 'center',
    gap: 2,
  },
  chipOnWidget: {
    borderWidth: 0,
    borderRadius: 8,
  },
  label: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 11,
  },
  labelPashto: {
    fontSize: 13,
    lineHeight: 18,
  },
  time: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 13,
  },
  timePashto: {
    fontSize: 14,
  },
});
