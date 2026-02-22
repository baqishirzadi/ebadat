/**
 * Article Storage
 * Offline caching for articles using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article, Scholar } from '@/types/articles';

const STORAGE_KEYS = {
  ARTICLES_CACHE: '@ebadat/articles_cache',
  SCHOLARS_CACHE: '@ebadat/scholars_cache',
  BOOKMARKS: '@ebadat/article_bookmarks',
  READING_PROGRESS: '@ebadat/reading_progress',
  LAST_SYNC: '@ebadat/articles_last_sync',
};

const MAX_CACHED_ARTICLES = 100;

/**
 * Cache articles locally
 */
export async function cacheArticles(articles: Article[]): Promise<void> {
  try {
    // Get existing cache
    const existing = await getCachedArticles();
    
    // Merge with new articles (newer articles take priority)
    const articleMap = new Map<string, Article>();
    
    // Add existing articles
    existing.forEach((article) => {
      articleMap.set(article.id, article);
    });
    
    // Add/update with new articles
    articles.forEach((article) => {
      articleMap.set(article.id, article);
    });
    
    // Convert to array and limit size
    const allArticles = Array.from(articleMap.values());
    const sorted = allArticles.sort((a, b) => {
      const aDate = a.publishedAt || a.createdAt;
      const bDate = b.publishedAt || b.createdAt;
      return bDate.getTime() - aDate.getTime();
    });
    
    const limited = sorted.slice(0, MAX_CACHED_ARTICLES);
    
    await AsyncStorage.setItem(STORAGE_KEYS.ARTICLES_CACHE, JSON.stringify(limited));
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
  } catch (error) {
    console.error('Error caching articles:', error);
  }
}

/**
 * Get cached articles
 */
export async function getCachedArticles(): Promise<Article[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ARTICLES_CACHE);
    if (!data) return [];
    
    const articles = JSON.parse(data) as Article[];
    // Convert date strings back to Date objects
    return articles.map((article) => ({
      ...article,
      createdAt: new Date(article.createdAt),
      updatedAt: new Date(article.updatedAt),
      publishedAt: article.publishedAt ? new Date(article.publishedAt) : undefined,
    }));
  } catch (error) {
    console.error('Error getting cached articles:', error);
    return [];
  }
}

/**
 * Get cached article by ID
 */
export async function getCachedArticleById(articleId: string): Promise<Article | null> {
  const articles = await getCachedArticles();
  return articles.find((a) => a.id === articleId) || null;
}

/**
 * Cache scholars
 */
export async function cacheScholars(scholars: Scholar[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SCHOLARS_CACHE, JSON.stringify(scholars));
  } catch (error) {
    console.error('Error caching scholars:', error);
  }
}

/**
 * Get cached scholars
 */
export async function getCachedScholars(): Promise<Scholar[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SCHOLARS_CACHE);
    if (!data) return [];
    
    const scholars = JSON.parse(data) as Scholar[];
    return scholars.map((scholar) => ({
      ...scholar,
      createdAt: new Date(scholar.createdAt),
    }));
  } catch (error) {
    console.error('Error getting cached scholars:', error);
    return [];
  }
}

/**
 * Add bookmark
 */
export async function addBookmark(articleId: string): Promise<void> {
  try {
    const bookmarks = await getBookmarks();
    if (!bookmarks.includes(articleId)) {
      bookmarks.push(articleId);
      await AsyncStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    }
  } catch (error) {
    console.error('Error adding bookmark:', error);
  }
}

/**
 * Remove bookmark
 */
export async function removeBookmark(articleId: string): Promise<void> {
  try {
    const bookmarks = await getBookmarks();
    const filtered = bookmarks.filter((id) => id !== articleId);
    await AsyncStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing bookmark:', error);
  }
}

/**
 * Get all bookmarks
 */
export async function getBookmarks(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    if (!data) return [];
    return JSON.parse(data) as string[];
  } catch (error) {
    console.error('Error getting bookmarks:', error);
    return [];
  }
}

/**
 * Check if article is bookmarked
 */
export async function isBookmarked(articleId: string): Promise<boolean> {
  const bookmarks = await getBookmarks();
  return bookmarks.includes(articleId);
}

/**
 * Save reading progress
 */
export async function saveReadingProgress(
  articleId: string,
  progressPercentage: number
): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.READING_PROGRESS);
    const progress = data ? JSON.parse(data) : {};
    progress[articleId] = {
      progressPercentage,
      lastReadAt: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.READING_PROGRESS, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving reading progress:', error);
  }
}

/**
 * Get reading progress
 */
export async function getReadingProgress(articleId: string): Promise<number> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.READING_PROGRESS);
    if (!data) return 0;
    const progress = JSON.parse(data);
    return progress[articleId]?.progressPercentage || 0;
  } catch (error) {
    console.error('Error getting reading progress:', error);
    return 0;
  }
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTimestamp(): Promise<number | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return data ? parseInt(data, 10) : null;
  } catch (error) {
    return null;
  }
}

/**
 * Clear all cached data
 */
export async function clearArticleCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ARTICLES_CACHE,
      STORAGE_KEYS.SCHOLARS_CACHE,
      STORAGE_KEYS.BOOKMARKS,
      STORAGE_KEYS.READING_PROGRESS,
      STORAGE_KEYS.LAST_SYNC,
    ]);
  } catch (error) {
    console.error('Error clearing article cache:', error);
  }
}
