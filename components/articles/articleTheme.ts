import type { ViewStyle } from 'react-native';

import { ARTICLE_CATEGORIES, type ArticleCategory, type ArticleLanguage } from '@/types/articles';
import type { AppLanguage } from '@/types/quran';

export interface CategoryPalette {
  primary: string;
  deep: string;
  accent: string;
}

const CATEGORY_PALETTES: Record<ArticleCategory, CategoryPalette> = {
  iman: { primary: '#1F6B4F', deep: '#123F2F', accent: '#C9A646' },
  salah: { primary: '#1D5F96', deep: '#103A5E', accent: '#9FB8CF' },
  akhlaq: { primary: '#6B3F8F', deep: '#41255A', accent: '#C9A646' },
  family: { primary: '#A0582A', deep: '#62341A', accent: '#E3B77A' },
  anxiety: { primary: '#2C6E8E', deep: '#1A4459', accent: '#A8D3E6' },
  rizq: { primary: '#3D7A35', deep: '#244A20', accent: '#C9DDB0' },
  dua: { primary: '#14707A', deep: '#0B464C', accent: '#A6DCE0' },
  tazkiyah: { primary: '#7A5235', deep: '#4A3020', accent: '#E0B477' },
  asma_husna: { primary: '#0E6B5E', deep: '#08433B', accent: '#C9A646' },
};

export function categoryPalette(category: ArticleCategory | string): CategoryPalette {
  return CATEGORY_PALETTES[category as ArticleCategory] ?? CATEGORY_PALETTES.iman;
}

export function categoryName(category: ArticleCategory | string, language: AppLanguage | ArticleLanguage): string {
  const info = ARTICLE_CATEGORIES[category as ArticleCategory] ?? ARTICLE_CATEGORIES.iman;
  if (language === 'pashto') return info.namePashto;
  if (language === 'english') return info.nameEnglish;
  return info.nameDari;
}

export function categoryIcon(category: ArticleCategory | string): string {
  return (ARTICLE_CATEGORIES[category as ArticleCategory] ?? ARTICLE_CATEGORIES.iman).icon;
}

/** Hex colour with an alpha suffix, e.g. `withAlpha('#1F6B4F', 0.12)`. */
export function withAlpha(hex: string, alpha: number): string {
  const value = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex.slice(0, 7)}${value}`;
}

/**
 * Article text is always Dari or Pashto, so these containers lay out
 * right-to-left even when the app chrome is English.
 */
export const ARTICLE_DIRECTION: ViewStyle = { direction: 'rtl' };

const HONORIFIC_PREFIX =
  /^(?:امام|مولانا|مولوی|شیخ|خواجه|سید|میرزا|شاه|مفتی|امیر|حضرت|علامه|استاد|ابو)\s+/;

/** Name without trailing honorifics such as «(رح)», for compact labels. */
export function shortScholarName(fullName: string): string {
  return fullName.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

/** The letter shown in a scholar's avatar circle. */
export function scholarInitial(fullName: string): string {
  let name = shortScholarName(fullName);
  for (let i = 0; i < 2 && HONORIFIC_PREFIX.test(name); i += 1) {
    name = name.replace(HONORIFIC_PREFIX, '');
  }
  return Array.from(name.trim())[0] ?? '؟';
}

const AVATAR_TONES = ['#1F6B4F', '#7A5235', '#1D5F96', '#6B3F8F', '#14707A', '#A0582A', '#3D7A35'];

export function scholarTone(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}
