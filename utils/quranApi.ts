/**
 * Quran API Utility
 * Fetches Dari translation from QuranEnc.com (Anwar Badakhshani)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@ebadat/quran_dari_translation';
const API_BASE = 'https://quranenc.com/api/v1/translation/sura/dari_badkhashani';

export interface QuranAyah {
  id: number;
  sura: number;
  aya: number;
  arabic_text: string;
  translation: string;
  footnotes: string | null;
}

export interface QuranSurah {
  number: number;
  ayahs: QuranAyah[];
}

/**
 * Fetch Dari translation for a single surah
 */
export async function fetchSurahTranslation(surahNumber: number): Promise<QuranAyah[]> {
  try {
    const response = await fetch(`${API_BASE}/${surahNumber}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch surah ${surahNumber}`);
    }
    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error(`Error fetching surah ${surahNumber}:`, error);
    throw error;
  }
}

/**
 * Download all Quran translations and store offline
 */
export async function downloadAllTranslations(
  onProgress?: (current: number, total: number, surahName: string) => void
): Promise<void> {
  const surahNames = [
    'الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال',
    'التوبة', 'يونس', 'هود', 'يوسف', 'الرعد', 'إبراهيم', 'الحجر', 'النحل', 'الإسراء',
    'الكهف', 'مريم', 'طه', 'الأنبياء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء',
    'النمل', 'القصص', 'العنكبوت', 'الروم', 'لقمان', 'السجدة', 'الأحزاب', 'سبأ', 'فاطر',
    'يس', 'الصافات', 'ص', 'الزمر', 'غافر', 'فصلت', 'الشورى', 'الزخرف', 'الدخان',
    'الجاثية', 'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق', 'الذاريات', 'الطور', 'النجم',
    'القمر', 'الرحمن', 'الواقعة', 'الحديد', 'المجادلة', 'الحشر', 'الممتحنة', 'الصف',
    'الجمعة', 'المنافقون', 'التغابن', 'الطلاق', 'التحريم', 'الملك', 'القلم', 'الحاقة',
    'المعارج', 'نوح', 'الجن', 'المزمل', 'المدثر', 'القيامة', 'الإنسان', 'المرسلات',
    'النبأ', 'النازعات', 'عبس', 'التكوير', 'الانفطار', 'المطففين', 'الانشقاق', 'البروج',
    'الطارق', 'الأعلى', 'الغاشية', 'الفجر', 'البلد', 'الشمس', 'الليل', 'الضحى',
    'الشرح', 'التين', 'العلق', 'القدر', 'البينة', 'الزلزلة', 'العاديات', 'القارعة',
    'التكاثر', 'العصر', 'الهمزة', 'الفيل', 'قريش', 'الماعون', 'الكوثر', 'الكافرون',
    'النصر', 'المسد', 'الإخلاص', 'الفلق', 'الناس'
  ];

  const allData: Record<number, QuranAyah[]> = {};
  
  for (let i = 1; i <= 114; i++) {
    try {
      if (onProgress) {
        onProgress(i, 114, surahNames[i - 1]);
      }
      
      const ayahs = await fetchSurahTranslation(i);
      allData[i] = ayahs;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to download surah ${i}:`, error);
      // Continue with next surah
    }
  }
  
  // Store all data
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
}

/**
 * Get stored translation for a surah
 */
export async function getStoredTranslation(surahNumber: number): Promise<QuranAyah[] | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    return data[surahNumber] || null;
  } catch (error) {
    console.error('Error getting stored translation:', error);
    return null;
  }
}

/**
 * Check if translations are downloaded
 */
export async function isTranslationDownloaded(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    
    const data = JSON.parse(stored);
    // Check if we have at least some surahs
    return Object.keys(data).length >= 100;
  } catch {
    return false;
  }
}

/**
 * Get download progress (how many surahs are downloaded)
 */
export async function getDownloadProgress(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return 0;
    
    const data = JSON.parse(stored);
    return Object.keys(data).length;
  } catch {
    return 0;
  }
}

/**
 * Clear stored translations (for re-download)
 */
export async function clearStoredTranslations(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
