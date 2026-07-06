import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
      <View style={[styles.compassCircle, { borderColor: theme.accent }]}>
        <MaterialIcons name="navigation" size={28} color={theme.accent} style={{ transform: [{ rotate: `${bearing}deg` }] }} />
      </View>
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: theme.text }]}>قبله‌نما</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          جهت قبله: {bearing.toLocaleString('fa-AF')}°
        </Text>
      </View>
      <MaterialIcons name="chevron-left" size={24} color={theme.textSecondary} />
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
    flexDirection: 'row-reverse',
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
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
