import type { Hadith } from '@/types/hadith';
import type { AppLanguage } from '@/types/quran';
import { contentFallbackChain } from '@/utils/i18n/languages';

function hadithField(hadith: Hadith, language: AppLanguage): string {
  const raw =
    language === 'dari'
      ? hadith.dari_translation
      : language === 'pashto'
        ? hadith.pashto_translation
        : language === 'turkish'
          ? hadith.turkish_translation
          : language === 'arabic'
            ? hadith.arabic_translation
            : hadith.english_translation;
  return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * Translation for the active app language.
 * Turkish falls back through English, and Arabic through Dari, when a
 * rendering has not been stored yet.
 */
export function getHadithTranslation(hadith: Hadith, language: AppLanguage): string {
  for (const candidate of contentFallbackChain(language)) {
    const text = hadithField(hadith, candidate);
    if (text) return text;
  }
  return '';
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
