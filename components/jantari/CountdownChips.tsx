import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, InteractionManager, ScrollView, StyleSheet, View } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useTodayCalendar } from '@/hooks/useTodayCalendar';
import { getUpcomingEvents } from '@/utils/calendarEvents';
import { toArabicNumerals } from '@/utils/numbers';

function daysUntil(target: Date): number {
  const now = new Date();
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

type ChipRow = {
  key: string;
  label: string;
  days: number;
  icon: 'star' | 'nightlight-round' | 'event';
};

export function CountdownChips() {
  const { theme } = useApp();
  const truth = useTodayCalendar();
  const [chips, setChips] = useState<ChipRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      const rows = getUpcomingEvents(truth.gregorianDate, 3).map((event) => ({
        key: event.id,
        label: event.titleDari,
        days: daysUntil(event.gregorianDate),
        icon: (event.isEid ? 'star' : event.isFasting ? 'nightlight-round' : 'event') as ChipRow['icon'],
      }));
      if (!cancelled) {
        setChips(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [truth.gregorianDate]);

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={theme.tint} />
      </View>
    );
  }

  if (chips.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {chips.map((chip) => (
        <View
          key={chip.key}
          style={[styles.chip, { backgroundColor: theme.tint, borderColor: `${theme.tint}` }]}
        >
          <MaterialIcons name={chip.icon} size={20} color="#fff" />
          <RtlText align="center" style={styles.days}>{toArabicNumerals(chip.days)} روز</RtlText>
          <RtlText align="center" style={styles.label} numberOfLines={2}>
            {chip.label}
          </RtlText>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: 4,
    minWidth: 110,
    maxWidth: 140,
  },
  days: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    color: '#fff',
  },
  label: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.9)',
  },
});
