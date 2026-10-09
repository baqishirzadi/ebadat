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

// Some source entries join the coordinate directly to the first Pashto word
// (for example, `2-2دا`). Stop before another digit or hyphen so a prefix
// such as `2-20` or a malformed chained coordinate cannot match `2-2`.
const PASHTO_AYAH_REFERENCE_REGEX = /^[\s\u200e\u200f\u202a-\u202e]*(\d{1,3})\s*-\s*(\d{1,4})(?=[^\d-]|$)\s*/;

/**
 * Hide the source's leading surah-ayah coordinate only when it points to this
 * exact verse. Some imported Pashto lines contain stale coordinates, so those
 * remain visible for review instead of silently deleting translation text.
 */
export function stripPashtoAyahReference(
  text: string,
  surahNumber: number,
  ayahNumber: number,
): string {
  const match = text.match(PASHTO_AYAH_REFERENCE_REGEX);
  if (!match || Number(match[1]) !== surahNumber || Number(match[2]) !== ayahNumber) {
    return text;
  }
  return text.slice(match[0].length);
}
