import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { useApp } from '@/context/AppContext';

export type ReaderTextSize = 's' | 'm' | 'l' | 'xl';
export type ReaderLineSpacing = 'compact' | 'normal' | 'relaxed';
export type ReaderPage = 'auto' | 'light' | 'sepia' | 'dark';
export type ReaderAlign = 'justify' | 'start';

export interface ArticleReaderSettings {
  textSize: ReaderTextSize;
  lineSpacing: ReaderLineSpacing;
  page: ReaderPage;
  align: ReaderAlign;
}

export interface ArticleReaderTokens {
  fontSize: number;
  lineHeightRatio: number;
  page: string;
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  isDark: boolean;
}

const STORAGE_KEY = '@ebadat/article_reader_settings';

export const READER_TEXT_SIZES: Record<ReaderTextSize, number> = { s: 17, m: 19, l: 21, xl: 23 };
export const READER_LINE_SPACING: Record<ReaderLineSpacing, number> = {
  compact: 1.75,
  normal: 1.95,
  relaxed: 2.15,
};

const DEFAULT_SETTINGS: ArticleReaderSettings = { textSize: 'm', lineSpacing: 'normal', page: 'auto', align: 'justify' };

const FIXED_PAGES: Record<Exclude<ReaderPage, 'auto'>, Omit<ArticleReaderTokens, 'fontSize' | 'lineHeightRatio'>> = {
  light: {
    page: '#FFFFFF',
    surface: '#F5F7F5',
    border: '#E3E8E4',
    text: '#1E2421',
    textSecondary: '#5E6A64',
    isDark: false,
  },
  sepia: {
    page: '#F6EFE1',
    surface: '#EFE5D1',
    border: '#E0D2B8',
    text: '#3B2F22',
    textSecondary: '#76664F',
    isDark: false,
  },
  dark: {
    page: '#0E1311',
    surface: '#17201C',
    border: '#24322C',
    text: '#E4ECE8',
    textSecondary: '#9AACA4',
    isDark: true,
  },
};

let current: ArticleReaderSettings = DEFAULT_SETTINGS;
let loadStarted = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}

function loadOnce() {
  if (loadStarted) return;
  loadStarted = true;
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<ArticleReaderSettings>;
      current = {
        textSize: isOneOf(saved.textSize, ['s', 'm', 'l', 'xl'] as const) ? saved.textSize : current.textSize,
        lineSpacing: isOneOf(saved.lineSpacing, ['compact', 'normal', 'relaxed'] as const)
          ? saved.lineSpacing
          : current.lineSpacing,
        page: isOneOf(saved.page, ['auto', 'light', 'sepia', 'dark'] as const) ? saved.page : current.page,
        align: isOneOf(saved.align, ['justify', 'start'] as const) ? saved.align : current.align,
      };
      emit();
    })
    .catch(() => {});
}

export function useArticleReaderSettings() {
  const { theme, themeMode } = useApp();
  const settings = useSyncExternalStore(subscribe, () => current);

  useEffect(loadOnce, []);

  const update = useCallback((patch: Partial<ArticleReaderSettings>) => {
    current = { ...current, ...patch };
    emit();
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current)).catch(() => {});
  }, []);

  const tokens = useMemo<ArticleReaderTokens>(() => {
    const colors =
      settings.page !== 'auto'
        ? FIXED_PAGES[settings.page]
        : themeMode === 'night'
          ? FIXED_PAGES.dark
          : {
              page: theme.background,
              surface: theme.backgroundSecondary,
              border: theme.cardBorder,
              text: theme.text,
              textSecondary: theme.textSecondary,
              isDark: false,
            };
    return {
      ...colors,
      fontSize: READER_TEXT_SIZES[settings.textSize],
      lineHeightRatio: READER_LINE_SPACING[settings.lineSpacing],
    };
  }, [settings, theme, themeMode]);

  return { settings, update, tokens };
}
