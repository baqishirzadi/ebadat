/**
 * Resolution for per-language editorial content (Quran translations, adhkar,
 * hadith, prayer lessons, calendar events).
 *
 * Content records in this app use three different field conventions, all of
 * which predate English:
 *
 *   suffix `translation_dari`   `translation_pashto`   `translation_english`
 *   prefix `dari_translation`   `pashto_translation`   `english_translation`
 *   camel  `nameDari`           `namePashto`           `nameEnglish`
 *   short  `dari`               `pashto`               `english`
 *
 * These helpers read whichever convention a record uses and walk the language
 * fallback chain, so a missing English entry shows Dari rather than a blank.
 */

import type { AppLanguage } from '@/types/quran';
import { contentFallbackChain, getLanguage } from './languages';

/** Any object shape; typed interfaces are accepted without an index signature. */
type ContentRecord = object;

function readString(source: ContentRecord | null | undefined, key: string): string | undefined {
  const value = (source as Record<string, unknown> | null | undefined)?.[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : undefined;
}

function readStringArray(source: ContentRecord | null | undefined, key: string): string[] | undefined {
  const value = (source as Record<string, unknown> | null | undefined)?.[key];
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return items.length > 0 ? items : undefined;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Candidate field names for one base name, in the order they are tried. */
function fieldCandidates(base: string | null, language: AppLanguage): string[] {
  const suffix = getLanguage(language).fieldSuffix;
  if (!base) return [suffix];
  return [`${base}_${suffix}`, `${suffix}_${base}`, `${base}${capitalize(suffix)}`];
}

/**
 * Read a localized string from a content record.
 *
 * `base` is the field stem (`'translation'`, `'title'`, `'name'`). Pass `null`
 * for records whose fields are bare language names (`{ dari, pashto }`).
 */
export function pickContent(
  record: ContentRecord | null | undefined,
  base: string | null,
  language: AppLanguage,
): string {
  if (!record) return '';
  for (const candidate of contentFallbackChain(language)) {
    for (const field of fieldCandidates(base, candidate)) {
      const value = readString(record, field);
      if (value !== undefined) return value;
    }
  }
  return '';
}

/**
 * Like `pickContent`, but also reports which language the text came from, so a
 * caller can label content that fell back to a language other than the active
 * one instead of silently presenting it as a translation in the chosen language.
 */
export function resolveContent(
  record: ContentRecord | null | undefined,
  base: string | null,
  language: AppLanguage,
): { text: string; language: AppLanguage } | null {
  if (!record) return null;
  for (const candidate of contentFallbackChain(language)) {
    for (const field of fieldCandidates(base, candidate)) {
      const value = readString(record, field);
      if (value !== undefined) return { text: value, language: candidate };
    }
  }
  return null;
}

/** Same as `pickContent` but for `string[]` fields such as `steps_dari`. */
export function pickContentList(
  record: ContentRecord | null | undefined,
  base: string | null,
  language: AppLanguage,
): string[] {
  if (!record) return [];
  for (const candidate of contentFallbackChain(language)) {
    for (const field of fieldCandidates(base, candidate)) {
      const value = readStringArray(record, field);
      if (value !== undefined) return value;
    }
  }
  return [];
}

/**
 * Resolve an explicit per-language map, e.g. `{ dari: 'x', english: 'y' }`.
 * Useful for inline copy that has not been moved into the catalog yet.
 */
export function pickLanguage<T>(
  values: Partial<Record<AppLanguage, T>>,
  language: AppLanguage,
): T | undefined {
  for (const candidate of contentFallbackChain(language)) {
    const value = values[candidate];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

/** True when the record actually has content authored in this exact language. */
export function hasContentIn(
  record: ContentRecord | null | undefined,
  base: string | null,
  language: AppLanguage,
): boolean {
  if (!record) return false;
  return fieldCandidates(base, language).some((field) => readString(record, field) !== undefined);
}
