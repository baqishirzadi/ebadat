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
import { localizeCityName } from '@/utils/cities';
import { formatLiveClock } from '@/utils/prayerDisplay';
import { useI18n } from '@/utils/i18n/useI18n';

function getGreeting(hour: number, t: ReturnType<typeof useI18n>['t']): string {
  const key = hour < 12
    ? 'home.greeting.morning'
    : hour < 17
      ? 'home.greeting.day'
      : hour < 21
        ? 'home.greeting.evening'
        : 'home.greeting.night';
  return t(key);
}

interface HomeHeaderProps {
  onCityPress: () => void;
}

export function HomeHeader({ onCityPress }: HomeHeaderProps) {
  const { theme } = useApp();
  const { t, language, fontFamily } = useI18n();
  const isEnglish = language === 'english';
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
        <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
          <MaterialIcons name="settings" size={24} color={theme.textSecondary} />
        </Pressable>
        <RtlView style={styles.center}>
          <RtlText align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.greeting, { color: theme.textSecondary }]}>
            {getGreeting(new Date().getHours(), t)} • {clock}
          </RtlText>
          <RtlText
            align="center"
            style={[
              styles.title,
              { color: theme.text },
              isEnglish ? styles.titleEnglish : { fontFamily },
            ]}
          >
            {isEnglish ? 'Ebadat' : 'عبادت'}
          </RtlText>
        </RtlView>
        <Pressable
          onPress={onCityPress}
          style={[styles.cityChip, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}
        >
          <MaterialIcons name="location-on" size={16} color={theme.tint} />
          <RtlText
            wrap={false}
            align="center"
            numberOfLines={1}
            style={[styles.cityText, !isEnglish && styles.cityTextRtl, { color: theme.text }]}
          >
            {localizeCityName(state.locationName, language) || t('home.city.choose')}
          </RtlText>
        </Pressable>
      </RtlView>
    </RtlView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
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
  titleEnglish: {
    fontFamily: undefined,
    fontWeight: '700',
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    maxWidth: 136,
    height: 34,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
  },
  cityText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  cityTextRtl: {
    marginTop: 1,
  },
});
