/**
 * Quran text utilities
 * Strips Quranic annotation marks (waqf signs) that render as black circles in some fonts.
 * Removes U+06D6-U+06ED. Does NOT touch core letters or standard harakat.
 */
const QURANIC_MARKS_REGEX = /[\u06D6-\u06ED]/g;

/** Remove optional waqf markers. Core Uthmani text unchanged. */
export function stripQuranicMarks(text: string, _quranFont?: string): string {
  return text.replace(QURANIC_MARKS_REGEX, '');
}
