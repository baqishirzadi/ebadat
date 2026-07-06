import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp, useReadingPosition } from '@/context/AppContext';
import { toArabicNumerals } from '@/utils/numbers';

export function ContinueReadingCard() {
  const { theme } = useApp();
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
      <MaterialIcons name="menu-book" size={28} color={theme.playing} />
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: theme.text }]}>ادامه تلاوت</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          سوره {toArabicNumerals(position.surahNumber)} • آیه {toArabicNumerals(position.ayahNumber)}
        </Text>
      </View>
      <MaterialIcons name="play-circle-filled" size={36} color={theme.playing} />
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
