import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

const ACTIONS = [
  { icon: 'auto-awesome' as const, label: 'اذکار', route: '/(tabs)/adhkar' },
  { icon: 'format-quote' as const, label: 'احادیث', route: '/(tabs)/ahadith' },
  { icon: 'favorite' as const, label: 'دعای خیر', route: '/dua-request' },
  { icon: 'explore' as const, label: 'قبله‌نما', route: '/qibla' },
];

export function QuickActions() {
  const { theme } = useApp();

  return (
    <RtlView style={styles.grid}>
      {ACTIONS.map((action) => (
        <Pressable
          key={action.route}
          onPress={() => router.push(action.route as never)}
          style={[styles.tile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          <RtlView style={[styles.iconCircle, { backgroundColor: `${theme.tint}18` }]}>
            <MaterialIcons name={action.icon} size={26} color={theme.tint} />
          </RtlView>
          <RtlText align="center" style={[styles.label, { color: theme.text }]}>{action.label}</RtlText>
        </Pressable>
      ))}
    </RtlView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tile: {
    width: '48%',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
  },
});
