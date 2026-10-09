/**
 * Articles System Types
 * Type definitions for scholars, articles, and categories
 */

export type ArticleLanguage = 'dari' | 'pashto' | 'english' | 'turkish' | 'arabic';

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
  nameTurkish: string;
  nameArabic: string;
  icon: string;
  color: string;
}

export const ARTICLE_CATEGORIES: Record<ArticleCategory, ArticleCategoryInfo> = {
  iman: {
    id: 'iman',
    nameDari: 'ایمان',
    namePashto: 'ایمان',
    nameEnglish: 'Faith',
    nameTurkish: 'İman',
    nameArabic: 'الإيمان',
    icon: 'favorite',
    color: '#E91E63',
  },
  salah: {
    id: 'salah',
    nameDari: 'نماز',
    namePashto: 'لمونځ',
    nameEnglish: 'Prayer',
    nameTurkish: 'Namaz',
    nameArabic: 'الصلاة',
    icon: 'access-time',
    color: '#2196F3',
  },
  akhlaq: {
    id: 'akhlaq',
    nameDari: 'اخلاق',
    namePashto: 'اخلاق',
    nameEnglish: 'Character',
    nameTurkish: 'Ahlak',
    nameArabic: 'الأخلاق',
    icon: 'auto-awesome',
    color: '#9C27B0',
  },
  family: {
    id: 'family',
    nameDari: 'خانواده',
    namePashto: 'کورنۍ',
    nameEnglish: 'Family',
    nameTurkish: 'Aile',
    nameArabic: 'الأسرة',
    icon: 'family-restroom',
    color: '#FF9800',
  },
  anxiety: {
    id: 'anxiety',
    nameDari: 'اضطراب',
    namePashto: 'اندېښنه',
    nameEnglish: 'Anxiety',
    nameTurkish: 'Kaygı',
    nameArabic: 'القلق',
    icon: 'psychology',
    color: '#F44336',
  },
  rizq: {
    id: 'rizq',
    nameDari: 'رزق',
    namePashto: 'رزق',
    nameEnglish: 'Provision',
    nameTurkish: 'Rızık',
    nameArabic: 'الرزق',
    icon: 'attach-money',
    color: '#4CAF50',
  },
  dua: {
    id: 'dua',
    nameDari: 'دعا',
    namePashto: 'دعا',
    nameEnglish: 'Supplication',
    nameTurkish: 'Dua',
    nameArabic: 'الدعاء',
    icon: 'favorite-border',
    color: '#00BCD4',
  },
  tazkiyah: {
    id: 'tazkiyah',
    nameDari: 'تزکیه',
    namePashto: 'تزکیه',
    nameEnglish: 'Purification',
    nameTurkish: 'Tezkiye',
    nameArabic: 'التزكية',
    icon: 'spa',
    color: '#795548',
  },
  asma_husna: {
    id: 'asma_husna',
    nameDari: 'اسماء الحسنی',
    namePashto: 'اسماء الحسنی',
    nameEnglish: 'Names of Allah',
    nameTurkish: 'Esmaül Hüsna',
    nameArabic: 'أسماء الله الحسنى',
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
