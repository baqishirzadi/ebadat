import { InteractionManager } from 'react-native';
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

const SURAH_CHUNK_SIZE = 10;

let ayahIndexCache: IndexedAyah[] | null = null;
let ayahIndexBuildPromise: Promise<IndexedAyah[]> | null = null;

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

function indexSurahRows(surahNumber: number): IndexedAyah[] {
  const surah = getSurahSync(surahNumber);
  if (!surah) return [];

  return surah.ayahs.map((ayah) => ({
    surahNumber,
    surahName: surah.name,
    ayahNumber: ayah.number,
    text: ayah.text,
    normalizedArabic: normalizeArabic(ayah.text),
    translationDari: ayah.translation_dari,
    translationPashto: ayah.translation_pashto,
    normalizedDari: normalizeArabic(ayah.translation_dari || ''),
    normalizedPashto: normalizeArabic(ayah.translation_pashto || ''),
  }));
}

function buildAyahIndexChunked(): Promise<IndexedAyah[]> {
  if (ayahIndexCache) {
    return Promise.resolve(ayahIndexCache);
  }

  if (ayahIndexBuildPromise) {
    return ayahIndexBuildPromise;
  }

  ayahIndexBuildPromise = new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      const rows: IndexedAyah[] = [];
      let nextSurah = 1;

      const processChunk = () => {
        const chunkEnd = Math.min(nextSurah + SURAH_CHUNK_SIZE - 1, 114);

        for (let surahNumber = nextSurah; surahNumber <= chunkEnd; surahNumber += 1) {
          rows.push(...indexSurahRows(surahNumber));
        }

        nextSurah = chunkEnd + 1;

        if (nextSurah <= 114) {
          setImmediate(processChunk);
          return;
        }

        ayahIndexCache = rows;
        resolve(rows);
      };

      processChunk();
    });
  });

  return ayahIndexBuildPromise;
}

export function ensureAyahIndexReady(): Promise<IndexedAyah[]> {
  return buildAyahIndexChunked();
}

export async function searchArabicIndex(query: string, limit: number = 50): Promise<SearchResult[]> {
  const normalizedQuery = normalizeArabic(query);
  if (!normalizedQuery || normalizedQuery.length < 2) return [];

  const results: SearchResult[] = [];
  const rows = await ensureAyahIndexReady();

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

export async function searchTranslationIndex(
  query: string,
  language: TranslationLanguage = 'both',
  limit: number = 50
): Promise<SearchResult[]> {
  const normalizedQuery = normalizeArabic(query);
  if (!normalizedQuery || normalizedQuery.length < 2) return [];

  const results: SearchResult[] = [];
  const rows = await ensureAyahIndexReady();

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
  ayahIndexBuildPromise = null;
}
