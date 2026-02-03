/**
 * Type definitions for Quran data structures
 */

export interface Ayah {
  number: number;          // Ayah number within surah (1-indexed)
  numberInQuran: number;   // Global ayah number (1-6236)
  text: string;            // Arabic Uthmani text
  page: number;            // Mushaf page number (1-604)
  juz: number;             // Juz number (1-30)
  hizb: number;            // Hizb quarter (1-240)
  sajda: boolean;          // Has sajda tilawat
}

export interface Translation {
  ayahNumber: number;
  text: string;
}

export interface SurahTranslations {
  dari: Translation[];
  pashto: Translation[];
}

export interface Surah {
  number: number;                    // 1-114
  name: string;                      // Arabic name
  englishName: string;               // English transliteration
  englishNameTranslation: string;    // English meaning
  dariName: string;                  // Dari/Farsi name
  pashtoName: string;                // Pashto name
  ayahCount: number;                 // Number of ayahs
  revelationType: 'Meccan' | 'Medinan';
  startPage: number;                 // Starting Mushaf page
  ayahs: Ayah[];
  translations: SurahTranslations;
}

export interface QuranData {
  surahs: Surah[];
  totalAyahs: number;
  totalPages: number;
}

// Bookmark types
export interface Bookmark {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  page: number;
  timestamp: number;
  note?: string;
}

// Reading position
export interface ReadingPosition {
  surahNumber: number;
  ayahNumber: number;
  page: number;
  scrollPosition?: number;
  timestamp: number;
}

// View modes
export type ViewMode = 'mushaf' | 'scroll';
export type TranslationLanguage = 'dari' | 'pashto' | 'both' | 'none';

// User preferences
export interface UserPreferences {
  theme: import('../constants/theme').ThemeMode;
  quranFont: import('../constants/theme').QuranFontFamily;
  dariFont: import('../constants/theme').DariFontFamily;
  pashtoFont: import('../constants/theme').PashtoFontFamily;
  arabicFontSize: 'small' | 'medium' | 'large' | 'xlarge';
  translationFontSize: 'small' | 'medium' | 'large' | 'xlarge';
  viewMode: ViewMode;
  showTranslation: TranslationLanguage;
  autoPlayAudio: boolean;
  repeatAyah: boolean;
}

// Audio state
export interface AudioState {
  isPlaying: boolean;
  currentSurah: number;
  currentAyah: number;
  isLoading: boolean;
  isDownloaded: boolean;
  progress: number;
  duration: number;
}

// Surah audio download status
export interface SurahAudioStatus {
  surahNumber: number;
  isDownloaded: boolean;
  downloadProgress: number;
  filePath?: string;
}

// Search result
export interface SearchResult {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  text: string;
  matchedText: string;
  translation?: {
    dari?: string;
    pashto?: string;
  };
}
