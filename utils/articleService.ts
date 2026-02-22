/**
 * Article Service
 * CRUD operations for articles using Supabase
 * Falls back to local JSON file if Supabase is not available
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import * as articleStorage from './articleStorage';
import { Article, ArticleCategory, ArticleLanguage } from '@/types/articles';
import articlesSeedData from '@/data/articles-seed.json';

const ENABLE_ARTICLES_REMOTE = true;

export function isArticlesRemoteEnabled(): boolean {
  return ENABLE_ARTICLES_REMOTE && isSupabaseConfigured();
}

/**
 * Calculate reading time estimate (words per minute: 200 for Dari/Pashto)
 */
export function calculateReadingTime(body: string): number {
  // Remove HTML tags if present
  const text = body.replace(/<[^>]*>/g, '');
  // Count words (split by whitespace)
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  const wordsPerMinute = 200;
  const minutes = Math.ceil(words.length / wordsPerMinute);
  return Math.max(1, minutes); // Minimum 1 minute
}

/**
 * Helper function to convert Supabase row to Article
 */
function rowToArticle(row: any): Article {
  return {
    id: row.id,
    title: row.title || '',
    language: row.language || 'dari',
    authorId: row.author_id,
    authorName: row.author_name || '',
    category: row.category || 'iman',
    body: row.body || '',
    audioUrl: row.audio_url,
    published: row.published || false,
    publishedAt: row.published_at ? new Date(row.published_at) : undefined,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    readingTimeEstimate: row.reading_time_estimate || 1,
    viewCount: row.view_count || 0,
    bookmarkCount: row.bookmark_count || 0,
    draft: row.draft || false,
    notificationSent: row.notification_sent || false,
  };
}

/**
 * Create a new article
 */
export async function createArticle(
  authorId: string,
  authorName: string,
  articleData: {
    title: string;
    language: ArticleLanguage;
    category: ArticleCategory;
    body: string;
    audioUrl?: string;
    published?: boolean;
  }
): Promise<string> {
  if (!isArticlesRemoteEnabled()) {
    throw new Error('Articles remote source disabled');
  }

  try {
    const supabase = getSupabaseClient();
    const readingTime = calculateReadingTime(articleData.body);
    const now = new Date().toISOString();

    const articleDataToInsert = {
      title: articleData.title,
      language: articleData.language,
      author_id: authorId,
      author_name: authorName,
      category: articleData.category,
      body: articleData.body,
      audio_url: articleData.audioUrl || null,
      published: articleData.published || false,
      published_at: articleData.published ? now : null,
      reading_time_estimate: readingTime,
      view_count: 0,
      bookmark_count: 0,
      draft: !articleData.published,
      notification_sent: false,
    };

    const { data, error } = await supabase
      .from('articles')
      .insert(articleDataToInsert)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating article:', error);
      throw error;
    }

    return data.id;
  } catch (error) {
    console.error('Error creating article:', error);
    throw error;
  }
}

/**
 * Update an article
 */
export async function updateArticle(
  articleId: string,
  updates: Partial<{
    title: string;
    language: ArticleLanguage;
    category: ArticleCategory;
    body: string;
    audioUrl: string;
    published: boolean;
  }>
): Promise<void> {
  if (!isArticlesRemoteEnabled()) {
    throw new Error('Articles remote source disabled');
  }

  try {
    const supabase = getSupabaseClient();
    const updateData: any = {};

    if (updates.title) updateData.title = updates.title;
    if (updates.language) updateData.language = updates.language;
    if (updates.category) updateData.category = updates.category;
    if (updates.body !== undefined) {
      updateData.body = updates.body;
      updateData.reading_time_estimate = calculateReadingTime(updates.body);
    }
    if (updates.audioUrl !== undefined) updateData.audio_url = updates.audioUrl;

    if (updates.published !== undefined) {
      updateData.published = updates.published;
      updateData.draft = !updates.published;
      if (updates.published) {
        updateData.published_at = new Date().toISOString();
        updateData.notification_sent = false; // Reset to send notification
      }
    }

    const { error } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', articleId);

    if (error) {
      console.error('Error updating article:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error updating article:', error);
    throw error;
  }
}

/**
 * Get article by ID
 */
export async function getArticleById(articleId: string): Promise<Article | null> {
  // Try cache first (fast and works offline)
  const cached = await articleStorage.getCachedArticleById(articleId);
  if (cached) {
    return cached;
  }

  if (isArticlesRemoteEnabled()) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .single();

      if (!error && data) {
        const article = rowToArticle(data);
        await articleStorage.cacheArticles([article]);
        return article;
      }
    } catch (error) {
      console.warn('Error getting article from Supabase, falling back to local/cache:', error);
    }
  }

  // Fallback to local JSON data (for offline/local IDs)
  return getLocalArticleById(articleId);
}

