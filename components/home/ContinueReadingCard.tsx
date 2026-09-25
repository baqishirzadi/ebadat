import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp, useReadingPosition } from '@/context/AppContext';
import { toArabicNumerals } from '@/utils/numbers';
import { useI18n } from '@/utils/i18n/useI18n';

export function ContinueReadingCard() {
  const { theme } = useApp();
  const { isPashto, language, t } = useI18n();
  const { position } = useReadingPosition();

  if (position.surahNumber <= 0) return null;

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/quran/[surah]',
          params: { surah: String(position.surahNumber), ayah: String(position.ayahNumber) },
        })
      }
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.playing }]}
    >
      <RtlView style={styles.inner}>
        <MaterialIcons name="menu-book" size={28} color={theme.playing} />
        <RtlView style={styles.textBlock}>
          <RtlText align="center" style={[styles.title, { color: theme.text }]}>{t('home.reading.continue')}</RtlText>
          <RtlText
            align="center"
            style={[styles.subtitle, language !== 'english' && styles.subtitlePashto, { color: theme.textSecondary }]}
          >
            {isPashto ? 'سورت' : 'سوره'} {toArabicNumerals(position.surahNumber)} • {isPashto ? 'آیت' : 'آیه'} {toArabicNumerals(position.ayahNumber)}
          </RtlText>
        </RtlView>
        <MaterialIcons name="play-circle-filled" size={36} color={theme.playing} />
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
  subtitlePashto: {
    fontSize: Typography.ui.body,
    lineHeight: 22,
  },
});
