import React from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { useLocalizedFontPreferences } from '@/context/AppContext';
import { resolveUiFontFamily, resolveUiFontStyle } from '@/utils/i18n/resolveUiFontFamily';
import type { ArticleLanguage } from '@/types/articles';

export type ArticleTextAlign = 'justify' | 'start' | 'center';

interface ArticleTextProps extends TextProps {
  /** Language of the article, which picks the font (not the app language). */
  language: ArticleLanguage;
  align?: ArticleTextAlign;
}

/*
 * React Native on iOS swaps `textAlign: 'right'` to left whenever the layout
 * direction is RTL, so right-aligned paragraphs end up on the wrong edge.
 * 'auto' (natural) and 'justify' follow the RTL base writing direction instead,
 * which puts line starts and the last line of a paragraph on the right.
 */
const ALIGN_STYLE: Record<ArticleTextAlign, TextStyle> = {
  justify: { textAlign: 'justify', writingDirection: 'rtl' },
  start: { textAlign: 'auto', writingDirection: 'rtl' },
  center: { textAlign: 'center', writingDirection: 'rtl' },
};

/*
 * Justified RTL lines in Naskh fonts are sometimes laid out about one space
 * width past the start edge, and the text view clips the first glyph. A
 * padding/negative-margin bleed keeps that glyph inside the view without
 * moving the text column.
 */
function justifyBleed(style: TextProps['style']): TextStyle {
  const fontSize = StyleSheet.flatten(style)?.fontSize ?? 17;
  const bleed = Math.ceil(fontSize * 0.45);
  return { paddingHorizontal: bleed, marginHorizontal: -bleed };
}

export function ArticleText({ language, align = 'start', style, children, ...props }: ArticleTextProps) {
  const fonts = useLocalizedFontPreferences();
  return (
    <Text
      {...props}
      style={[ALIGN_STYLE[align], align === 'justify' && justifyBleed(style), style, resolveUiFontStyle(style, language, fonts)]}
    >
      {children}
    </Text>
  );
}

/** Nastaliq needs far more line height than Naskh or Vazirmatn. */
export function useArticleUsesNastaliq(language: ArticleLanguage): boolean {
  const fonts = useLocalizedFontPreferences();
  return resolveUiFontFamily(undefined, language, fonts) === 'NotoNastaliqUrdu';
}
