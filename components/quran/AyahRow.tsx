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
import { getQuranFontFamily, getDariFontFamily, getPashtoFontFamily } from '@/hooks/useFonts';
import { Ayah } from '@/types/quran';
import { stripQuranicMarks } from '@/utils/quranText';
import CenteredText from '@/components/CenteredText';
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

// Regex pattern to match Bismillah structure: بِسْمِ followed by 3 word groups (الله, الرحمن, الرحيم)
// Pattern matches: بِسْمِ + [word1] + [word2] + [word3] + space, then captures the actual ayah content
const BISMILLAH_REGEX = /^بِسْمِ(?:\s+[^\s]+){3}\s+(.+)/;

// Strip Bismillah from ayah text if it's the first ayah (not for surah 1 and 9)
function stripBismillah(text: string, surahNumber: number, ayahNumber: number): string {
  // Only for ayah 1 of surahs 2-8 and 10-114
  if (ayahNumber !== 1 || surahNumber === 1 || surahNumber === 9) {
    return text;
  }
  
  // Use regex to match Bismillah structure and extract the actual ayah content
  const match = text.match(BISMILLAH_REGEX);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Return original if pattern doesn't match (safety fallback)
  return text;
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
  
  const { quranFont, dariFont, pashtoFont, arabicFontSize, translationFontSize, showTranslation } = state.preferences;
  const quranFontFamily = getQuranFontFamily(quranFont);
  const dariFontFamily = getDariFontFamily(dariFont);
  const pashtoFontFamily = getPashtoFontFamily(pashtoFont);
  const bookmarked = isBookmarked(surahNumber, ayah.number);

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
    // Don't render if text is empty, undefined, or just whitespace
    if (!text || text.trim() === '') return null;
    
    const fontFamily = lang === 'dari' ? dariFontFamily : pashtoFontFamily;
    return (
      <View style={styles.translationContainer}>
        <CenteredText style={[styles.translationLabel, { color: theme.textSecondary, fontFamily }]}>
          {lang === 'dari' ? 'دری' : 'پښتو'}
        </CenteredText>
        <CenteredText
          style={[
            styles.translationText,
            {
              color: theme.translationText,
              fontSize: Typography.translation[translationFontSize],
              fontFamily,
            },
          ]}
        >
          {text}
        </CenteredText>
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
      {/* Ayah Number Badge */}
      <View style={[styles.ayahBadge, { backgroundColor: theme.ayahNumber }]}>
        <Text style={styles.ayahNumber}>{toArabicNumerals(ayah.number)}</Text>
      </View>

      {/* Arabic Text - CENTERED (Bismillah stripped from ayah 1 since it's in header) */}
      <View style={styles.arabicContainer}>
        <CenteredText
          style={[
            styles.arabicText,
            {
              fontFamily: quranFontFamily,
              color: theme.arabicText,
              fontSize: Typography.arabic[arabicFontSize],
            },
          ]}
        >
          {stripBismillah(stripQuranicMarks(ayah.text, quranFont), surahNumber, ayah.number)}
        </CenteredText>
      </View>

      {/* Translations */}
      {showTranslation !== 'none' && (
        <View style={styles.translationsWrapper}>
          {(showTranslation === 'dari' || showTranslation === 'both') &&
            renderTranslation(dariTranslation, 'dari')}
          {(showTranslation === 'pashto' || showTranslation === 'both') &&
            renderTranslation(pashtoTranslation, 'pashto')}
        </View>
      )}

      {/* Action Bar */}
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

      {/* Sajda Indicator */}
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
    left: Spacing.sm,
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
    paddingTop: 50, // Extra top padding for ayah number
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  arabicText: {
    textAlign: 'center', // CENTERED for better display
    lineHeight: 68, // Reduced from 85 - balanced spacing, prevents text cut-off
    writingDirection: 'rtl',
    letterSpacing: 1, // Spacing for diacritics not to overlap
    includeFontPadding: false, // Android: prevent extra padding
    paddingBottom: 6, // Prevents text cut-off at bottom
  },
  translationsWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  translationContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  translationLabel: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    textAlign: 'center', // CENTERED
    marginBottom: Spacing.xs,
  },
  translationText: {
    textAlign: 'center', // CENTERED
    lineHeight: 28,
    writingDirection: 'rtl',
  },
  actionBar: {
    flexDirection: 'row-reverse', // RTL layout
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
    alignItems: 'flex-start', // Changed for RTL
    paddingLeft: Spacing.sm,
  },
  metaText: {
    fontSize: Typography.ui.caption,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: 'Vazirmatn',
  },
  sajdaIndicator: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm, // Moved to right for RTL
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  sajdaText: {
    color: '#fff',
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
});
