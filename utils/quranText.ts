/**
 * Quran text utilities
 * Strips Quranic annotation marks (waqf signs) that render as black circles in some fonts.
 * Only removes U+06D6–U+06DE. Does NOT touch harakat, shadda, sukun, or core letters.
 */
const QURANIC_MARKS_REGEX = /[\u06D6-\u06DE]/g;

/** Remove optional waqf markers. Core Uthmani text unchanged. */
export function stripQuranicMarks(text: string, _quranFont?: string): string {
  return text.replace(QURANIC_MARKS_REGEX, '');
}
