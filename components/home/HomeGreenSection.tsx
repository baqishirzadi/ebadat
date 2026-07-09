import { LinearGradient } from 'expo-linear-gradient';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { HanafiMuftiWidget } from '@/components/home/HanafiMuftiWidget';
import { NextPrayerCard } from '@/components/home/NextPrayerCard';
import { BorderRadius, NAAT_GRADIENT, RTL_CONTAINER, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { PrayerTimes } from '@/utils/prayerTimes';

interface HomeGreenSectionProps {
  prayerTimes: PrayerTimes | null;
}

function HomeGreenSectionInner({ prayerTimes }: HomeGreenSectionProps) {
  const { themeMode } = useApp();
  const gradient = NAAT_GRADIENT[themeMode] ?? NAAT_GRADIENT.light;

  return (
    <View style={[styles.shell, styles.shadow]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, RTL_CONTAINER]}
      >
        <NextPrayerCard prayerTimes={prayerTimes} variant="compact" embedded />
        <View style={styles.divider} />
        <HanafiMuftiWidget />
      </LinearGradient>
    </View>
  );
}

export const HomeGreenSection = memo(HomeGreenSectionInner);

const styles = StyleSheet.create({
  shell: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    overflow: 'hidden',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    backgroundColor: 'rgba(212,175,55,0.25)',
    alignSelf: 'stretch',
  },
});
