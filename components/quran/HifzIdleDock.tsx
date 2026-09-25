/**
 * Idle bottom dock for the 16-line reader — play and bookmark before audio opens.
 */

import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CenteredText from '@/components/CenteredText';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useApp, useBookmarks } from '@/context/AppContext';
import { toArabicNumerals } from '@/utils/numbers';
import { findHifzPageForAyah } from '@/utils/hifz16';
import { useI18n } from '@/utils/i18n/useI18n';

type Props = {
  surahNumber: number;
  ayahNumber: number;
  onPlay: (surah: number, ayah: number) => void;
};

export function HifzIdleDock({ surahNumber, ayahNumber, onPlay }: Props) {
  const { theme } = useApp();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { addBookmark, removeBookmark, isBookmarked, getBookmark } = useBookmarks();
  const bookmarked = isBookmarked(surahNumber, ayahNumber);

  const handleBookmark = useCallback(() => {
    if (bookmarked) {
      const existing = getBookmark(surahNumber, ayahNumber);
      if (existing) removeBookmark(existing.id);
      return;
    }
    addBookmark({
      surahNumber,
      ayahNumber,
      page: findHifzPageForAyah(surahNumber, ayahNumber) ?? 0,
    });
  }, [addBookmark, ayahNumber, bookmarked, getBookmark, removeBookmark, surahNumber]);

  return (
    <View
      style={[
        styles.dock,
        {
          backgroundColor: theme.card,
          borderTopColor: theme.divider,
          paddingBottom: insets.bottom,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.row} pointerEvents="auto">
        <Pressable
          accessibilityLabel={t('quran.hifz.dock.play')}
          onPress={() => onPlay(surahNumber, ayahNumber)}
          style={({ pressed }) => [
            styles.playButton,
            { backgroundColor: theme.playing },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons name="play-arrow" size={22} color="#fff" />
        </Pressable>

        <View style={styles.meta}>
          <CenteredText style={[styles.metaTitle, { color: theme.text }]} numberOfLines={1}>
            {t('quran.hifz.dock.play')}
          </CenteredText>
          <CenteredText style={[styles.metaSub, { color: theme.textSecondary }]} numberOfLines={1}>
            {toArabicNumerals(surahNumber)}:{toArabicNumerals(ayahNumber)}
          </CenteredText>
        </View>

        <Pressable
          accessibilityLabel={
            bookmarked ? t('quran.hifz.dock.unbookmark') : t('quran.hifz.dock.bookmark')
          }
          onPress={handleBookmark}
          style={({ pressed }) => [
            styles.bookmarkButton,
            { backgroundColor: theme.backgroundSecondary },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons
            name={bookmarked ? 'bookmark' : 'bookmark-border'}
            size={22}
            color={bookmarked ? theme.bookmark : theme.icon}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 24,
    zIndex: 200,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 10,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaTitle: {
    fontFamily: 'Vazirmatn',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  metaSub: {
    fontFamily: 'Vazirmatn',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  bookmarkButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
