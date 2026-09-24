import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/utils/i18n/useI18n';
import type { CalendarGridMode } from '@/utils/calendarMonthGrid';

const MODES: { key: CalendarGridMode; message: 'calendar.mode.qamari' | 'calendar.mode.shamsi' | 'calendar.mode.gregorian' }[] = [
  { key: 'qamari', message: 'calendar.mode.qamari' },
  { key: 'shamsi', message: 'calendar.mode.shamsi' },
  { key: 'gregorian', message: 'calendar.mode.gregorian' },
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
  const { t } = useI18n();

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
            {t(item.message)}
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
