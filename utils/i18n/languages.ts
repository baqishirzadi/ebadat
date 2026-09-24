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
  fileCode: 'fa' | 'ps' | 'en';
  /** Field suffix used by bilingual content records (`title_dari`, ...). */
  fieldSuffix: 'dari' | 'pashto' | 'english';
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
  },
};

/** Display order for pickers: the two Afghan languages first. */
export const APP_LANGUAGE_ORDER: readonly AppLanguage[] = ['dari', 'pashto', 'english'];

export const DEFAULT_APP_LANGUAGE: AppLanguage = 'dari';

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'dari' || value === 'pashto' || value === 'english';
}

export function getLanguage(language: AppLanguage): LanguageDefinition {
  return APP_LANGUAGES[language] ?? APP_LANGUAGES[DEFAULT_APP_LANGUAGE];
}

export function isRtlLanguage(language: AppLanguage): boolean {
  return getLanguage(language).direction === 'rtl';
}

export function getTextDirection(language: AppLanguage): TextDirection {
  return getLanguage(language).direction;
}

export function getLocaleTag(language: AppLanguage): string {
  return getLanguage(language).locale;
}

export function getLocaleFileCode(language: AppLanguage): 'fa' | 'ps' | 'en' {
  return getLanguage(language).fileCode;
}

/**
 * Order in which to look for a translated content record.
 *
 * Religious content is authored per language and can lag behind the UI, so a
 * missing entry falls back to a language the reader is most likely to follow
 * rather than rendering an empty block. Dari is the app's editorial base, so
 * both other languages fall back to it first.
 */
const CONTENT_FALLBACK: Record<AppLanguage, readonly AppLanguage[]> = {
  dari: ['dari', 'pashto', 'english'],
  pashto: ['pashto', 'dari', 'english'],
  english: ['english', 'dari', 'pashto'],
};

export function contentFallbackChain(language: AppLanguage): readonly AppLanguage[] {
  return CONTENT_FALLBACK[language] ?? CONTENT_FALLBACK[DEFAULT_APP_LANGUAGE];
}
