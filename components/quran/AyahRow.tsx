/**
 * AyahRow Component
 * Displays a single Quran ayah with Arabic text, translations, and controls
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp, useBookmarks } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { getDariFontFamily, getPashtoFontFamily, getQuranFontFamily } from '@/hooks/useFonts';
import { Ayah } from '@/types/quran';
import { stripQuranicMarks } from '@/utils/quranText';
import { QuranText } from './QuranText';
import { toArabicNumerals } from '@/utils/numbers';

interface AyahRowProps {
  ayah: Ayah;
  surahNumber: number;
  dariTranslation?: string;
  pashtoTranslation?: string;
  isPlaying?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onPlayPress?: () => void;
}

const BISMILLAH_REGEX = /^بِسْمِ(?:\s+[^\s]+){3}\s+(.+)/;

function stripBismillah(text: string, surahNumber: number, ayahNumber: number): string {
  if (ayahNumber !== 1 || surahNumber === 1 || surahNumber === 9) {
    return text;
  }
  const match = text.match(BISMILLAH_REGEX);
  if (match && match[1]) {
    return match[1].trim();
  }
  return text;
}

function arabicLineMetrics(fontSize: number) {
  return {
    lineHeight: Math.round(fontSize * 2.1),
    paddingBottom: Math.round(fontSize * 0.15),
  };
}

export const AyahRow = memo(function AyahRow({
  ayah,
  surahNumber,
  dariTranslation,
  pashtoTranslation,
  isPlaying = false,
  onPress,
  onLongPress,
  onPlayPress,
}: AyahRowProps) {
  const { theme, state } = useApp();
  const { isBookmarked, addBookmark, removeBookmark, getBookmark } = useBookmarks();

  const { dariFont, pashtoFont, arabicFontSize, translationFontSize, showTranslation } = state.preferences;
  const dariFontFamily = getDariFontFamily(dariFont);
  const pashtoFontFamily = getPashtoFontFamily(pashtoFont);
  const quranFontFamily = getQuranFontFamily(state.preferences.quranFont);
  const bookmarked = isBookmarked(surahNumber, ayah.number);
  const arabicSize = Typography.arabic[arabicFontSize];
  const translationSize = Typography.translation[translationFontSize];
  const arabicMetrics = arabicLineMetrics(arabicSize);

  const handleBookmarkPress = () => {
    if (bookmarked) {
      const bookmark = getBookmark(surahNumber, ayah.number);
      if (bookmark) {
        removeBookmark(bookmark.id);
      }
    } else {
      addBookmark({
        surahNumber,
        ayahNumber: ayah.number,
        page: ayah.page,
      });
    }
  };

  const renderTranslation = (text: string | undefined, lang: 'dari' | 'pashto') => {
    if (!text || text.trim() === '') return null;

    const fontFamily = lang === 'dari' ? dariFontFamily : pashtoFontFamily;
    return (
      <View style={styles.translationContainer}>
        <QuranText style={[styles.translationLabel, { color: theme.textSecondary, fontFamily }]}>
          {lang === 'dari' ? 'فارسی (دری)' : 'پښتو'}
        </QuranText>
        <QuranText
          style={[
            styles.translationText,
            {
              color: theme.translationText,
              fontSize: translationSize,
              fontFamily,
              lineHeight: Math.round(translationSize * 1.65),
            },
          ]}
        >
          {text}
        </QuranText>
      </View>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: isPlaying ? `${theme.playing}15` : theme.card,
          borderColor: isPlaying ? theme.playing : theme.cardBorder,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.ayahBadge, { backgroundColor: theme.ayahNumber }]}>
        <Text style={styles.ayahNumber}>{toArabicNumerals(ayah.number)}</Text>
      </View>

      <View style={styles.arabicContainer}>
        <QuranText
          allowFontScaling={false}
          textBreakStrategy="simple"
          lineBreakStrategyIOS="none"
          style={[
            styles.arabicText,
            {
              fontFamily: quranFontFamily,
              color: theme.arabicText,
              fontSize: arabicSize,
              lineHeight: arabicMetrics.lineHeight,
              paddingBottom: arabicMetrics.paddingBottom,
            },
          ]}
        >
          {stripBismillah(stripQuranicMarks(ayah.text, state.preferences.quranFont), surahNumber, ayah.number)}
        </QuranText>
      </View>

      {showTranslation !== 'none' && (
        <View style={[styles.translationsWrapper, { borderTopColor: theme.divider }]}>
          {(showTranslation === 'dari' || showTranslation === 'both') &&
            renderTranslation(dariTranslation, 'dari')}
          {(showTranslation === 'pashto' || showTranslation === 'both') &&
            renderTranslation(pashtoTranslation, 'pashto')}
        </View>
      )}

      <View style={[styles.actionBar, { borderTopColor: theme.divider }]}>
        <Pressable
          onPress={onPlayPress}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
        >
          <MaterialIcons
            name={isPlaying ? 'pause-circle-filled' : 'play-circle-filled'}
            size={24}
            color={isPlaying ? theme.playing : theme.icon}
          />
        </Pressable>

        <Pressable
          onPress={handleBookmarkPress}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
        >
          <MaterialIcons
            name={bookmarked ? 'bookmark' : 'bookmark-border'}
            size={24}
            color={bookmarked ? theme.bookmark : theme.icon}
          />
        </Pressable>

        <View style={styles.metaInfo}>
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>
            صفحه {toArabicNumerals(ayah.page)} • جز {toArabicNumerals(ayah.juz)}
          </Text>
        </View>
      </View>

      {ayah.sajda && (
        <View style={[styles.sajdaIndicator, { backgroundColor: theme.tint }]}>
          <Text style={styles.sajdaText}>سجده</Text>
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ayahBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  ayahNumber: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Vazirmatn',
  },
  arabicContainer: {
    paddingTop: 50,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  arabicText: {
    textAlign: 'center',
    writingDirection: 'rtl',
    width: '100%',
  },
  translationsWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  translationContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    alignItems: 'center',
    width: '100%',
  },
  translationLabel: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    textAlign: 'center',
    width: '100%',
  },
  translationText: {
    textAlign: 'center',
    writingDirection: 'rtl',
    width: '100%',
  },
  actionBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  actionButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  metaInfo: {
    flex: 1,
    alignItems: 'center',
  },
  metaText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
  sajdaIndicator: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  sajdaText: {
    color: '#fff',
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn-Bold',
  },
});
