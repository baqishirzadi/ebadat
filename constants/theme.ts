/**
 * Theme system for Ebadat Quran App
 * Supports: Light, Dark (Night), Turquoise Blue, Light Olive Green
 * With proper RTL font support for Arabic, Dari, and Pashto
 */

import { Platform } from 'react-native';

export type ThemeMode = 'light' | 'night' | 'turquoise' | 'olive';

export interface ThemeColors {
  // Core colors
  text: string;
  textSecondary: string;
  background: string;
  backgroundSecondary: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  
  // Quran specific
  arabicText: string;
  translationText: string;
  ayahNumber: string;
  surahHeader: string;
  surahHeaderText: string;
  bismillah: string;
  
  // UI Elements
  card: string;
  cardBorder: string;
  divider: string;
  bookmark: string;
  playing: string;
  
  // Tab bar
  tabBar: string;
  tabBarBorder: string;
}

// Naat header green palette (primary app color)
const NAAT_GREEN = '#1a4d3e';
const NAAT_GREEN_DARK = '#173f33';
const NAAT_GREEN_LIGHT = '#1f6b57';

// Light theme - Naat green as primary
const lightTheme: ThemeColors = {
  text: '#1a1a1a',
  textSecondary: '#666666',
  background: '#fefefe',
  backgroundSecondary: '#f8f5f0',
  tint: NAAT_GREEN,
  icon: '#687076',
  tabIconDefault: '#687076',
  tabIconSelected: NAAT_GREEN,
  
  arabicText: '#000000',
  translationText: '#333333',
  ayahNumber: NAAT_GREEN,
  surahHeader: NAAT_GREEN,
  surahHeaderText: '#ffffff',
  bismillah: NAAT_GREEN,
  
  card: '#ffffff',
  cardBorder: '#e8e4df',
  divider: '#e0dcd7',
  bookmark: '#d4af37',
  playing: NAAT_GREEN,
  
  tabBar: '#ffffff',
  tabBarBorder: '#e0dcd7',
};

// Night mode - Naat green accent on dark (AMOLED friendly)
const nightTheme: ThemeColors = {
  text: '#c9c9c9',
  textSecondary: '#888888',
  background: '#000000',
  backgroundSecondary: '#0a0a0a',
  tint: NAAT_GREEN_LIGHT,
  icon: '#888888',
  tabIconDefault: '#666666',
  tabIconSelected: NAAT_GREEN_LIGHT,
  
  arabicText: '#d4d4d4',
  translationText: '#a8a8a8',
  ayahNumber: NAAT_GREEN_LIGHT,
  surahHeader: NAAT_GREEN_DARK,
  surahHeaderText: '#c9c9c9',
  bismillah: NAAT_GREEN_LIGHT,
  
  card: '#0d0d0d',
  cardBorder: '#1a1a1a',
  divider: '#1f1f1f',
  bookmark: '#d4af37',
  playing: NAAT_GREEN_LIGHT,
  
  tabBar: '#000000',
  tabBarBorder: '#1a1a1a',
};

// Turquoise - Naat green primary (unified with Naat header)
const turquoiseTheme: ThemeColors = {
  text: '#1a3a3a',
  textSecondary: '#4a6a6a',
  background: '#e8f5f5',
  backgroundSecondary: '#d0ebeb',
  tint: '#008b8b',
  icon: '#5a8a8a',
  tabIconDefault: '#5a8a8a',
  tabIconSelected: '#008b8b',
  
  arabicText: '#0a2a2a',
  translationText: '#2a4a4a',
  ayahNumber: '#008b8b',
  surahHeader: '#008b8b',
  surahHeaderText: '#ffffff',
  bismillah: '#006666',
  
  card: '#f0fafa',
  cardBorder: '#b8d8d8',
  divider: '#c8e8e8',
  bookmark: '#d4af37',
  playing: '#008b8b',
  
  tabBar: '#e0f0f0',
  tabBarBorder: '#b8d8d8',
};

