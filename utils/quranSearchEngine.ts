import { SearchResult } from '@/types/quran';
import { getSurahSync } from '@/hooks/useSurahData';

type TranslationLanguage = 'dari' | 'pashto' | 'both';

type IndexedAyah = {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  text: string;
  normalizedArabic: string;
  translationDari?: string;
  translationPashto?: string;
  normalizedDari: string;
  normalizedPashto: string;
};

let ayahIndexCache: IndexedAyah[] | null = null;

function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ی')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildAyahIndex(): IndexedAyah[] {
  if (ayahIndexCache) {
    return ayahIndexCache;
  }

  const rows: IndexedAyah[] = [];
  for (let surahNumber = 1; surahNumber <= 114; surahNumber++) {
    const surah = getSurahSync(surahNumber);
    if (!surah) continue;

    for (const ayah of surah.ayahs) {
      rows.push({
        surahNumber,
        surahName: surah.name,
        ayahNumber: ayah.number,
        text: ayah.text,
        normalizedArabic: normalizeArabic(ayah.text),
        translationDari: ayah.translation_dari,
        translationPashto: ayah.translation_pashto,
        normalizedDari: normalizeArabic(ayah.translation_dari || ''),
        normalizedPashto: normalizeArabic(ayah.translation_pashto || ''),
      });
    }
  }

  ayahIndexCache = rows;
  return rows;
}

export function searchArabicIndex(query: string, limit: number = 50): SearchResult[] {
  const normalizedQuery = normalizeArabic(query);
  if (!normalizedQuery || normalizedQuery.length < 2) return [];

  const results: SearchResult[] = [];
  const rows = buildAyahIndex();

  for (const row of rows) {
    if (!row.normalizedArabic.includes(normalizedQuery)) continue;

    results.push({
      surahNumber: row.surahNumber,
      surahName: row.surahName,
      ayahNumber: row.ayahNumber,
      text: row.text,
      matchedText: normalizedQuery,
    });

    if (results.length >= limit) {
      break;
    }
  }

  return results;
}

export function searchTranslationIndex(
  query: string,
  language: TranslationLanguage = 'both',
  limit: number = 50
): SearchResult[] {
  const normalizedQuery = normalizeArabic(query);
  if (!normalizedQuery || normalizedQuery.length < 2) return [];

  const results: SearchResult[] = [];
  const rows = buildAyahIndex();

  for (const row of rows) {
    const matchDari = (language === 'dari' || language === 'both')
      && row.normalizedDari.includes(normalizedQuery);
    const matchPashto = (language === 'pashto' || language === 'both')
      && row.normalizedPashto.includes(normalizedQuery);

    if (!matchDari && !matchPashto) continue;

    results.push({
      surahNumber: row.surahNumber,
      surahName: row.surahName,
      ayahNumber: row.ayahNumber,
      text: row.text,
      matchedText: normalizedQuery,
      translation: {
        dari: row.translationDari,
        pashto: row.translationPashto,
      },
    });

    if (results.length >= limit) {
      break;
    }
  }

  return results;
}

export function clearQuranSearchIndexCache(): void {
  ayahIndexCache = null;
}
