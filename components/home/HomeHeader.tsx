import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { formatLiveClock } from '@/utils/prayerDisplay';

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
  const [clock, setClock] = useState(() => formatLiveClock(new Date()));

  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => setClock(formatLiveClock(new Date())), 30000);
      return () => clearInterval(timer);
    }, []),
  );

  return (
    <RtlView style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <RtlView style={styles.row}>
        <Pressable onPress={() => router.push('/(tabs)/settings')} hitSlop={8}>
          <MaterialIcons name="settings" size={24} color={theme.textSecondary} />
        </Pressable>
        <RtlView style={styles.center}>
          <RtlText align="center" style={[styles.greeting, { color: theme.textSecondary }]}>
            {getGreeting()} • {clock}
          </RtlText>
          <RtlText align="center" style={[styles.title, { color: theme.text }]}>عبادت</RtlText>
        </RtlView>
        <Pressable
          onPress={onCityPress}
          style={[styles.cityChip, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}
        >
          <MaterialIcons name="location-on" size={16} color={theme.tint} />
          <RtlText align="center" style={[styles.cityText, { color: theme.text }]} numberOfLines={1}>
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
  },
  title: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.subtitle,
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
    flexShrink: 1,
  },
});
