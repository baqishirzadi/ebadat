/**
 * Lazy Loading Hook for Quran Data
 * 
 * Optimized for Afghanistan's internet conditions:
 * - Loads surahs on-demand (not all at once)
 * - Caches loaded surahs in memory
 * - Pre-loads Juz 30 (small surahs) on app start
 * - All data is bundled with the app (no internet required)
 */

import { useState, useEffect, useCallback } from 'react';

// Types
export interface SurahAyah {
  number: number;
  text: string;
  page: number;
  juz: number;
  hizb: number;
  sajda: boolean;
  translation_dari: string;
  translation_pashto: string;
}

export interface SurahData {
  number: number;
  name: string;
  name_dari: string;
  meaning_dari: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs: SurahAyah[];
}

export interface SurahMetadata {
  number: number;
  name: string;
  name_dari: string;
  meaning_dari: string;
  numberOfAyahs: number;
  revelationType: string;
}

// Import metadata (small file, always loaded)
import metadata from '@/data/metadata.json';

// Surah file imports (lazy loaded)
// Using require() for dynamic imports in React Native
const surahFiles: { [key: number]: any } = {
  1: () => require('@/data/surahs/001.json'),
  2: () => require('@/data/surahs/002.json'),
  3: () => require('@/data/surahs/003.json'),
  4: () => require('@/data/surahs/004.json'),
  5: () => require('@/data/surahs/005.json'),
  6: () => require('@/data/surahs/006.json'),
  7: () => require('@/data/surahs/007.json'),
  8: () => require('@/data/surahs/008.json'),
  9: () => require('@/data/surahs/009.json'),
  10: () => require('@/data/surahs/010.json'),
  11: () => require('@/data/surahs/011.json'),
  12: () => require('@/data/surahs/012.json'),
  13: () => require('@/data/surahs/013.json'),
  14: () => require('@/data/surahs/014.json'),
  15: () => require('@/data/surahs/015.json'),
  16: () => require('@/data/surahs/016.json'),
  17: () => require('@/data/surahs/017.json'),
  18: () => require('@/data/surahs/018.json'),
  19: () => require('@/data/surahs/019.json'),
  20: () => require('@/data/surahs/020.json'),
  21: () => require('@/data/surahs/021.json'),
  22: () => require('@/data/surahs/022.json'),
  23: () => require('@/data/surahs/023.json'),
  24: () => require('@/data/surahs/024.json'),
  25: () => require('@/data/surahs/025.json'),
  26: () => require('@/data/surahs/026.json'),
  27: () => require('@/data/surahs/027.json'),
  28: () => require('@/data/surahs/028.json'),
  29: () => require('@/data/surahs/029.json'),
  30: () => require('@/data/surahs/030.json'),
  31: () => require('@/data/surahs/031.json'),
  32: () => require('@/data/surahs/032.json'),
  33: () => require('@/data/surahs/033.json'),
  34: () => require('@/data/surahs/034.json'),
  35: () => require('@/data/surahs/035.json'),
  36: () => require('@/data/surahs/036.json'),
  37: () => require('@/data/surahs/037.json'),
  38: () => require('@/data/surahs/038.json'),
  39: () => require('@/data/surahs/039.json'),
  40: () => require('@/data/surahs/040.json'),
  41: () => require('@/data/surahs/041.json'),
  42: () => require('@/data/surahs/042.json'),
  43: () => require('@/data/surahs/043.json'),
  44: () => require('@/data/surahs/044.json'),
  45: () => require('@/data/surahs/045.json'),
  46: () => require('@/data/surahs/046.json'),
  47: () => require('@/data/surahs/047.json'),
  48: () => require('@/data/surahs/048.json'),
  49: () => require('@/data/surahs/049.json'),
  50: () => require('@/data/surahs/050.json'),
  51: () => require('@/data/surahs/051.json'),
  52: () => require('@/data/surahs/052.json'),
  53: () => require('@/data/surahs/053.json'),
  54: () => require('@/data/surahs/054.json'),
  55: () => require('@/data/surahs/055.json'),
  56: () => require('@/data/surahs/056.json'),
  57: () => require('@/data/surahs/057.json'),
  58: () => require('@/data/surahs/058.json'),
  59: () => require('@/data/surahs/059.json'),
  60: () => require('@/data/surahs/060.json'),
  61: () => require('@/data/surahs/061.json'),
  62: () => require('@/data/surahs/062.json'),
  63: () => require('@/data/surahs/063.json'),
  64: () => require('@/data/surahs/064.json'),
  65: () => require('@/data/surahs/065.json'),
  66: () => require('@/data/surahs/066.json'),
  67: () => require('@/data/surahs/067.json'),
  68: () => require('@/data/surahs/068.json'),
  69: () => require('@/data/surahs/069.json'),
  70: () => require('@/data/surahs/070.json'),
  71: () => require('@/data/surahs/071.json'),
  72: () => require('@/data/surahs/072.json'),
  73: () => require('@/data/surahs/073.json'),
  74: () => require('@/data/surahs/074.json'),
  75: () => require('@/data/surahs/075.json'),
  76: () => require('@/data/surahs/076.json'),
  77: () => require('@/data/surahs/077.json'),
  78: () => require('@/data/surahs/078.json'),
  79: () => require('@/data/surahs/079.json'),
  80: () => require('@/data/surahs/080.json'),
  81: () => require('@/data/surahs/081.json'),
  82: () => require('@/data/surahs/082.json'),
  83: () => require('@/data/surahs/083.json'),
  84: () => require('@/data/surahs/084.json'),
  85: () => require('@/data/surahs/085.json'),
  86: () => require('@/data/surahs/086.json'),
  87: () => require('@/data/surahs/087.json'),
  88: () => require('@/data/surahs/088.json'),
  89: () => require('@/data/surahs/089.json'),
  90: () => require('@/data/surahs/090.json'),
  91: () => require('@/data/surahs/091.json'),
  92: () => require('@/data/surahs/092.json'),
  93: () => require('@/data/surahs/093.json'),
  94: () => require('@/data/surahs/094.json'),
  95: () => require('@/data/surahs/095.json'),
  96: () => require('@/data/surahs/096.json'),
  97: () => require('@/data/surahs/097.json'),
  98: () => require('@/data/surahs/098.json'),
  99: () => require('@/data/surahs/099.json'),
  100: () => require('@/data/surahs/100.json'),
  101: () => require('@/data/surahs/101.json'),
  102: () => require('@/data/surahs/102.json'),
  103: () => require('@/data/surahs/103.json'),
  104: () => require('@/data/surahs/104.json'),
  105: () => require('@/data/surahs/105.json'),
  106: () => require('@/data/surahs/106.json'),
  107: () => require('@/data/surahs/107.json'),
  108: () => require('@/data/surahs/108.json'),
  109: () => require('@/data/surahs/109.json'),
  110: () => require('@/data/surahs/110.json'),
  111: () => require('@/data/surahs/111.json'),
  112: () => require('@/data/surahs/112.json'),
  113: () => require('@/data/surahs/113.json'),
  114: () => require('@/data/surahs/114.json'),
};

