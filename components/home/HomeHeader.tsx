import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';

import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'صبح بخیر';
  if (hour < 17) return 'روز بخیر';
  if (hour < 21) return 'عصر بخیر';
  return 'شب بخیر';
}

interface HomeHeaderProps {
  onCityPress: () => void;
}

export function HomeHeader({ onCityPress }: HomeHeaderProps) {
  const { theme } = useApp();
  const { state } = usePrayer();
  const insets = useSafeAreaInsets();

  return (
    <RtlView style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <RtlView style={styles.row}>
        <Pressable onPress={() => router.push('/(tabs)/settings')} hitSlop={8}>
          <MaterialIcons name="settings" size={24} color={theme.textSecondary} />
        </Pressable>
        <RtlView style={styles.center}>
          <RtlText align="center" style={[styles.greeting, { color: theme.textSecondary }]}>{getGreeting()}</RtlText>
          <RtlText align="center" style={[styles.title, { color: theme.text }]}>عبادت</RtlText>
        </RtlView>
        <Pressable
          onPress={onCityPress}
          style={[styles.cityChip, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}
        >
          <MaterialIcons name="location-on" size={16} color={theme.tint} />
          <RtlText style={[styles.cityText, { color: theme.text }]} numberOfLines={1}>
            {state.locationName || 'انتخاب شهر'}
          </RtlText>
        </Pressable>
      </RtlView>
    </RtlView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
    flex: 1,
  },
  greeting: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  title: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.subtitle,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 120,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  cityText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    textAlign: 'right',
    writingDirection: 'rtl',
    flexShrink: 1,
  },
});
