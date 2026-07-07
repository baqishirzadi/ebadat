import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { calculateQibla } from '@/utils/prayerTimes';

export function QiblaCard() {
  const { theme } = useApp();
  const { state } = usePrayer();
  const bearing = Math.round(calculateQibla(state.location));

  return (
    <Pressable
      onPress={() => router.push('/qibla')}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
    >
      <RtlView style={styles.inner}>
        <RtlView style={[styles.compassCircle, { borderColor: theme.accent }]}>
          <MaterialIcons name="navigation" size={28} color={theme.accent} style={{ transform: [{ rotate: `${bearing}deg` }] }} />
        </RtlView>
        <RtlView style={styles.textBlock}>
          <RtlText style={[styles.title, { color: theme.text }]}>قبله‌نما</RtlText>
          <RtlText style={[styles.subtitle, { color: theme.textSecondary }]}>
            جهت قبله: {bearing.toLocaleString('fa-AF')}°
          </RtlText>
        </RtlView>
        <MaterialIcons name="chevron-left" size={24} color={theme.textSecondary} />
      </RtlView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  compassCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  subtitle: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
});