/**
 * Load articles from local JSON file
 */
function loadArticlesFromLocal(): Article[] {
  try {
    const now = new Date();
    const articles: Article[] = articlesSeedData.articles.map((articleData) => {
      // Generate a simple ID from title and author
      const id = `${articleData.authorId}_${articleData.title.substring(0, 20)}_${articleData.language}`.replace(/\s+/g, '_');
      
      return {
        id,
        title: articleData.title,
        language: articleData.language as ArticleLanguage,
        authorId: articleData.authorId,
        authorName: articleData.authorName,
        category: articleData.category as ArticleCategory,
        body: articleData.body,
        published: true,
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
        readingTimeEstimate: calculateReadingTime(articleData.body),
        viewCount: 0,
        bookmarkCount: 0,
        draft: false,
        notificationSent: false,
      };
    });

    console.log(`[Articles] Loaded ${articles.length} articles from local JSON file`);
    return articles;
  } catch (error) {
    console.error('Error loading articles from local file:', error);
    return [];
  }
}

function getLocalArticleById(articleId: string): Article | null {
  const localArticles = loadArticlesFromLocal();
  return localArticles.find((article) => article.id === articleId) || null;
}

/**
 * Get published articles
 */
export async function getPublishedArticles(
  options?: {
    limitCount?: number;
    category?: ArticleCategory;
    language?: ArticleLanguage;
    authorId?: string;
  }
): Promise<Article[]> {
  // Try Supabase first
  if (isArticlesRemoteEnabled()) {
    try {
      const supabase = getSupabaseClient();
      let query = supabase
        .from('articles')
        .select('*')
        .eq('published', true);

      if (options?.category) {
        query = query.eq('category', options.category);
      }

      if (options?.language) {
        query = query.eq('language', options.language);
      }

      if (options?.authorId) {
        query = query.eq('author_id', options.authorId);
      }

      // Order by published_at descending
      query = query.order('published_at', { ascending: false, nullsFirst: false });

      if (options?.limitCount) {
        query = query.limit(options.limitCount);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('[Articles] Supabase error, falling back to local data:', error.message);
        // Fall through to local data
      } else if (data && data.length > 0) {
        return data.map(rowToArticle);
      }
    } catch (error) {
      console.warn('[Articles] Supabase failed, falling back to local data:', error);
      // Fall through to local data
    }
  }

  // Fallback to local JSON file
  let articles = loadArticlesFromLocal();

  // Apply filters
  if (options?.category) {
    articles = articles.filter(a => a.category === options.category);
  }

  if (options?.language) {
    articles = articles.filter(a => a.language === options.language);
  }

  if (options?.authorId) {
    articles = articles.filter(a => a.authorId === options.authorId);
  }

  // Sort by publishedAt descending
  articles.sort((a, b) => {
    const aDate = a.publishedAt?.getTime() || 0;
    const bDate = b.publishedAt?.getTime() || 0;
    return bDate - aDate;
  });

  if (options?.limitCount) {
    articles = articles.slice(0, options.limitCount);
  }

  return articles;
}

/**
 * Get scholar's articles (published and drafts)
 */
export async function getScholarArticles(authorId: string): Promise<Article[]> {
  if (!isArticlesRemoteEnabled()) {
    return [];
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('author_id', authorId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error getting scholar articles:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data.map(rowToArticle);
  } catch (error) {
    console.error('Error getting scholar articles:', error);
    return [];
  }
}

/**
 * Delete an article
 */
export async function deleteArticle(articleId: string): Promise<void> {
  if (!isArticlesRemoteEnabled()) {
    throw new Error('Articles remote source disabled');
  }

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', articleId);

    if (error) {
      console.error('Error deleting article:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error deleting article:', error);
    throw error;
  }
}

/**
 * Increment article view count
 */
export async function incrementArticleView(articleId: string): Promise<void> {
  if (!isArticlesRemoteEnabled()) {
    return;
  }

  try {
    const supabase = getSupabaseClient();
    // First get current view count
    const { data: article } = await supabase
      .from('articles')
      .select('view_count')
      .eq('id', articleId)
      .single();

    if (article) {
      const { error } = await supabase
        .from('articles')
        .update({ view_count: (article.view_count || 0) + 1 })
        .eq('id', articleId);

      if (error) {
        console.error('Error incrementing view count:', error);
      }
    }
  } catch (error) {
    console.error('Error incrementing view count:', error);
  }
}
