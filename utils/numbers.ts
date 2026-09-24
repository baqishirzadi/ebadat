/**
 * Numeral formatting.
 *
 * Dari and Pashto render Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) to match the Quran
 * text; English renders Latin digits. Prefer the language-aware helpers in new
 * code — `toArabicNumerals`/`toArabicNumeralsString` are unconditional and stay
 * for Arabic-script surfaces (Mushaf, Quran markers) that never switch.
 */

import type { AppLanguage } from '@/types/quran';
import { getLanguage } from '@/utils/i18n/languages';

const ARABIC_NUMERALS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Arabic-Indic and Extended Arabic-Indic (Persian) digits, in value order. */
const NON_LATIN_DIGITS = /[٠-٩۰-۹]/g;

function toLatinDigit(character: string): string {
  const code = character.charCodeAt(0);
  if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
  if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
  return character;
}

/**
 * Convert a number to Arabic-Indic numerals
 */
export function toArabicNumerals(num: number): string {
  return num.toString().split('').map(d => ARABIC_NUMERALS[parseInt(d, 10)]).join('');
}

/**
 * Convert a string (e.g. time "12:30") to use Arabic-Indic numerals
 */
export function toArabicNumeralsString(str: string): string {
  return str.replace(/\d/g, d => ARABIC_NUMERALS[parseInt(d, 10)]);
}

/** Convert any Arabic-Indic or Persian digits in a string back to Latin. */
export function toLatinNumeralsString(str: string): string {
  return str.replace(NON_LATIN_DIGITS, toLatinDigit);
}

/** Format a number using the digit system of the active language. */
export function formatNumber(value: number, language: AppLanguage): string {
  return getLanguage(language).digits === 'latin'
    ? value.toString()
    : toArabicNumerals(value);
}

/**
 * Rewrite every digit in a string to the active language's digit system.
 *
 * Safe in both directions, so it also normalizes copy that still hardcodes
 * Arabic-Indic digits when the reader has switched to English.
 */
export function localizeDigits(text: string, language: AppLanguage): string {
  return getLanguage(language).digits === 'latin'
    ? toLatinNumeralsString(text)
    : toArabicNumeralsString(toLatinNumeralsString(text));
}