// Memory cache for loaded surahs
const surahCache: Map<number, SurahData> = new Map();

/**
 * Hook to access Quran metadata (surah list)
 * This data is always available instantly
 */
export function useQuranMetadata() {
  return {
    totalSurahs: metadata.totalSurahs,
    totalAyahs: metadata.totalAyahs,
    surahs: metadata.surahs as SurahMetadata[],
  };
}

/**
 * Hook to load a single surah with lazy loading
 * @param surahNumber - Number of the surah (1-114)
 */
export function useSurahData(surahNumber: number) {
  const [surah, setSurah] = useState<SurahData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSurah = useCallback(async (num: number) => {
    if (num < 1 || num > 114) {
      setError(`سوره ${num} وجود ندارد`);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check cache first
      if (surahCache.has(num)) {
        setSurah(surahCache.get(num)!);
        setLoading(false);
        return;
      }

      // Load from bundled file
      const loader = surahFiles[num];
      if (!loader) {
        throw new Error(`فایل سوره ${num} یافت نشد`);
      }

      const surahData = loader() as SurahData;
      
      // Cache it
      surahCache.set(num, surahData);
      setSurah(surahData);
      setLoading(false);
    } catch (err) {
      console.error(`خطا در بارگیری سوره ${num}:`, err);
      setError(`خطا در بارگیری سوره ${num}`);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSurah(surahNumber);
  }, [surahNumber, loadSurah]);

  return { surah, loading, error, reload: () => loadSurah(surahNumber) };
}

/**
 * Get a surah synchronously (from cache or load immediately)
 * @param surahNumber - Number of the surah (1-114)
 */
export function getSurahSync(surahNumber: number): SurahData | null {
  if (surahNumber < 1 || surahNumber > 114) return null;

  // Check cache
  if (surahCache.has(surahNumber)) {
    return surahCache.get(surahNumber)!;
  }

  // Load and cache
  try {
    const loader = surahFiles[surahNumber];
    if (loader) {
      const surahData = loader() as SurahData;
      surahCache.set(surahNumber, surahData);
      return surahData;
    }
  } catch (err) {
    console.error(`خطا در بارگیری سوره ${surahNumber}:`, err);
  }

  return null;
}

/**
 * Preload Juz 30 (small surahs 78-114) for instant access
 * Call this on app startup
 */
export function preloadJuz30(): void {
  const juz30Surahs = Array.from({ length: 37 }, (_, i) => 78 + i);
  
  console.log('📥 بارگیری جزء ۳۰...');
  
  juz30Surahs.forEach(num => {
    try {
      const loader = surahFiles[num];
      if (loader && !surahCache.has(num)) {
        surahCache.set(num, loader());
      }
    } catch (err) {
      console.error(`خطا در پیش‌بارگیری سوره ${num}`);
    }
  });
  
  console.log(`✅ جزء ۳۰ بارگیری شد (${juz30Surahs.length} سوره)`);
}

/**
 * Preload popular surahs for instant access
 */
export function preloadPopularSurahs(): void {
  const popularSurahs = [1, 2, 18, 36, 55, 56, 67, 78]; // Al-Fatiha, Al-Baqarah, Al-Kahf, Ya-Sin, etc.
  
  popularSurahs.forEach(num => {
    try {
      const loader = surahFiles[num];
      if (loader && !surahCache.has(num)) {
        surahCache.set(num, loader());
      }
    } catch (err) {
      console.error(`خطا در پیش‌بارگیری سوره ${num}`);
    }
  });
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    cachedSurahs: surahCache.size,
    totalSurahs: 114,
    cachePercentage: Math.round((surahCache.size / 114) * 100),
  };
}

