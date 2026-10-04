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

  const renderTranslation = (text: string | undefined, lang: 'dari' | 'pashto' | 'english') => {
    if (!text || text.trim() === '') return null;

    const fontFamily = lang === 'pashto' ? pashtoFontFamily : lang === 'dari' ? dariFontFamily : undefined;
    return (
      <View style={styles.translationContainer}>
        <QuranText
          style={[
            styles.translationText,
            lang === 'english' && styles.translationTextEnglish,
            {
              color: translationColor,
              fontSize: translationSize,
              fontFamily,
              lineHeight: Math.round(translationSize * Math.max(1.5, lineHeightRatio - 0.45)),
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
          backgroundColor: isPlaying ? `${theme.playing}10` : 'transparent',
          borderBottomColor: dividerColor,
          borderStartColor: isPlaying ? theme.playing : 'transparent',
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
                color: readerTokens?.accent ?? theme.tint,
                fontFamily: quranFontFamily,
                fontSize: Math.round(arabicSize * 0.72),
              },
            ]}
          >
            {' '}﴿{toArabicNumerals(ayah.number)}﴾
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
          ) : (
            renderTranslation(dariTranslation, 'dari')
          )}
        </View>
      )}

      <View style={[styles.actionBar, rowStyle(language)]}>
        <Pressable
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

        <View style={styles.metaInfo}>
          <Text style={[styles.metaText, { color: readerTokens?.textSecondary ?? theme.textSecondary }]}>
            صفحه {toArabicNumerals(ayah.page)} • جز {toArabicNumerals(ayah.juz)}
          </Text>
        </View>
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
    marginHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderStartWidth: 3,
  },
  arabicContainer: {
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.xs,
    alignItems: 'stretch',
    width: '100%',
  },
  arabicText: {
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  ayahMarker: {
    fontWeight: '600',
  },
  translationsWrapper: {
    paddingHorizontal: Spacing.xs,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  translationContainer: {
    paddingVertical: Spacing.xs,
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
