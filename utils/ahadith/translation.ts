import type { Hadith } from '@/types/hadith';
import type { AppLanguage } from '@/types/quran';

/**
 * Translation for the active app language only.
 * Never substitutes another language's text; empty means the translation is missing.
 */
export function getHadithTranslation(hadith: Hadith, language: AppLanguage): string {
  const raw =
    language === 'dari'
      ? hadith.dari_translation
      : language === 'pashto'
        ? hadith.pashto_translation
        : hadith.english_translation;

  return typeof raw === 'string' ? raw.trim() : '';
}

/** Same, or null when that language has no text. */
export function resolveHadithTranslation(
  hadith: Hadith,
  language: AppLanguage,
): { text: string; language: AppLanguage } | null {
  const text = getHadithTranslation(hadith, language);
  if (!text) return null;
  return { text, language };
}
