/**
 * Hook for accessing Quran data with search and navigation utilities
 * 
 * UPDATED: Now uses lazy loading from individual surah files
 * instead of one large JSON file for better performance
 */

import { useMemo, useCallback } from 'react';
import { QuranData, Surah, Ayah, SearchResult } from '@/types/quran';
import metadata from '@/data/metadata.json';
import { getSurahSync, SurahData, SurahMetadata } from './useSurahData';

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
    
    // Load all surahs and search for ayahs on this page
    for (let i = 1; i <= 114; i++) {
      const surahData = getSurahSync(i);
      if (!surahData) continue;

      for (const ayah of surahData.ayahs) {
        if (ayah.page === pageNumber) {
          result.push({
            surah: convertToLegacyFormat(surahData),
            ayah: {
              number: ayah.number,
              numberInQuran: ayah.number,
              text: ayah.text,
              page: ayah.page,
              juz: ayah.juz,
              hizb: ayah.hizb,
              sajda: ayah.sajda,
            },
          });
        }
      }
    }
    
    return result;
  }, []);

  // Get ayahs by juz number
  const getAyahsByJuz = useCallback((juzNumber: number): { surah: Surah; ayah: Ayah }[] => {
    const result: { surah: Surah; ayah: Ayah }[] = [];
    
    for (let i = 1; i <= 114; i++) {
      const surahData = getSurahSync(i);
      if (!surahData) continue;

      for (const ayah of surahData.ayahs) {
        if (ayah.juz === juzNumber) {
          result.push({
            surah: convertToLegacyFormat(surahData),
            ayah: {
              number: ayah.number,
              numberInQuran: ayah.number,
              text: ayah.text,
              page: ayah.page,
              juz: ayah.juz,
              hizb: ayah.hizb,
              sajda: ayah.sajda,
            },
          });
        }
      }
    }
    
    return result;
  }, []);

  // Search in Arabic text
  const searchArabic = useCallback((query: string, limit: number = 50): SearchResult[] => {
    if (!query || query.length < 2) return [];
    
    const results: SearchResult[] = [];
    const normalizedQuery = query.trim();

    for (let i = 1; i <= 114 && results.length < limit; i++) {
      const surahData = getSurahSync(i);
      if (!surahData) continue;

      for (const ayah of surahData.ayahs) {
        if (ayah.text.includes(normalizedQuery)) {
          results.push({
            surahNumber: surahData.number,
            surahName: surahData.name,
            ayahNumber: ayah.number,
            text: ayah.text,
            matchedText: normalizedQuery,
          });
          if (results.length >= limit) break;
        }
      }
    }
    
    return results;
  }, []);

  // Search in translations
  const searchTranslation = useCallback((
    query: string,
    language: 'dari' | 'pashto' | 'both' = 'both',
    limit: number = 50
  ): SearchResult[] => {
    if (!query || query.length < 2) return [];
    
    const results: SearchResult[] = [];
    const normalizedQuery = query.toLowerCase().trim();

    for (let i = 1; i <= 114 && results.length < limit; i++) {
      const surahData = getSurahSync(i);
      if (!surahData) continue;

      for (const ayah of surahData.ayahs) {
        const matchDari = (language === 'dari' || language === 'both') && 
                          ayah.translation_dari?.toLowerCase().includes(normalizedQuery);
        const matchPashto = (language === 'pashto' || language === 'both') && 
                            ayah.translation_pashto?.toLowerCase().includes(normalizedQuery);

        if (matchDari || matchPashto) {
          results.push({
            surahNumber: surahData.number,
            surahName: surahData.name,
            ayahNumber: ayah.number,
            text: ayah.text,
            matchedText: normalizedQuery,
            translation: {
              dari: ayah.translation_dari,
              pashto: ayah.translation_pashto,
            },
          });
          if (results.length >= limit) break;
        }
      }
    }
    
    return results;
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
function convertToLegacyFormat(surahData: SurahData): Surah {
  return {
    number: surahData.number,
    name: surahData.name,
    englishName: '', // Not available
    englishNameTranslation: '', // Not available
    dariName: surahData.name_dari,
    pashtoName: surahData.name_dari,
    ayahCount: surahData.numberOfAyahs,
    revelationType: surahData.revelationType === 'مکی' ? 'Meccan' : 'Medinan',
    startPage: surahData.ayahs[0]?.page || 1,
    ayahs: surahData.ayahs.map(a => ({
      number: a.number,
      numberInQuran: a.number,
      text: a.text,
      page: a.page,
      juz: a.juz,
      hizb: a.hizb,
      sajda: a.sajda,
    })),
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
}
