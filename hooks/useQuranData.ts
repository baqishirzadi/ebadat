/**
 * Hook for accessing Quran data with search and navigation utilities
 * 
 * UPDATED: Now uses lazy loading from individual surah files
 * instead of one large JSON file for better performance
 */

import { useMemo, useCallback } from 'react';
import { QuranData, Surah, Ayah, SearchResult } from '@/types/quran';
import metadata from '@/data/metadata.json';
import { getJuzRange, JUZ_RANGES } from '@/data/juzRanges';
import { getSurahSync, SurahData, SurahMetadata } from './useSurahData';
import { searchArabicIndex, searchTranslationIndex } from '@/utils/quranSearchEngine';

// Re-export the new hooks for convenience
export { 
  useSurahData, 
  useQuranMetadata, 
  preloadJuz30, 
  preloadPopularSurahs,
  getSurahSync,
  searchQuran,
  getCacheStats,
  clearSurahCache
} from './useSurahData';

// Type the metadata
const typedMetadata = metadata as {
  totalSurahs: number;
  totalAyahs: number;
  surahs: SurahMetadata[];
};

/**
 * Backward-compatible hook that provides access to Quran data
 * Now uses lazy loading internally for better performance
 */
export function useQuranData() {
  // Get surah list from metadata (lightweight)
  const surahList = useMemo(() => {
    return typedMetadata.surahs.map(s => ({
      number: s.number,
      name: s.name,
      englishName: '', // Not available in new format
      englishNameTranslation: '', // Not available in new format
      dariName: s.name_dari,
      pashtoName: s.name_dari, // Using dari name as fallback
      ayahCount: s.numberOfAyahs,
      revelationType: s.revelationType === 'مکی' ? 'Meccan' : 'Medinan',
      startPage: 1, // Would need to be added to metadata
    }));
  }, []);

  // Get surah by number (lazy loads the data)
  const getSurah = useCallback((surahNumber: number): Surah | undefined => {
    const surahData = getSurahSync(surahNumber);
    if (!surahData) return undefined;

    // Convert to old format for backward compatibility
    return convertToLegacyFormat(surahData);
  }, []);

  // Get ayah by surah and ayah number
  const getAyah = useCallback((surahNumber: number, ayahNumber: number): Ayah | undefined => {
    const surahData = getSurahSync(surahNumber);
    if (!surahData) return undefined;
    
    const ayah = surahData.ayahs.find(a => a.number === ayahNumber);
    if (!ayah) return undefined;

    return {
      number: ayah.number,
      numberInQuran: ayah.number, // Approximate
      text: ayah.text,
      page: ayah.page,
      juz: ayah.juz,
      hizb: ayah.hizb,
      sajda: ayah.sajda,
    };
  }, []);

  // Get ayahs by page number
  const getAyahsByPage = useCallback((pageNumber: number): { surah: Surah; ayah: Ayah }[] => {
    const result: { surah: Surah; ayah: Ayah }[] = [];
    const matchingRanges = JUZ_RANGES.filter(
      (range) => pageNumber >= range.startPage && pageNumber <= range.endPage
    );

    if (matchingRanges.length === 0) {
      return result;
    }

    const startSurah = Math.min(...matchingRanges.map((range) => range.startSurah));
    const endSurah = Math.max(...matchingRanges.map((range) => range.endSurah));

    for (let surahNumber = startSurah; surahNumber <= endSurah; surahNumber += 1) {
      const surahData = getSurahSync(surahNumber);
      if (!surahData) continue;

      for (const ayah of surahData.ayahs) {
        if (ayah.page !== pageNumber) continue;

        result.push({
          surah: convertToLegacyFormat(surahData),
          ayah: toLegacyAyah(ayah),
        });
      }
    }

    return result;
  }, []);

  // Get ayahs by juz number
  const getAyahsByJuz = useCallback((juzNumber: number): { surah: Surah; ayah: Ayah }[] => {
    const result: { surah: Surah; ayah: Ayah }[] = [];
    const range = getJuzRange(juzNumber);

    if (!range) {
      return result;
    }

    for (let surahNumber = range.startSurah; surahNumber <= range.endSurah; surahNumber += 1) {
      const surahData = getSurahSync(surahNumber);
      if (!surahData) continue;

      for (const ayah of surahData.ayahs) {
        if (surahNumber === range.startSurah && ayah.number < range.startAyah) continue;
        if (surahNumber === range.endSurah && ayah.number > range.endAyah) continue;

        result.push({
          surah: convertToLegacyFormat(surahData),
          ayah: toLegacyAyah(ayah),
        });
      }
    }

    return result;
  }, []);

  // Search in Arabic text
  const searchArabic = useCallback(async (query: string, limit: number = 50): Promise<SearchResult[]> => {
    return searchArabicIndex(query, limit);
  }, []);

  // Search in translations
  const searchTranslation = useCallback(async (
    query: string,
    language: 'dari' | 'pashto' | 'both' = 'both',
    limit: number = 50
  ): Promise<SearchResult[]> => {
    return searchTranslationIndex(query, language, limit);
  }, []);

  // Get translation for ayah
  const getTranslation = useCallback((
    surahNumber: number,
    ayahNumber: number,
    language: 'dari' | 'pashto'
  ): string | undefined => {
    const surahData = getSurahSync(surahNumber);
    if (!surahData) return undefined;
    
    const ayah = surahData.ayahs.find(a => a.number === ayahNumber);
    if (!ayah) return undefined;

    return language === 'dari' ? ayah.translation_dari : ayah.translation_pashto;
  }, []);

  // Get next ayah reference
  const getNextAyah = useCallback((surahNumber: number, ayahNumber: number): { surah: number; ayah: number } | null => {
    const surahData = getSurahSync(surahNumber);
    if (!surahData) return null;

    if (ayahNumber < surahData.numberOfAyahs) {
      return { surah: surahNumber, ayah: ayahNumber + 1 };
    }
    
    // Move to next surah
    if (surahNumber < 114) {
      return { surah: surahNumber + 1, ayah: 1 };
    }
    
    return null; // End of Quran
  }, []);

  // Get previous ayah reference
  const getPrevAyah = useCallback((surahNumber: number, ayahNumber: number): { surah: number; ayah: number } | null => {
    if (ayahNumber > 1) {
      return { surah: surahNumber, ayah: ayahNumber - 1 };
    }
    
    // Move to previous surah
    if (surahNumber > 1) {
      const prevSurah = getSurahSync(surahNumber - 1);
      if (prevSurah) {
        return { surah: surahNumber - 1, ayah: prevSurah.numberOfAyahs };
      }
    }
    
    return null; // Beginning of Quran
  }, []);

  // Get page for surah and ayah
  const getPage = useCallback((surahNumber: number, ayahNumber: number): number => {
    const surahData = getSurahSync(surahNumber);
    const ayah = surahData?.ayahs.find(a => a.number === ayahNumber);
    return ayah?.page || 1;
  }, []);

  return {
    surahs: [], // Deprecated - use surahList instead
    surahList,
    totalAyahs: typedMetadata.totalAyahs,
    totalPages: 604,
    getSurah,
    getAyah,
    getAyahsByPage,
    getAyahsByJuz,
    searchArabic,
    searchTranslation,
    getTranslation,
    getNextAyah,
    getPrevAyah,
    getPage,
  };
}

