import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, NAAT_GRADIENT, Spacing, Typography } from '@/constants/theme';
import { useAhadith } from '@/context/AhadithContext';
import { useApp } from '@/context/AppContext';
import { getDariFontFamily, getPashtoFontFamily } from '@/hooks/useFonts';
import { getHadithTranslation } from '@/utils/ahadith/translation';
import { useI18n } from '@/utils/i18n/useI18n';

export function JantariHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { dailySelection } = useAhadith();
  const { state, themeMode } = useApp();

  const { t, language, fontFamily } = useI18n();

  const hadithLabel = t('hadith.daily');

  const hadithText = useMemo(() => {
    const hadith = dailySelection?.hadith;
    if (!hadith) return '…';
    return getHadithTranslation(hadith, language);
  }, [dailySelection?.hadith, language]);

  const hadithFontFamily = fontFamily
    ?? (language === 'pashto'
      ? getPashtoFontFamily(state.preferences.pashtoFont)
      : getDariFontFamily(state.preferences.dariFont));

  return (
    <RtlView style={[styles.wrapper, { paddingTop: insets.top + Spacing.sm }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hadithLabel}
        onPress={() => router.push('/(tabs)/ahadith')}
      >
        <LinearGradient
          colors={NAAT_GRADIENT[themeMode] ?? NAAT_GRADIENT.light}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <RtlText align="center" style={styles.title}>
            {t('jantari.title')}
          </RtlText>
          <RtlView style={styles.hadithBlock}>
            <RtlText align="center" style={styles.hadithLabel}>
              {hadithLabel}
            </RtlText>
            <RtlText
              align="center"
              numberOfLines={3}
              ellipsizeMode="tail"
              style={[styles.hadithText, { fontFamily: hadithFontFamily }]}
            >
              {hadithText}
            </RtlText>
          </RtlView>
        </LinearGradient>
      </Pressable>
    </RtlView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  gradient: {
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  title: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.heading,
    color: '#fff',
  },
  hadithBlock: {
    minHeight: 72,
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  hadithLabel: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  hadithText: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.92)',
  },
});
