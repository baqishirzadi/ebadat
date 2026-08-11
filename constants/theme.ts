/**
 * Theme system for Ebadat Quran App
 * Supports: Light, Dark (Night), Turquoise Blue, Light Olive Green
 * With proper RTL font support for Arabic, Dari, and Pashto
 */

import { Platform } from 'react-native';

export type ThemeMode = 'light' | 'night' | 'turquoise' | 'olive';

export interface ThemeColors {
  // Core colors
  primary: string;
  surface: string;
  textPrimary: string;
  accent: string;
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

  // Semantic
  warning: string;
  warningSurface: string;
  shadow: string;
}

// Naat header green palette (primary app color)
const NAAT_GREEN = '#1a4d3e';
const NAAT_GREEN_DARK = '#173f33';
const NAAT_GREEN_LIGHT = '#1f6b57';

// Light theme - Naat green as primary
const lightTheme: ThemeColors = {
  primary: NAAT_GREEN,
  surface: '#ffffff',
  textPrimary: '#1a1a1a',
  accent: '#d4af37',
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

  warning: '#b45309',
  warningSurface: '#fff7ed',
  shadow: 'rgba(26, 77, 62, 0.12)',
};

// Night mode - neutral black/charcoal surfaces with a restrained green accent.
// Keeping the layers distinct prevents the dark theme from becoming a flat block
// while preserving the app's Naat-green identity.
const nightTheme: ThemeColors = {
  primary: '#2a9d84',
  surface: '#121816',
  textPrimary: '#eef4f1',
  accent: '#d4af37',
  text: '#eef4f1',
  textSecondary: '#a0b2ab',
  background: '#050807',
  backgroundSecondary: '#0d1411',
  tint: '#2a9d84',
  icon: '#8a9c95',
  tabIconDefault: '#6e8079',
  tabIconSelected: '#2a9d84',
  
  arabicText: '#e7efeb',
  translationText: '#b6c6bf',
  ayahNumber: '#2a9d84',
  surahHeader: '#12483a',
  surahHeaderText: '#f1f7f4',
  bismillah: '#62c2a5',
  
  card: '#111a17',
  cardBorder: '#24372f',
  divider: '#1d2a25',
  bookmark: '#d4af37',
  playing: '#2a9d84',
  
  tabBar: '#080c0a',
  tabBarBorder: '#1a2b23',

  warning: '#f59e0b',
  warningSurface: '#1a1408',
  shadow: 'rgba(0, 0, 0, 0.55)',
};

// Turquoise - neutral page canvas with turquoise reserved for app surfaces and accents.
// The previous palette tinted the entire page through background/backgroundSecondary.
const turquoiseTheme: ThemeColors = {
  primary: '#0b7f7a',
  surface: '#ffffff',
  textPrimary: '#123b3a',
  accent: '#d4af37',
  text: '#123b3a',
  textSecondary: '#54706e',
  background: '#f7faf9',
  backgroundSecondary: '#eef4f2',
  tint: '#0b7f7a',
  icon: '#68817e',
  tabIconDefault: '#68817e',
  tabIconSelected: '#0b7f7a',
  
  arabicText: '#102e2d',
  translationText: '#31514f',
  ayahNumber: '#0b7f7a',
  surahHeader: '#0b7f7a',
  surahHeaderText: '#ffffff',
  bismillah: '#07635f',
  
  card: '#ffffff',
  cardBorder: '#d8e3e0',
  divider: '#e3ebe8',
  bookmark: '#d4af37',
  playing: '#0b7f7a',
  
  tabBar: '#ffffff',
  tabBarBorder: '#d8e3e0',

  warning: '#b45309',
  warningSurface: '#fff7ed',
  shadow: 'rgba(11, 127, 122, 0.14)',
};

// Olive - Naat green primary (unified with Naat header)
const oliveTheme: ThemeColors = {
  primary: '#6b8e23',
  surface: '#fafcf5',
  textPrimary: '#2a3a2a',
  accent: '#d4af37',
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

  warning: '#b45309',
  warningSurface: '#fff7ed',
  shadow: 'rgba(107, 142, 35, 0.12)',
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
  night: ['#050807', '#0b1712', '#10382c'],
  turquoise: ['#075e5b', '#0b7f7a', '#19a69f'],
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
export type QuranFontFamily = 'qpcHafs' | 'scheherazade';

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
  qpcHafs: {
    name: 'QPCHafs',
    displayName: 'QPC Hafs v2.2',
    displayNameDari: 'مصحف حفص',
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

// RTL container for views that need explicit direction (not inherited from I18nManager alone)
export const RTL_CONTAINER = Platform.select({
  ios: { direction: 'rtl' as const },
  android: { direction: 'rtl' as const },
  default: {},
}) as import('react-native').ViewStyle;
