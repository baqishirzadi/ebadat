import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useDua } from '@/context/DuaContext';

const ACTIONS = [
  { icon: 'auto-awesome' as const, label: 'اذکار', route: '/(tabs)/adhkar', badgeKey: null },
  { icon: 'format-quote' as const, label: 'احادیث', route: '/(tabs)/ahadith', badgeKey: null },
  { icon: 'favorite' as const, label: 'دعای خیر', route: '/dua-request', badgeKey: 'dua' as const },
  { icon: 'explore' as const, label: 'قبله‌نما', route: '/qibla', badgeKey: null },
];

export function QuickActions() {
  const { theme } = useApp();
  const { unreadCount } = useDua();

  return (
    <RtlView style={styles.grid}>
      {ACTIONS.map((action) => (
        <Pressable
          key={action.route}
          onPress={() => router.push(action.route as never)}
          style={[styles.tile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          <View>
            <RtlView style={[styles.iconCircle, { backgroundColor: `${theme.tint}18` }]}>
              <MaterialIcons name={action.icon} size={26} color={theme.tint} />
            </RtlView>
            {action.badgeKey === 'dua' && unreadCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: '#E11D48' }]}>
                <RtlText style={styles.badgeText}>
                  {unreadCount > 9 ? '۹+' : String(unreadCount)}
                </RtlText>
              </View>
            ) : null}
          </View>
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
  badge: {
    position: 'absolute',
    top: -4,
    left: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Vazirmatn-Bold',
    lineHeight: 14,
  },
});
