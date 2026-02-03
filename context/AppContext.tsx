/**
 * App-wide state management using React Context
 * Handles: Theme, Font, Bookmarks, Reading Position, Preferences
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, QuranFontFamily, DariFontFamily, PashtoFontFamily, Themes, ThemeColors } from '@/constants/theme';
import {
  Bookmark,
  ReadingPosition,
  UserPreferences,
  ViewMode,
  TranslationLanguage,
} from '@/types/quran';

// Storage keys
const STORAGE_KEYS = {
  PREFERENCES: '@ebadat/preferences',
  BOOKMARKS: '@ebadat/bookmarks',
  LAST_POSITION: '@ebadat/last_position',
};

// Default preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  quranFont: 'scheherazade',  // Uthmani Taha (عثمان طه) - default Quran font
  dariFont: 'vazirmatn',    // Modern Dari font
  pashtoFont: 'amiri',      // Naskh style for Pashto (readable)
  arabicFontSize: 'medium',
  translationFontSize: 'medium',
  viewMode: 'scroll',
  showTranslation: 'dari',
  autoPlayAudio: true,
  repeatAyah: false,
};

// Default reading position (Al-Fatiha, Ayah 1)
const DEFAULT_POSITION: ReadingPosition = {
  surahNumber: 1,
  ayahNumber: 1,
  page: 1,
  timestamp: Date.now(),
};

// App State
interface AppState {
  preferences: UserPreferences;
  bookmarks: Bookmark[];
  lastPosition: ReadingPosition;
  isLoading: boolean;
  isInitialized: boolean;
}

// Actions
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'INITIALIZE'; payload: { preferences: UserPreferences; bookmarks: Bookmark[]; lastPosition: ReadingPosition } }
  | { type: 'SET_THEME'; payload: ThemeMode }
  | { type: 'SET_FONT'; payload: QuranFontFamily }
  | { type: 'SET_DARI_FONT'; payload: DariFontFamily }
  | { type: 'SET_PASHTO_FONT'; payload: PashtoFontFamily }
  | { type: 'SET_ARABIC_FONT_SIZE'; payload: 'small' | 'medium' | 'large' | 'xlarge' }
  | { type: 'SET_TRANSLATION_FONT_SIZE'; payload: 'small' | 'medium' | 'large' | 'xlarge' }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_TRANSLATION_LANGUAGE'; payload: TranslationLanguage }
  | { type: 'SET_AUTO_PLAY'; payload: boolean }
  | { type: 'SET_REPEAT_AYAH'; payload: boolean }
  | { type: 'ADD_BOOKMARK'; payload: Bookmark }
  | { type: 'REMOVE_BOOKMARK'; payload: string }
  | { type: 'UPDATE_POSITION'; payload: ReadingPosition };

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'INITIALIZE':
      return {
        ...state,
        preferences: action.payload.preferences,
        bookmarks: action.payload.bookmarks,
        lastPosition: action.payload.lastPosition,
        isLoading: false,
        isInitialized: true,
      };
    
    case 'SET_THEME':
      return {
        ...state,
        preferences: { ...state.preferences, theme: action.payload },
      };
    
    case 'SET_FONT':
      return {
        ...state,
        preferences: { ...state.preferences, quranFont: action.payload },
      };
    
    case 'SET_DARI_FONT':
      return {
        ...state,
        preferences: { ...state.preferences, dariFont: action.payload },
      };
    
    case 'SET_PASHTO_FONT':
      return {
        ...state,
        preferences: { ...state.preferences, pashtoFont: action.payload },
      };
    
    case 'SET_ARABIC_FONT_SIZE':
      return {
        ...state,
        preferences: { ...state.preferences, arabicFontSize: action.payload },
      };
    
    case 'SET_TRANSLATION_FONT_SIZE':
      return {
        ...state,
        preferences: { ...state.preferences, translationFontSize: action.payload },
      };
    
    case 'SET_VIEW_MODE':
      return {
        ...state,
        preferences: { ...state.preferences, viewMode: action.payload },
      };
    
    case 'SET_TRANSLATION_LANGUAGE':
      return {
        ...state,
        preferences: { ...state.preferences, showTranslation: action.payload },
      };
    
    case 'SET_AUTO_PLAY':
      return {
        ...state,
        preferences: { ...state.preferences, autoPlayAudio: action.payload },
      };
    
    case 'SET_REPEAT_AYAH':
      return {
        ...state,
        preferences: { ...state.preferences, repeatAyah: action.payload },
      };
    
    case 'ADD_BOOKMARK':
      return {
        ...state,
        bookmarks: [...state.bookmarks, action.payload],
      };
    
    case 'REMOVE_BOOKMARK':
      return {
        ...state,
        bookmarks: state.bookmarks.filter((b) => b.id !== action.payload),
      };
    
    case 'UPDATE_POSITION':
      return {
        ...state,
        lastPosition: action.payload,
      };
    
    default:
      return state;
  }
}

// Initial state
const initialState: AppState = {
  preferences: DEFAULT_PREFERENCES,
  bookmarks: [],
  lastPosition: DEFAULT_POSITION,
  isLoading: true,
  isInitialized: false,
};

// Context type
interface AppContextType {
  state: AppState;
  theme: ThemeColors;
  
  // Theme actions
  setTheme: (theme: ThemeMode) => void;
  
  // Font actions
  setQuranFont: (font: QuranFontFamily) => void;
  setDariFont: (font: DariFontFamily) => void;
  setPashtoFont: (font: PashtoFontFamily) => void;
  setArabicFontSize: (size: 'small' | 'medium' | 'large' | 'xlarge') => void;
  setTranslationFontSize: (size: 'small' | 'medium' | 'large' | 'xlarge') => void;
  
  // View actions
  setViewMode: (mode: ViewMode) => void;
  setTranslationLanguage: (lang: TranslationLanguage) => void;
  
  // Audio actions
  setAutoPlay: (enabled: boolean) => void;
  setRepeatAyah: (enabled: boolean) => void;
  
  // Bookmark actions
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'timestamp'>) => void;
  removeBookmark: (id: string) => void;
  isBookmarked: (surahNumber: number, ayahNumber: number) => boolean;
  getBookmark: (surahNumber: number, ayahNumber: number) => Bookmark | undefined;
  
  // Position actions
  updatePosition: (position: Omit<ReadingPosition, 'timestamp'>) => void;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load persisted state on mount
  useEffect(() => {
    loadPersistedState();
  }, []);

  // Persist preferences whenever they change
  useEffect(() => {
    if (state.isInitialized) {
      AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(state.preferences));
    }
  }, [state.preferences, state.isInitialized]);

  // Persist bookmarks whenever they change
  useEffect(() => {
    if (state.isInitialized) {
      AsyncStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(state.bookmarks));
    }
  }, [state.bookmarks, state.isInitialized]);

  // Persist last position whenever it changes
  useEffect(() => {
    if (state.isInitialized) {
      AsyncStorage.setItem(STORAGE_KEYS.LAST_POSITION, JSON.stringify(state.lastPosition));
    }
  }, [state.lastPosition, state.isInitialized]);

  async function loadPersistedState() {
    try {
      const [prefsJson, bookmarksJson, positionJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES),
        AsyncStorage.getItem(STORAGE_KEYS.BOOKMARKS),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_POSITION),
      ]);

      const preferences = prefsJson ? { ...DEFAULT_PREFERENCES, ...JSON.parse(prefsJson) } : DEFAULT_PREFERENCES;
      const bookmarks = bookmarksJson ? JSON.parse(bookmarksJson) : [];
      const lastPosition = positionJson ? JSON.parse(positionJson) : DEFAULT_POSITION;

      dispatch({
        type: 'INITIALIZE',
        payload: { preferences, bookmarks, lastPosition },
      });
    } catch (error) {
      console.error('Failed to load persisted state:', error);
      dispatch({
        type: 'INITIALIZE',
        payload: { preferences: DEFAULT_PREFERENCES, bookmarks: [], lastPosition: DEFAULT_POSITION },
      });
    }
  }

  // Get current theme colors
  const theme = Themes[state.preferences.theme];

  // Action handlers
  const setTheme = (newTheme: ThemeMode) => {
    dispatch({ type: 'SET_THEME', payload: newTheme });
  };

  const setQuranFont = (font: QuranFontFamily) => {
    dispatch({ type: 'SET_FONT', payload: font });
  };

  const setDariFont = (font: DariFontFamily) => {
    dispatch({ type: 'SET_DARI_FONT', payload: font });
  };

  const setPashtoFont = (font: PashtoFontFamily) => {
    dispatch({ type: 'SET_PASHTO_FONT', payload: font });
  };

  const setArabicFontSize = (size: 'small' | 'medium' | 'large' | 'xlarge') => {
    dispatch({ type: 'SET_ARABIC_FONT_SIZE', payload: size });
  };

  const setTranslationFontSize = (size: 'small' | 'medium' | 'large' | 'xlarge') => {
    dispatch({ type: 'SET_TRANSLATION_FONT_SIZE', payload: size });
  };

  const setViewMode = (mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  };

  const setTranslationLanguage = (lang: TranslationLanguage) => {
    dispatch({ type: 'SET_TRANSLATION_LANGUAGE', payload: lang });
  };

  const setAutoPlay = (enabled: boolean) => {
    dispatch({ type: 'SET_AUTO_PLAY', payload: enabled });
  };

  const setRepeatAyah = (enabled: boolean) => {
    dispatch({ type: 'SET_REPEAT_AYAH', payload: enabled });
  };

  const addBookmark = (bookmark: Omit<Bookmark, 'id' | 'timestamp'>) => {
    const newBookmark: Bookmark = {
      ...bookmark,
      id: `${bookmark.surahNumber}-${bookmark.ayahNumber}-${Date.now()}`,
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_BOOKMARK', payload: newBookmark });
  };

  const removeBookmark = (id: string) => {
    dispatch({ type: 'REMOVE_BOOKMARK', payload: id });
  };

  const isBookmarked = (surahNumber: number, ayahNumber: number): boolean => {
    return state.bookmarks.some(
      (b) => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber
    );
  };

  const getBookmark = (surahNumber: number, ayahNumber: number): Bookmark | undefined => {
    return state.bookmarks.find(
      (b) => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber
    );
  };

  const updatePosition = (position: Omit<ReadingPosition, 'timestamp'>) => {
    dispatch({
      type: 'UPDATE_POSITION',
      payload: { ...position, timestamp: Date.now() },
    });
  };

  const contextValue: AppContextType = {
    state,
    theme,
    setTheme,
    setQuranFont,
    setDariFont,
    setPashtoFont,
    setArabicFontSize,
    setTranslationFontSize,
    setViewMode,
    setTranslationLanguage,
    setAutoPlay,
    setRepeatAyah,
    addBookmark,
    removeBookmark,
    isBookmarked,
    getBookmark,
    updatePosition,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

// Hook to use app context
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Convenience hooks
export function useTheme() {
  const { theme, state, setTheme } = useApp();
  return { theme, currentTheme: state.preferences.theme, setTheme };
}

export function useQuranFont() {
  const { state, setQuranFont, setArabicFontSize, setTranslationFontSize } = useApp();
  return {
    font: state.preferences.quranFont,
    arabicSize: state.preferences.arabicFontSize,
    translationSize: state.preferences.translationFontSize,
    setQuranFont,
    setArabicFontSize,
    setTranslationFontSize,
  };
}

export function useBookmarks() {
  const { state, addBookmark, removeBookmark, isBookmarked, getBookmark } = useApp();
  return {
    bookmarks: state.bookmarks,
    addBookmark,
    removeBookmark,
    isBookmarked,
    getBookmark,
  };
}

export function useReadingPosition() {
  const { state, updatePosition } = useApp();
  return {
    position: state.lastPosition,
    updatePosition,
  };
}
