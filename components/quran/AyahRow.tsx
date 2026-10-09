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
import { getArabicFontFamily, getDariFontFamily, getPashtoFontFamily, getQuranFontFamily } from '@/hooks/useFonts';
import { Ayah } from '@/types/quran';
import { stripPashtoAyahReference, stripQuranicMarks } from '@/utils/quranText';
import { rowStyle } from '@/utils/i18n/direction';
import { QuranText } from './QuranText';
import { toArabicNumerals } from '@/utils/numbers';
import type { QuranReaderTokens } from '@/hooks/useQuranReaderSettings';
import { useI18n } from '@/utils/i18n/useI18n';

interface AyahRowProps {
  ayah: Ayah;
  surahNumber: number;
  dariTranslation?: string;
  pashtoTranslation?: string;
  englishTranslation?: string;
  turkishTranslation?: string;
  arabicTranslation?: string;
  isPlaying?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onPlayPress?: () => void;
  readerTokens?: QuranReaderTokens;
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

export const AyahRow = memo(function AyahRow({
  ayah,
  surahNumber,
  dariTranslation,
  pashtoTranslation,
  englishTranslation,
  turkishTranslation,
  arabicTranslation,
  isPlaying = false,
  onPress,
  onLongPress,
  onPlayPress,
  readerTokens,
}: AyahRowProps) {
  const { theme, state } = useApp();
  const { t } = useI18n();
  const language = state.preferences.appLanguage;
  const { isBookmarked, addBookmark, removeBookmark, getBookmark } = useBookmarks();

  const { dariFont, pashtoFont, arabicFontSize, translationFontSize, showTranslation } = state.preferences;
  const dariFontFamily = getDariFontFamily(dariFont);
  const pashtoFontFamily = getPashtoFontFamily(pashtoFont);
  const quranFontFamily = getQuranFontFamily(state.preferences.quranFont);
  const bookmarked = isBookmarked(surahNumber, ayah.number);
  const arabicSize = Typography.arabic[arabicFontSize];
  const translationSize = Typography.translation[translationFontSize];
  const lineHeightRatio = readerTokens?.lineHeightRatio ?? 2.1;
  const arabicLineHeight = Math.round(arabicSize * lineHeightRatio);
  const arabicColor = readerTokens?.arabic ?? theme.arabicText;
  const translationColor = readerTokens?.translation ?? theme.translationText;
  const dividerColor = readerTokens?.divider ?? theme.divider;

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

  const renderTranslation = (text: string | undefined, lang: 'dari' | 'pashto' | 'english' | 'turkish' | 'arabic') => {
    if (!text || text.trim() === '') return null;

    const latin = lang === 'english' || lang === 'turkish';
    const fontFamily = lang === 'pashto'
      ? pashtoFontFamily
      : lang === 'arabic'
        ? getArabicFontFamily()
        : lang === 'dari'
          ? dariFontFamily
          : undefined;
    const displayText = lang === 'pashto'
      ? stripPashtoAyahReference(text, surahNumber, ayah.number)
      : text;
    return (
      <View style={styles.translationContainer}>
        <QuranText
          testID={lang === 'pashto' ? `quran-pashto-translation-${surahNumber}-${ayah.number}` : undefined}
          style={[
            styles.translationText,
            latin && styles.translationTextEnglish,
            {
              color: translationColor,
              fontSize: translationSize,
              fontFamily,
              // Naskh and Amiri marks clip on Android below about 1.55.
              lineHeight: Math.round(translationSize * (latin ? 1.35 : 1.55)),
            },
          ]}
        >
          {displayText}
        </QuranText>
      </View>
    );
  };

  return (
    <Pressable
      testID={`quran-ayah-row-${surahNumber}-${ayah.number}`}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: isPlaying ? `${readerTokens?.accent ?? theme.playing}12` : 'transparent',
          borderColor: isPlaying ? `${readerTokens?.accent ?? theme.playing}72` : 'transparent',
          borderWidth: isPlaying ? 1 : 0,
          borderBottomWidth: isPlaying ? 1 : StyleSheet.hairlineWidth,
          borderBottomColor: isPlaying ? `${readerTokens?.accent ?? theme.playing}72` : dividerColor,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.arabicContainer}>
        <QuranText
          allowFontScaling={false}
          textBreakStrategy="simple"
          lineBreakStrategyIOS="none"
          style={[
            styles.arabicText,
            {
              fontFamily: quranFontFamily,
              color: arabicColor,
              includeFontPadding: true,
              fontSize: arabicSize,
              lineHeight: arabicLineHeight,
              paddingBottom: Math.round(arabicSize * 0.15),
            },
          ]}
        >
          {stripBismillah(stripQuranicMarks(ayah.text, state.preferences.quranFont), surahNumber, ayah.number)}
          <Text
            style={[
              styles.ayahMarker,
              {
                color: arabicColor,
                fontFamily: quranFontFamily,
                fontSize: Math.round(arabicSize * 0.72),
              },
            ]}
          >
            {state.preferences.quranFont === 'qpcHafs'
              ? ` ${toArabicNumerals(ayah.number)}`
              : ` ﴿${toArabicNumerals(ayah.number)}﴾`}
          </Text>
        </QuranText>
      </View>

      {showTranslation !== 'none' && (
        <View style={[styles.translationsWrapper, { borderTopColor: dividerColor }]}>
          {showTranslation === 'both' ? (
            <>
              {renderTranslation(dariTranslation, 'dari')}
              {renderTranslation(pashtoTranslation, 'pashto')}
            </>
          ) : showTranslation === 'pashto' ? (
            renderTranslation(pashtoTranslation, 'pashto')
          ) : showTranslation === 'english' ? (
            renderTranslation(englishTranslation, 'english')
          ) : showTranslation === 'turkish' ? (
            renderTranslation(turkishTranslation, 'turkish')
          ) : showTranslation === 'arabic' ? (
            renderTranslation(arabicTranslation, 'arabic')
          ) : (
            renderTranslation(dariTranslation, 'dari')
          )}
        </View>
      )}

      <View style={[styles.actionBar, rowStyle(language)]}>
        <Pressable
          testID={`quran-play-ayah-${surahNumber}-${ayah.number}`}
          onPress={onPlayPress}
          accessibilityRole="button"
          accessibilityLabel={t('quran.reader.play')}
          hitSlop={6}
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
          accessibilityRole="button"
          accessibilityLabel={bookmarked ? t('quran.reader.unbookmark') : t('quran.reader.bookmark')}
          hitSlop={6}
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

      </View>

      {ayah.sajda && (
        <View style={[styles.sajdaIndicator, { backgroundColor: readerTokens?.accent ?? theme.tint }]}>
          <Text style={styles.sajdaText}>سجده</Text>
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: BorderRadius.md,
  },
  arabicContainer: {
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.xs,
    alignItems: 'stretch',
    width: '100%',
  },
  arabicText: {
    textAlign: 'center',
    writingDirection: 'rtl',
    width: '100%',
  },
  ayahMarker: {
    fontWeight: '600',
  },
  translationsWrapper: {
    paddingHorizontal: Spacing.xs,
    paddingTop: Spacing.xs,
    marginTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  translationContainer: {
    paddingVertical: 2,
    alignItems: 'stretch',
    width: '100%',
  },
  translationText: {
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  translationTextEnglish: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  actionBar: {
    minHeight: 40,
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  actionButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  sajdaIndicator: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    marginStart: Spacing.xs,
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
