/**
 * Unified number formatting for RTL languages (Arabic, Dari, Pashto)
 * Uses Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) for consistency with Quran text
 */

const ARABIC_NUMERALS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

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
