import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

const ACTIONS = [
  { icon: 'auto-awesome' as const, label: 'اذکار', route: '/(tabs)/adhkar' },
  { icon: 'format-quote' as const, label: 'احادیث', route: '/(tabs)/ahadith' },
  { icon: 'play-circle-filled' as const, label: 'نعت', route: '/(tabs)/naat' },
  { icon: 'favorite' as const, label: 'دعای خیر', route: '/dua-request' },
];

export function QuickActions() {
  const { theme } = useApp();

  return (
    <View style={styles.grid}>
      {ACTIONS.map((action) => (
        <Pressable
          key={action.route}
          onPress={() => router.push(action.route as never)}
          style={[styles.tile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          <MaterialIcons name={action.icon} size={28} color={theme.tint} />
          <Text style={[styles.label, { color: theme.text }]}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row-reverse',
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
    gap: Spacing.xs,
  },
  label: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
