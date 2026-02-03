/**
 * Custom font hook for Quran, Dari, and Pashto fonts
 * Returns the correct font family based on user preferences
 */

import { QuranFonts, DariFonts, PashtoFonts, QuranFontFamily, DariFontFamily, PashtoFontFamily } from '@/constants/theme';

/**
 * Get the actual font family name for Quran text
 */
export function getQuranFontFamily(fontKey: QuranFontFamily): string {
  return QuranFonts[fontKey]?.name || 'QuranFont';
}

/**
 * Get Scheherazade (Uthmani Taha) font for Quran
 */
export function getUthmaniFont(): string {
  return 'ScheherazadeNew';
}

/**
 * Get the actual font family name for Dari text
 */
export function getDariFontFamily(fontKey: DariFontFamily): string {
  return DariFonts[fontKey]?.name || 'Vazirmatn';
}

/**
 * Get the actual font family name for Pashto text
 */
export function getPashtoFontFamily(fontKey: PashtoFontFamily): string {
  return PashtoFonts[fontKey]?.name || 'Amiri';
}

/**
 * Get font display names for UI
 */
export function getFontDisplayNames() {
  return {
    quran: Object.entries(QuranFonts).map(([key, value]) => ({
      id: key as QuranFontFamily,
      name: value.displayName,
      nameDari: value.displayNameDari,
    })),
    dari: Object.entries(DariFonts).map(([key, value]) => ({
      id: key as DariFontFamily,
      name: value.displayName,
      nameDari: value.displayNameDari,
    })),
    pashto: Object.entries(PashtoFonts).map(([key, value]) => ({
      id: key as PashtoFontFamily,
      name: value.displayName,
      namePashto: value.displayNamePashto,
    })),
  };
}

/**
 * RTL text styles for Arabic, Dari, and Pashto
 */
export const RTL_TEXT_STYLE = {
  textAlign: 'right' as const,
  writingDirection: 'rtl' as const,
};
