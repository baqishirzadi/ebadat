/**
 * Articles System Types
 * Type definitions for scholars, articles, and categories
 */

export type ArticleLanguage = 'dari' | 'pashto';

export type ArticleCategory =
  | 'iman' // ایمان
  | 'salah' // نماز
  | 'akhlaq' // اخلاق
  | 'family' // خانواده
  | 'anxiety' // اضطراب
  | 'rizq' // رزق
  | 'dua' // دعا
  | 'tazkiyah' // تزکیه
  | 'asma_husna'; // اسماء الحسنی

export interface ArticleCategoryInfo {
  id: ArticleCategory;
  nameDari: string;
  namePashto: string;
  nameEnglish: string;
  icon: string;
  color: string;
}

export const ARTICLE_CATEGORIES: Record<ArticleCategory, ArticleCategoryInfo> = {
  iman: {
    id: 'iman',
    nameDari: 'ایمان',
    namePashto: 'ایمان',
    nameEnglish: 'Faith',
    icon: 'favorite',
    color: '#E91E63',
  },
  salah: {
    id: 'salah',
    nameDari: 'نماز',
    namePashto: 'لمونځ',
    nameEnglish: 'Prayer',
    icon: 'access-time',
    color: '#2196F3',
  },
  akhlaq: {
    id: 'akhlaq',
    nameDari: 'اخلاق',
    namePashto: 'اخلاق',
    nameEnglish: 'Character',
    icon: 'auto-awesome',
    color: '#9C27B0',
  },
  family: {
    id: 'family',
    nameDari: 'خانواده',
    namePashto: 'کورنۍ',
    nameEnglish: 'Family',
    icon: 'family-restroom',
    color: '#FF9800',
  },
  anxiety: {
    id: 'anxiety',
    nameDari: 'اضطراب',
    namePashto: 'اندېښنه',
    nameEnglish: 'Anxiety',
    icon: 'psychology',
    color: '#F44336',
  },
  rizq: {
    id: 'rizq',
    nameDari: 'رزق',
    namePashto: 'رزق',
    nameEnglish: 'Provision',
    icon: 'attach-money',
    color: '#4CAF50',
  },
  dua: {
    id: 'dua',
    nameDari: 'دعا',
    namePashto: 'دعا',
    nameEnglish: 'Supplication',
    icon: 'favorite-border',
    color: '#00BCD4',
  },
  tazkiyah: {
    id: 'tazkiyah',
    nameDari: 'تزکیه',
    namePashto: 'تزکیه',
    nameEnglish: 'Purification',
    icon: 'spa',
    color: '#795548',
  },
  asma_husna: {
    id: 'asma_husna',
    nameDari: 'اسماء الحسنی',
    namePashto: 'اسماء الحسنی',
    nameEnglish: 'Names of Allah',
    icon: 'vpn-key',
    color: '#009688',
  },
};

export interface Scholar {
  id: string; // Supabase Auth UID or custom ID
  email: string;
  fullName: string;
  bio: string;
  photoUrl?: string;
  verified: boolean;
  role: 'scholar';
  createdAt: Date;
}

export interface Article {
  id: string;
  title: string;
  language: ArticleLanguage;
  authorId: string;
  authorName: string;
  category: ArticleCategory;
  body: string; // Rich text (HTML/Markdown)
  audioUrl?: string;
  published: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  readingTimeEstimate: number; // minutes
  viewCount: number;
  bookmarkCount: number;
  draft?: boolean;
  notificationSent?: boolean;
}

export interface ArticleDraft {
  id: string;
  title: string;
  language: ArticleLanguage;
  authorId: string;
  category: ArticleCategory;
  body: string;
  lastSavedAt: Date;
}

export interface UserBookmark {
  articleId: string;
  bookmarkedAt: Date;
}

export interface ReadingProgress {
  articleId: string;
  progressPercentage: number;
  lastReadAt: Date;
}
