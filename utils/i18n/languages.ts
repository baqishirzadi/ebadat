/**
 * Single source of truth for the languages the app ships in.
 *
 * Every language-dependent decision (direction, digits, fonts, date locale,
 * JSON locale file, content fallback) is derived from this registry so screens
 * never have to branch on a language code by hand.
 */

import type { AppLanguage } from '@/types/quran';

export type TextDirection = 'rtl' | 'ltr';
export type DigitSystem = 'arabic' | 'latin';
export type LocaleFileCode = 'fa' | 'ps' | 'en' | 'tr' | 'ar';
export type FieldSuffix = 'dari' | 'pashto' | 'english' | 'turkish' | 'arabic';

export interface LanguageDefinition {
  code: AppLanguage;
  /** BCP-47 tag for Intl date/time formatting. */
  locale: string;
  direction: TextDirection;
  digits: DigitSystem;
  /** Endonym, shown in the language picker in its own script. */
  nativeLabel: string;
  /** Latin label, used in English UI and in developer-facing output. */
  latinLabel: string;
  /** Short code used by `locales/<code>.json`. */
  fileCode: LocaleFileCode;
  /** Field suffix used by bilingual content records (`title_dari`, ...). */
  fieldSuffix: FieldSuffix;
  /**
   * Latin-script languages follow the English layout (system font, LTR).
   * Arabic-script languages other than Pashto follow the Dari font.
   */
  script: 'latin' | 'arabic' | 'pashto';
}

export const APP_LANGUAGES: Record<AppLanguage, LanguageDefinition> = {
  dari: {
    code: 'dari',
    locale: 'fa-AF',
    direction: 'rtl',
    digits: 'arabic',
    nativeLabel: 'دری',
    latinLabel: 'Dari',
    fileCode: 'fa',
    fieldSuffix: 'dari',
    script: 'arabic',
  },
  pashto: {
    code: 'pashto',
    locale: 'ps-AF',
    direction: 'rtl',
    digits: 'arabic',
    nativeLabel: 'پښتو',
    latinLabel: 'Pashto',
    fileCode: 'ps',
    fieldSuffix: 'pashto',
    script: 'pashto',
  },
  arabic: {
    code: 'arabic',
    locale: 'ar',
    direction: 'rtl',
    digits: 'arabic',
    nativeLabel: 'العربية',
    latinLabel: 'Arabic',
    fileCode: 'ar',
    fieldSuffix: 'arabic',
    script: 'arabic',
  },
  turkish: {
    code: 'turkish',
    locale: 'tr',
    direction: 'ltr',
    digits: 'latin',
    nativeLabel: 'Türkçe',
    latinLabel: 'Turkish',
    fileCode: 'tr',
    fieldSuffix: 'turkish',
    script: 'latin',
  },
  english: {
    code: 'english',
    locale: 'en',
    direction: 'ltr',
    digits: 'latin',
    nativeLabel: 'English',
    latinLabel: 'English',
    fileCode: 'en',
    fieldSuffix: 'english',
    script: 'latin',
  },
};

/** Display order for pickers: Afghan languages, then Arabic, Turkish and English. */
export const APP_LANGUAGE_ORDER: readonly AppLanguage[] = ['dari', 'pashto', 'arabic', 'turkish', 'english'];

export const DEFAULT_APP_LANGUAGE: AppLanguage = 'dari';

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'dari' || value === 'pashto' || value === 'english' || value === 'turkish' || value === 'arabic';
}

export function getLanguage(language: AppLanguage): LanguageDefinition {
  return APP_LANGUAGES[language] ?? APP_LANGUAGES[DEFAULT_APP_LANGUAGE];
}

export function isRtlLanguage(language: AppLanguage): boolean {
  return getLanguage(language).direction === 'rtl';
}

/** English and Turkish share LTR layout, Latin digits and the system font. */
export function isLatinLanguage(language: AppLanguage): boolean {
  return getLanguage(language).script === 'latin';
}

export function getTextDirection(language: AppLanguage): TextDirection {
  return getLanguage(language).direction;
}

export function getLocaleTag(language: AppLanguage): string {
  return getLanguage(language).locale;
}

export function getLocaleFileCode(language: AppLanguage): LocaleFileCode {
  return getLanguage(language).fileCode;
}

/**
 * Order in which to look for a translated content record.
 *
 * Religious content is authored per language and can lag behind the UI, so a
 * missing entry falls back to a language the reader is most likely to follow
 * rather than rendering an empty block. Dari is the app's editorial base.
 * Turkish falls back through English; Arabic falls back through Dari.
 */
const CONTENT_FALLBACK: Record<AppLanguage, readonly AppLanguage[]> = {
  dari: ['dari', 'pashto', 'english'],
  pashto: ['pashto', 'dari', 'english'],
  english: ['english', 'dari', 'pashto'],
  turkish: ['turkish', 'english', 'dari'],
  arabic: ['arabic', 'dari', 'pashto'],
};

export function contentFallbackChain(language: AppLanguage): readonly AppLanguage[] {
  return CONTENT_FALLBACK[language] ?? CONTENT_FALLBACK[DEFAULT_APP_LANGUAGE];
}

/** App language stored with preferences, for notifications scheduled outside React. */
export async function readPersistedAppLanguage(): Promise<AppLanguage> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem('@ebadat/preferences');
    const language = raw ? (JSON.parse(raw) as { appLanguage?: unknown }).appLanguage : null;
    if (isAppLanguage(language)) return language;
  } catch {
    // Fall through to the editorial default.
  }
  return DEFAULT_APP_LANGUAGE;
}