/**
 * Clear the surah cache (for memory management)
 */
export function clearSurahCache(): void {
  surahCache.clear();
}

/**
 * Search in Quran text
 * @param query - Search query
 * @param language - 'arabic' | 'dari' | 'pashto' | 'all'
 */
export function searchQuran(
  query: string,
  language: 'arabic' | 'dari' | 'pashto' | 'all' = 'all',
  limit: number = 50
) {
  const results: Array<{
    surahNumber: number;
    surahName: string;
    ayahNumber: number;
    text: string;
    matchedIn: string;
  }> = [];

  if (!query || query.length < 2) return results;

  const normalizedQuery = query.trim().toLowerCase();

  // Search through all surahs
  for (let i = 1; i <= 114 && results.length < limit; i++) {
    const surah = getSurahSync(i);
    if (!surah) continue;

    for (const ayah of surah.ayahs) {
      if (results.length >= limit) break;

      let matched = false;
      let matchedIn = '';

      if (language === 'arabic' || language === 'all') {
        if (ayah.text.includes(normalizedQuery)) {
          matched = true;
          matchedIn = 'arabic';
        }
      }

      if (!matched && (language === 'dari' || language === 'all')) {
        if (ayah.translation_dari?.toLowerCase().includes(normalizedQuery)) {
          matched = true;
          matchedIn = 'dari';
        }
      }

      if (!matched && (language === 'pashto' || language === 'all')) {
        if (ayah.translation_pashto?.toLowerCase().includes(normalizedQuery)) {
          matched = true;
          matchedIn = 'pashto';
        }
      }

      if (matched) {
        results.push({
          surahNumber: surah.number,
          surahName: surah.name,
          ayahNumber: ayah.number,
          text: ayah.text,
          matchedIn,
        });
      }
    }
  }

  return results;
}
