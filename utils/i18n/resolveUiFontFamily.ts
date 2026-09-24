import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import type { DariFontFamily, PashtoFontFamily } from '@/constants/theme';
import { getDariFontFamily, getPashtoFontFamily } from '@/hooks/useFonts';
import type { AppLanguage } from '@/types/quran';

export type UiLanguage = AppLanguage;

export interface UiFontPreferences {
  dariFont?: DariFontFamily;
  pashtoFont?: PashtoFontFamily;
}

const APP_UI_FONTS = new Set([
  'Vazirmatn',
  'Vazirmatn-Bold',
  'Amiri',
  'Amiri-Bold',
  'NotoNastaliqUrdu',
]);

/**
 * True when a style belongs to the app's own UI typography rather than a
 * purpose-built face. Quran and calligraphic text opt out of UI-level
 * treatment such as font swapping and digit localization.
 */
export function isAppUiFontStyle(style: StyleProp<TextStyle>): boolean {
  const requested = StyleSheet.flatten(style)?.fontFamily;
  return !requested || APP_UI_FONTS.has(requested);
}

function isBoldRequest(flattened: TextStyle | undefined, requested: string | undefined): boolean {
  const requestedBold = requested?.endsWith('-Bold') ?? false;
  const weight = flattened?.fontWeight;
  const numericWeight = typeof weight === 'number' ? weight : Number.parseInt(weight ?? '400', 10);
  return requestedBold || weight === 'bold' || (Number.isFinite(numericWeight) && numericWeight >= 600);
}

/**
 * Resolve app-owned text to the user's selected language font while leaving
 * purpose-built families (notably Quran/Mushaf fonts) untouched. Legacy
 * styles that name a Dari font are treated as app UI styles, not overrides.
 *
 * English returns `undefined`, which renders in the platform system face
 * (San Francisco / Roboto) — the Perso-Arabic UI fonts have poor Latin metrics.
 */
export function resolveUiFontFamily(
  style: StyleProp<TextStyle>,
  language: UiLanguage,
  preferences?: UiFontPreferences | null,
): string | undefined {
  const flattened = StyleSheet.flatten(style);
  const requested = flattened?.fontFamily;

  if (requested && !APP_UI_FONTS.has(requested)) return requested;

  const isBold = isBoldRequest(flattened, requested);

  if (language === 'english') return undefined;

  if (language === 'pashto') {
    const font = getPashtoFontFamily(preferences?.pashtoFont ?? 'amiri');
    return isBold && font === 'Amiri' ? 'Amiri-Bold' : font;
  }

  const font = getDariFontFamily(preferences?.dariFont ?? 'vazirmatn');
  return isBold ? `${font}-Bold` : font;
}

/**
 * Font fragment to spread onto a Text style.
 *
 * Weight has to travel with the family: Dari/Pashto encode boldness in the
 * family name (`Vazirmatn-Bold`), whereas the English system face needs an
 * explicit `fontWeight` to render bold at all.
 */
export function resolveUiFontStyle(
  style: StyleProp<TextStyle>,
  language: UiLanguage,
  preferences?: UiFontPreferences | null,
): TextStyle {
  const fontFamily = resolveUiFontFamily(style, language, preferences);

  if (language !== 'english') return { fontFamily };

  const flattened = StyleSheet.flatten(style);
  const requested = flattened?.fontFamily;
  if (requested && !APP_UI_FONTS.has(requested)) return { fontFamily };

  return {
    fontFamily: undefined,
    fontWeight: isBoldRequest(flattened, requested) ? '700' : flattened?.fontWeight,
  };
}
