import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { CalendarGridMode } from '@/utils/calendarMonthGrid';

const MODES: { key: CalendarGridMode; label: string }[] = [
  { key: 'qamari', label: 'قمری' },
  { key: 'shamsi', label: 'شمسی' },
  { key: 'gregorian', label: 'میلادی' },
];

interface CalendarModeTabsProps {
  mode: CalendarGridMode;
  onModeChange: (mode: CalendarGridMode) => void;
}

export const CalendarModeTabs = React.memo(function CalendarModeTabs({
  mode,
  onModeChange,
}: CalendarModeTabsProps) {
  const { theme } = useApp();

  return (
    <RtlView style={[styles.segment, { backgroundColor: theme.backgroundSecondary }]}>
      {MODES.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => onModeChange(item.key)}
          style={[styles.segmentBtn, { backgroundColor: mode === item.key ? theme.tint : 'transparent' }]}
        >
          <RtlText
            align="center"
            style={{
              color: mode === item.key ? '#fff' : theme.textSecondary,
              fontFamily: 'Vazirmatn-Bold',
              fontSize: 12,
            }}
          >
            {item.label}
          </RtlText>
        </Pressable>
      ))}
    </RtlView>
  );
});

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    borderRadius: BorderRadius.full,
    padding: 4,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: 8,
    alignItems: 'center',
  },
});
