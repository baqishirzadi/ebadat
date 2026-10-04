import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { useApp } from '@/context/AppContext';

export type QuranLineSpacing = 'compact' | 'normal' | 'relaxed';
export type QuranPageTone = 'auto' | 'light' | 'sepia' | 'dark';

export interface QuranReaderSettings {
  lineSpacing: QuranLineSpacing;
  pageTone: QuranPageTone;
}

export interface QuranReaderTokens {
  lineHeightRatio: number;
  page: string;
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  arabic: string;
  translation: string;
  accent: string;
  divider: string;
  isDark: boolean;
}

const STORAGE_KEY = '@ebadat/quran_reader_settings';
const DEFAULT_SETTINGS: QuranReaderSettings = { lineSpacing: 'normal', pageTone: 'auto' };
const LINE_HEIGHTS: Record<QuranLineSpacing, number> = {
  compact: 2.0,
  normal: 2.2,
  relaxed: 2.4,
};

const FIXED_PAGES: Record<Exclude<QuranPageTone, 'auto'>, Omit<QuranReaderTokens, 'lineHeightRatio' | 'accent'>> = {
  light: {
    page: '#FFFFFF',
    surface: '#F5F7F5',
    border: '#E3E8E4',
    text: '#1E2421',
    textSecondary: '#5E6A64',
    arabic: '#171D19',
    translation: '#424B46',
    divider: '#E3E8E4',
    isDark: false,
  },
  sepia: {
    page: '#F6EFE1',
    surface: '#EFE5D1',
    border: '#E0D2B8',
    text: '#3B2F22',
    textSecondary: '#76664F',
    arabic: '#33291E',
    translation: '#514331',
    divider: '#E0D2B8',
    isDark: false,
  },
  dark: {
    page: '#0E1311',
    surface: '#17201C',
    border: '#24322C',
    text: '#E4ECE8',
    textSecondary: '#9AACA4',
    arabic: '#F0F5F2',
    translation: '#C1CEC8',
    divider: '#24322C',
    isDark: true,
  },
};

let current = DEFAULT_SETTINGS;
let loadStarted = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

function loadOnce() {
  if (loadStarted) return;
  loadStarted = true;
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<QuranReaderSettings>;
      current = {
        lineSpacing: isOneOf(saved.lineSpacing, ['compact', 'normal', 'relaxed'])
          ? saved.lineSpacing
          : DEFAULT_SETTINGS.lineSpacing,
        pageTone: isOneOf(saved.pageTone, ['auto', 'light', 'sepia', 'dark'])
          ? saved.pageTone
          : DEFAULT_SETTINGS.pageTone,
      };
      emit();
    })
    .catch(() => {});
}

export function useQuranReaderSettings() {
  const { theme, themeMode } = useApp();
  const settings = useSyncExternalStore(subscribe, () => current);

  useEffect(loadOnce, []);

  const update = useCallback((patch: Partial<QuranReaderSettings>) => {
    current = { ...current, ...patch };
    emit();
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current)).catch(() => {});
  }, []);

  const tokens = useMemo<QuranReaderTokens>(() => {
    const colors = settings.pageTone === 'auto'
      ? {
          page: theme.background,
          surface: theme.backgroundSecondary,
          border: theme.cardBorder,
          text: theme.text,
          textSecondary: theme.textSecondary,
          arabic: theme.arabicText,
          translation: theme.translationText,
          divider: theme.divider,
          isDark: themeMode === 'night',
        }
      : FIXED_PAGES[settings.pageTone];

    return {
      ...colors,
      accent: theme.tint,
      lineHeightRatio: LINE_HEIGHTS[settings.lineSpacing],
    };
  }, [settings, theme, themeMode]);

  return { settings, update, tokens };
}