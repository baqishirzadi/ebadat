/**
 * Language-aware Quran search normalization.
 * Shared by the runtime search engine and build/verify scripts.
 */

export type SearchLanguage = 'arabic' | 'dari' | 'pashto' | 'english';

const FORMAT_CONTROLS = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
const ARABIC_DIACRITICS = /[\u064B-\u065F\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;
const PUNCTUATION =
  /[\u060C\u061B\u061F\u06D4!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~،؛؟«»ـ…]/g;
const WHITESPACE = /[\s\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+/g;
const PASHTO_VERSE_PREFIX = /^\s*\d+\s*[-–—]\s*\d+\s*/;

/** Convert dagger alif to regular alif ( مالك ← مٰلك ). */
function foldDaggerAlif(text: string): string {
  return text.replace(/\u0670/g, 'ا');
}

/** Wasla / hamza variants → bare alif. */
function foldAlifVariants(text: string): string {
  return text
    .replace(/\u0671/g, 'ا') // ٱ wasla
    .replace(/[إأآٱ]/g, 'ا');
}

function foldYeKaf(text: string): string {
  return text
    .replace(/[يىېۍئ]/g, 'ی')
    .replace(/[كګ]/g, 'ک');
}

function foldTehMarbuta(text: string): string {
  return text.replace(/ة/g, 'ه').replace(/ؤ/g, 'و');
}

function stripPashtoPrefix(text: string): string {
  return text.replace(PASHTO_VERSE_PREFIX, '');
}

function commonNormalize(text: string): string {
  return text
    .normalize('NFC')
    .replace(FORMAT_CONTROLS, '')
    .replace(TATWEEL, '')
    .replace(PUNCTUATION, ' ')
    .replace(WHITESPACE, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Normalize Arabic Quran text for search (Uthmani and plain imlaei alike).
 */
export function normalizeArabicForSearch(text: string): string {
  if (!text) return '';
  let value = text.normalize('NFC');
  value = value.replace(FORMAT_CONTROLS, '');
  value = foldDaggerAlif(value);
  value = value.replace(ARABIC_DIACRITICS, '');
  value = foldAlifVariants(value);
  value = foldYeKaf(value);
  value = foldTehMarbuta(value);
  value = value.replace(TATWEEL, '');
  value = value.replace(PUNCTUATION, ' ');
  value = value.replace(WHITESPACE, ' ');
  return value.trim().toLowerCase();
}

/**
 * Alif-flexible Arabic form so typed الرحمن matches Uthmani الرحمان (dagger alif).
 * Also makes مالك / ملك interchangeable for search.
 */
export function compactArabicForSearch(text: string): string {
  const normalized = normalizeArabicForSearch(text);
  if (!normalized) return '';
  return normalized.replace(/ا/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Normalize Dari / Persian translation text.
 */
export function normalizeDariForSearch(text: string): string {
  if (!text) return '';
  let value = text.normalize('NFC');
  value = value.replace(FORMAT_CONTROLS, ' ');
  value = value.replace(ARABIC_DIACRITICS, '');
  value = foldAlifVariants(value);
  value = foldYeKaf(value);
  value = foldTehMarbuta(value);
  value = value.replace(TATWEEL, '');
  value = value.replace(PUNCTUATION, ' ');
  return commonNormalize(value);
}

/**
 * Normalize Pashto translation text (strips leading surah-ayah prefixes).
 */
export function normalizePashtoForSearch(text: string): string {
  if (!text) return '';
  let value = stripPashtoPrefix(text);
  value = value.normalize('NFC');
  value = value.replace(FORMAT_CONTROLS, ' ');
  value = value.replace(ARABIC_DIACRITICS, '');
  value = foldAlifVariants(value);
  value = foldYeKaf(value);
  value = foldTehMarbuta(value);
  value = value.replace(TATWEEL, '');
  value = value.replace(PUNCTUATION, ' ');
  return commonNormalize(value);
}

/** Clean Pashto for display (prefix removed, whitespace collapsed). */
export function cleanPashtoDisplay(text: string): string {
  if (!text) return '';
  return stripPashtoPrefix(text).replace(WHITESPACE, ' ').trim();
}

/**
 * Normalize English translation text (lowercase, strip punctuation, collapse spaces).
 * Does not alter Arabic/Dari/Pashto folding rules.
 */
export function normalizeEnglishForSearch(text: string): string {
  if (!text) return '';
  let value = text.normalize('NFC');
  value = value.replace(FORMAT_CONTROLS, ' ');
  value = value.replace(PUNCTUATION, ' ');
  value = value.replace(WHITESPACE, ' ');
  return value.trim().toLowerCase();
}

export function normalizeForLanguage(text: string, language: SearchLanguage): string {
  switch (language) {
    case 'arabic':
      return normalizeArabicForSearch(text);
    case 'dari':
      return normalizeDariForSearch(text);
    case 'pashto':
      return normalizePashtoForSearch(text);
    case 'english':
      return normalizeEnglishForSearch(text);
    default:
      return normalizeArabicForSearch(text);
  }
}

export function tokenizeNormalized(text: string): string[] {
  if (!text) return [];
  return text.split(' ').filter((token) => token.length > 0);
}

/**
 * Find highlight ranges of query tokens within original display text.
 * Returns character ranges in the original string (best-effort).
 */
export function findHighlightRanges(
  original: string,
  normalizedQuery: string,
  language: SearchLanguage,
): Array<{ start: number; end: number }> {
  if (!original || !normalizedQuery) return [];

  const ranges: Array<{ start: number; end: number }> = [];
  const queryTokens = tokenizeNormalized(normalizedQuery);
  if (queryTokens.length === 0) return ranges;

  // Build map from original indices → normalized stream
  const normChars: string[] = [];
  const origIndexForNorm: number[] = [];

  for (let i = 0; i < original.length; i += 1) {
    const slice = original.slice(i, i + 1);
    const nextNorm = normalizeForLanguage(slice, language);
    if (!nextNorm) continue;
    for (const ch of nextNorm) {
      if (ch === ' ' && normChars[normChars.length - 1] === ' ') continue;
      normChars.push(ch);
      origIndexForNorm.push(i);
    }
  }

  const haystack = normChars.join('').replace(/\s+/g, ' ').trim();
  // Rebuild with collapsed spaces tracking is complex; use simpler substring search on fully normalized original.
  const fullNorm = normalizeForLanguage(original, language);
  const phraseIndex = fullNorm.indexOf(normalizedQuery);
  if (phraseIndex >= 0) {
    // Approximate: highlight whole original when exact phrase matches.
    return [{ start: 0, end: original.length }];
  }

  for (const token of queryTokens) {
    if (token.length < 2) continue;
    const idx = fullNorm.indexOf(token);
    if (idx >= 0) {
      ranges.push({ start: 0, end: original.length });
      break;
    }
  }

  return ranges;
}

export function scoreMatch(
  normalizedField: string,
  normalizedQuery: string,
): number {
  if (!normalizedField || !normalizedQuery) return 0;

  if (normalizedField === normalizedQuery) return 1000;
  if (normalizedField.startsWith(`${normalizedQuery} `) || normalizedField.endsWith(` ${normalizedQuery}`)) {
    return 900;
  }
  if (normalizedField.includes(normalizedQuery)) {
    // Prefer earlier / shorter fields slightly
    const pos = normalizedField.indexOf(normalizedQuery);
    return 800 - Math.min(pos, 200);
  }

  const queryTokens = tokenizeNormalized(normalizedQuery);
  if (queryTokens.length === 0) return 0;

  const fieldTokens = tokenizeNormalized(normalizedField);
  if (fieldTokens.length === 0) return 0;

  // Ordered adjacent tokens
  const joinedQuery = queryTokens.join(' ');
  if (normalizedField.includes(joinedQuery)) {
    return 700;
  }

  let matched = 0;
  let lastIndex = -1;
  let ordered = true;
  for (const token of queryTokens) {
    const idx = fieldTokens.indexOf(token, lastIndex + 1);
    if (idx === -1) {
      if (!fieldTokens.includes(token)) {
        return matched === queryTokens.length ? 500 : matched > 0 ? 200 + matched * 40 : 0;
      }
      ordered = false;
      matched += 1;
      continue;
    }
    if (idx !== lastIndex + 1 && lastIndex !== -1) {
      ordered = false;
    }
    lastIndex = idx;
    matched += 1;
  }

  if (matched === queryTokens.length && ordered) return 600;
  if (matched === queryTokens.length) return 500;
  if (matched > 0) return 200 + matched * 40;
  return 0;
}
