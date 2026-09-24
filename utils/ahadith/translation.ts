import type { Hadith } from '@/types/hadith';
import type { AppLanguage } from '@/types/quran';
import { pickContent, resolveContent } from '@/utils/i18n/content';

/**
 * Hadith records name their translations `<language>_translation`, which
 * predates the `translation_<language>` convention the shared content resolver
 * expects. Re-keying here means an English translation lights up as soon as the
 * dataset ships one, while English falls back to Dari until then.
 */
function translationRecord(hadith: Hadith): Record<string, unknown> {
  const record = hadith as unknown as Record<string, unknown>;
  return {
    translation_dari: hadith.dari_translation,
    translation_pashto: hadith.pashto_translation,
    translation_english: record.translation_english ?? record.english_translation,
  };
}

/** Hadith translation in the active language, falling back down the chain. */
export function getHadithTranslation(hadith: Hadith, language: AppLanguage): string {
  return pickContent(translationRecord(hadith), 'translation', language);
}

/** Same, but also reports which language the text actually came from. */
export function resolveHadithTranslation(
  hadith: Hadith,
  language: AppLanguage,
): { text: string; language: AppLanguage } | null {
  return resolveContent(translationRecord(hadith), 'translation', language);
}
