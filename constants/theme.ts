/**
 * Theme system for Ebadat Quran App
 * Supports: Light (Naat green), Night, Sapphire, Burgundy
 * With proper RTL font support for Arabic, Dari, and Pashto
 */

import { Platform } from 'react-native';

export type ThemeMode = 'light' | 'night' | 'sapphire' | 'burgundy';

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
  background: '#f6f3ee',
  backgroundSecondary: '#efeae3',
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
  surface: '#17241f',
  textPrimary: '#eef4f1',
  accent: '#d4af37',
  text: '#eef4f1',
  textSecondary: '#b7c7c0',
  background: '#050807',
  backgroundSecondary: '#101916',
  tint: '#2a9d84',
  icon: '#a8bab3',
  tabIconDefault: '#93a79f',
  tabIconSelected: '#2a9d84',
  
  arabicText: '#e7efeb',
  translationText: '#c8d5cf',
  ayahNumber: '#2a9d84',
  surahHeader: '#12483a',
  surahHeaderText: '#f1f7f4',
  bismillah: '#62c2a5',
  
  card: '#17241f',
  cardBorder: '#2f4a40',
  divider: '#2a3d35',
  bookmark: '#d4af37',
  playing: '#2a9d84',
  
  tabBar: '#080c0a',
  tabBarBorder: '#1a2b23',

  warning: '#f59e0b',
  warningSurface: '#1a1408',
  shadow: 'rgba(0, 0, 0, 0.55)',
};

// Sapphire — cool ivory page, navy ink, gold kept for bookmarks.
const sapphireTheme: ThemeColors = {
  primary: '#1e3a5f',
  surface: '#ffffff',
  textPrimary: '#1a2332',
  accent: '#c6a15b',
  text: '#1a2332',
  textSecondary: '#5c6b7a',
  background: '#f3f5f8',
  backgroundSecondary: '#e7ebf1',
  tint: '#1e3a5f',
  icon: '#6a7888',
  tabIconDefault: '#6a7888',
  tabIconSelected: '#1e3a5f',

  arabicText: '#121a26',
  translationText: '#3d4c5e',
  ayahNumber: '#1e3a5f',
  surahHeader: '#1e3a5f',
  surahHeaderText: '#ffffff',
  bismillah: '#16304f',

  card: '#ffffff',
  cardBorder: '#d5dde6',
  divider: '#e1e7ee',
  bookmark: '#c6a15b',
  playing: '#1e3a5f',

  tabBar: '#ffffff',
  tabBarBorder: '#d5dde6',

  warning: '#b45309',
  warningSurface: '#fff7ed',
  shadow: 'rgba(30, 58, 95, 0.14)',
};

// Burgundy — warm ivory page, wine accent, manuscript gold.
const burgundyTheme: ThemeColors = {
  primary: '#6b2d3c',
  surface: '#fffdfb',
  textPrimary: '#2c1810',
  accent: '#c4a574',
  text: '#2c1810',
  textSecondary: '#7a655c',
  background: '#faf6f2',
  backgroundSecondary: '#f3ebe4',
  tint: '#6b2d3c',
  icon: '#8a756c',
  tabIconDefault: '#8a756c',
  tabIconSelected: '#6b2d3c',

  arabicText: '#24140f',
  translationText: '#4a342c',
  ayahNumber: '#6b2d3c',
  surahHeader: '#6b2d3c',
  surahHeaderText: '#ffffff',
  bismillah: '#5a2432',

  card: '#fffdfb',
  cardBorder: '#eadfd6',
  divider: '#f0e6de',
  bookmark: '#c4a574',
  playing: '#6b2d3c',

  tabBar: '#fffdfb',
  tabBarBorder: '#eadfd6',

  warning: '#b45309',
  warningSurface: '#fff7ed',
  shadow: 'rgba(107, 45, 60, 0.14)',
};

export const Themes: Record<ThemeMode, ThemeColors> = {
  light: lightTheme,
  night: nightTheme,
  sapphire: sapphireTheme,
  burgundy: burgundyTheme,
};

const THEME_MODES: readonly ThemeMode[] = ['light', 'night', 'sapphire', 'burgundy'];

/** Map a saved theme id onto the current set. Retired turquoise and olive become the new accents. */
export function resolveThemeMode(value: unknown): ThemeMode {
  if (value === 'turquoise') return 'sapphire';
  if (value === 'olive') return 'burgundy';
  if (typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value)) {
    return value as ThemeMode;
  }
  return 'light';
}

/** Naat header gradient colors - use for headers across the app */
export const NAAT_GRADIENT: Record<ThemeMode, [string, string, string]> = {
  light: [NAAT_GREEN_DARK, NAAT_GREEN, NAAT_GREEN_LIGHT],
  night: ['#050807', '#0b1712', '#10382c'],
  sapphire: ['#152a45', '#1e3a5f', '#2f5580'],
  burgundy: ['#4a1e28', '#6b2d3c', '#8f4554'],
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
export type PashtoFontFamily = 'naskh' | 'amiri';

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
  boldName: string;
  displayName: string;
  displayNamePashto: string;
}> = {
  naskh: {
    name: 'NotoNaskhArabic-Regular',
    boldName: 'NotoNaskhArabic-Bold',
    displayName: 'Noto Naskh',
    displayNamePashto: 'نسخ (معیاري)',
  },
  amiri: {
    name: 'Amiri',
    boldName: 'Amiri-Bold',
    displayName: 'Amiri Naskh',
    displayNamePashto: 'امیري نسخ',
  },
};

export const DEFAULT_PASHTO_FONT: PashtoFontFamily = 'naskh';

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
