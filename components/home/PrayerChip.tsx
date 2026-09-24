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
  style?: ViewStyle;
}

export function PrayerChip({ label, time, active = false, style }: PrayerChipProps) {
  const { theme } = useApp();
  const { isPashto } = useI18n();

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.tint : theme.card,
          borderColor: active ? theme.tint : theme.cardBorder,
          ...(active
            ? {
                shadowColor: theme.tint,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 3,
              }
            : null),
        },
        style,
      ]}
    >
      <RtlText align="center" style={[styles.label, isPashto && styles.labelPashto, { color: active ? '#fff' : theme.text }]}>
        {label}
      </RtlText>
      <RtlText align="center" style={[styles.time, isPashto && styles.timePashto, { color: active ? '#fff' : theme.textSecondary }]}>
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
    fontVariant: ['tabular-nums'],
  },
  timePashto: {
    fontSize: 14,
  },
});