/**
 * Convert new SurahData format to legacy Surah format for backward compatibility
 */
const legacySurahCache = new Map<number, Surah>();

function toLegacyAyah(ayah: SurahData['ayahs'][number]): Ayah {
  return {
    number: ayah.number,
    numberInQuran: ayah.number,
    text: ayah.text,
    page: ayah.page,
    juz: ayah.juz,
    hizb: ayah.hizb,
    sajda: ayah.sajda,
  };
}

function convertToLegacyFormat(surahData: SurahData): Surah {
  const cached = legacySurahCache.get(surahData.number);
  if (cached) return cached;

  const surah: Surah = {
    number: surahData.number,
    name: surahData.name,
    englishName: '', // Not available
    englishNameTranslation: '', // Not available
    dariName: surahData.name_dari,
    pashtoName: surahData.name_dari,
    ayahCount: surahData.numberOfAyahs,
    revelationType: surahData.revelationType === 'مکی' ? 'Meccan' : 'Medinan',
    startPage: surahData.ayahs[0]?.page || 1,
    ayahs: surahData.ayahs.map(toLegacyAyah),
    translations: {
      dari: surahData.ayahs.map(a => ({
        ayahNumber: a.number,
        text: a.translation_dari,
      })),
      pashto: surahData.ayahs.map(a => ({
        ayahNumber: a.number,
        text: a.translation_pashto,
      })),
    },
  };

  legacySurahCache.set(surahData.number, surah);
  return surah;
}
