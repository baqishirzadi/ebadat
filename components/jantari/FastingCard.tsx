import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { isFastingDay } from '@/utils/islamicCalendar';

export function FastingCard() {
  const { theme } = useApp();
  const fasting = isFastingDay(new Date());

  if (!fasting.isFasting) return null;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.tint }]}>
      <Text style={[styles.title, { color: theme.tint }]}>روزه امروز</Text>
      <Text style={[styles.reason, { color: theme.text }]}>{fasting.reasonDari}</Text>
    </View>
  );
}

interface HijriOffsetRowProps {
  offset: number;
  onChange: (offset: number) => void;
}

export function HijriOffsetRow({ offset, onChange }: HijriOffsetRowProps) {
  const { theme } = useApp();

  return (
    <View style={[styles.offsetCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <Text style={[styles.offsetTitle, { color: theme.text }]}>تنظیم تاریخ قمری</Text>
      <Text style={[styles.offsetHint, { color: theme.textSecondary }]}>
        اگر تاریخ قمری با رویت ماه افغانستان متفاوت است، یک روز جابه‌جا کنید.
      </Text>
      <View style={styles.offsetControls}>
        {[-2, -1, 0, 1, 2].map((value) => (
          <Pressable
            key={value}
            onPress={() => onChange(value)}
            style={[
              styles.offsetButton,
              {
                backgroundColor: offset === value ? theme.tint : theme.backgroundSecondary,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <Text style={{ color: offset === value ? '#fff' : theme.text, fontFamily: 'Vazirmatn-Bold' }}>
              {value > 0 ? `+${value}` : value}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
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
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  reason: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  offsetCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  offsetTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  offsetHint: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
  },
  offsetControls: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  offsetButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
});