// Olive - Naat green primary (unified with Naat header)
const oliveTheme: ThemeColors = {
  text: '#2a3a2a',
  textSecondary: '#5a6a5a',
  background: '#f5f8f0',
  backgroundSecondary: '#e8ede0',
  tint: '#6b8e23',
  icon: '#7a8a6a',
  tabIconDefault: '#7a8a6a',
  tabIconSelected: '#6b8e23',
  
  arabicText: '#1a2a1a',
  translationText: '#3a4a3a',
  ayahNumber: '#6b8e23',
  surahHeader: '#6b8e23',
  surahHeaderText: '#ffffff',
  bismillah: '#556b2f',
  
  card: '#fafcf5',
  cardBorder: '#d0dab8',
  divider: '#dce6c8',
  bookmark: '#d4af37',
  playing: '#6b8e23',
  
  tabBar: '#f0f5e8',
  tabBarBorder: '#d0dab8',
};

export const Themes: Record<ThemeMode, ThemeColors> = {
  light: lightTheme,
  night: nightTheme,
  turquoise: turquoiseTheme,
  olive: oliveTheme,
};

/** Naat header gradient colors - use for headers across the app */
export const NAAT_GRADIENT: Record<ThemeMode, [string, string, string]> = {
  light: [NAAT_GREEN_DARK, NAAT_GREEN, NAAT_GREEN_LIGHT],
  night: ['#0a0a0a', '#141414', '#1a1a1a'],
  turquoise: ['#006666', '#008b8b', '#1aa3a3'],
  olive: ['#556b2f', '#6b8e23', '#88a946'],
};

// Legacy Colors export for backwards compatibility
export const Colors = {
  light: {
    text: lightTheme.text,
    background: lightTheme.background,
    tint: lightTheme.tint,
    icon: lightTheme.icon,
    tabIconDefault: lightTheme.tabIconDefault,
    tabIconSelected: lightTheme.tabIconSelected,
  },
  dark: {
    text: nightTheme.text,
    background: nightTheme.background,
    tint: nightTheme.tint,
    icon: nightTheme.icon,
    tabIconDefault: nightTheme.tabIconDefault,
    tabIconSelected: nightTheme.tabIconSelected,
  },
};

// ═══════════════════════════════════════════════════
// FONT CONFIGURATION
// ═══════════════════════════════════════════════════

// Arabic Quran Font Type
export type QuranFontFamily = 'notoNaskh' | 'amiriQuran' | 'scheherazade';

// Dari/Farsi Font Type
export type DariFontFamily = 'vazirmatn' | 'amiri';

// Pashto Font Type  
export type PashtoFontFamily = 'amiri' | 'nastaliq';

// Font configuration
export const QuranFonts: Record<QuranFontFamily, { 
  name: string; 
  displayName: string; 
  displayNameDari: string;
}> = {
  notoNaskh: {
    name: 'NotoNaskhArabic',
    displayName: 'Noto Naskh',
    displayNameDari: 'نوتو نسخ (پیشنهادی)',
  },
  amiriQuran: {
    name: 'QuranFont',
    displayName: 'نسخ کلاسیک',
    displayNameDari: 'نسخ کلاسیک',
  },
  scheherazade: {
    name: 'ScheherazadeNew',
    displayName: 'Uthmani Taha',
    displayNameDari: 'عثمان طه',
  },
};

export const DariFonts: Record<DariFontFamily, {
  name: string;
  displayName: string;
  displayNameDari: string;
}> = {
  vazirmatn: {
    name: 'Vazirmatn',
    displayName: 'Vazirmatn (Modern)',
    displayNameDari: 'وزیرمتن (مدرن)',
  },
  amiri: {
    name: 'Amiri',
    displayName: 'Amiri (Traditional)',
    displayNameDari: 'امیری (سنتی)',
  },
};

export const PashtoFonts: Record<PashtoFontFamily, {
  name: string;
  displayName: string;
  displayNamePashto: string;
}> = {
  amiri: {
    name: 'Amiri',
    displayName: 'Amiri Naskh',
    displayNamePashto: 'امیری نسخ',
  },
  nastaliq: {
    name: 'NotoNastaliqUrdu',
    displayName: 'Nastaliq',
    displayNamePashto: 'نستعلیق',
  },
};

// Platform fonts
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Typography scales
export const Typography = {
  arabic: {
    small: 22,
    medium: 28,
    large: 34,
    xlarge: 40,
  },
  translation: {
    small: 14,
    medium: 16,
    large: 18,
    xlarge: 20,
  },
  ui: {
    caption: 12,
    body: 14,
    subtitle: 16,
    title: 20,
    heading: 24,
    display: 32,
  },
};

// Spacing
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};
// RTL Text Styles
export const RTLStyles = {
  textAlign: 'right' as const,
  writingDirection: 'rtl' as const,
};
