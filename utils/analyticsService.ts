/**
 * Analytics Service
 * Tracks article views, reading progress, bookmarks, and shares using Supabase
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { ArticleAnalytics } from '@/types/analytics';
import * as articleStorage from './articleStorage';

/**
 * Track article view
 */
export async function trackArticleView(articleId: string, userId?: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const supabase = getSupabaseClient();
    
    // Check if analytics record exists
    const { data: existing } = await supabase
      .from('article_analytics')
      .select('*')
      .eq('article_id', articleId)
      .single();

    if (existing) {
      // Update existing
      const updateData: any = {
        views: (existing.views || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      };

      // Track unique reader if userId provided
      if (userId) {
        // For simplicity, we'll just increment uniqueReaders
        // In production, you'd maintain a list of unique user IDs
        updateData.unique_readers = (existing.unique_readers || 0) + 1;
      }

      await supabase
        .from('article_analytics')
        .update(updateData)
        .eq('article_id', articleId);
    } else {
      // Create new
      await supabase
        .from('article_analytics')
        .insert({
          article_id: articleId,
          views: 1,
          unique_readers: userId ? 1 : 0,
          reading_completion: 0,
          bookmarks: 0,
          shares: 0,
          last_viewed_at: new Date().toISOString(),
        });
    }
  } catch (error) {
    console.error('Error tracking article view:', error);
  }
}

/**
 * Track reading progress
 */
export async function trackReadingProgress(
  articleId: string,
  progressPercentage: number
): Promise<void> {
  if (!isSupabaseConfigured()) {
    // Still save locally
    await articleStorage.saveReadingProgress(articleId, progressPercentage);
    return;
  }

  try {
    // Save locally first
    await articleStorage.saveReadingProgress(articleId, progressPercentage);

    const supabase = getSupabaseClient();
    
    // Check if analytics record exists
    const { data: existing } = await supabase
      .from('article_analytics')
      .select('reading_completion')
      .eq('article_id', articleId)
      .single();

    if (existing) {
      // Update reading completion (use highest percentage)
      const currentCompletion = existing.reading_completion || 0;
      
      if (progressPercentage > currentCompletion) {
        await supabase
          .from('article_analytics')
          .update({
            reading_completion: progressPercentage,
          })
          .eq('article_id', articleId);
      }
    } else {
      // Create new
      await supabase
        .from('article_analytics')
        .insert({
          article_id: articleId,
          views: 0,
          unique_readers: 0,
          reading_completion: progressPercentage,
          bookmarks: 0,
          shares: 0,
        });
    }
  } catch (error) {
    console.error('Error tracking reading progress:', error);
  }
}

/**
 * Track bookmark
 */
export async function trackBookmark(articleId: string, isBookmarked: boolean): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const supabase = getSupabaseClient();
    
    // Check if analytics record exists
    const { data: existing } = await supabase
      .from('article_analytics')
      .select('bookmarks')
      .eq('article_id', articleId)
      .single();

    if (existing) {
      const newBookmarkCount = Math.max(0, (existing.bookmarks || 0) + (isBookmarked ? 1 : -1));
      await supabase
        .from('article_analytics')
        .update({
          bookmarks: newBookmarkCount,
        })
        .eq('article_id', articleId);
    } else {
      await supabase
        .from('article_analytics')
        .insert({
          article_id: articleId,
          views: 0,
          unique_readers: 0,
          reading_completion: 0,
          bookmarks: isBookmarked ? 1 : 0,
          shares: 0,
        });
    }
  } catch (error) {
    console.error('Error tracking bookmark:', error);
  }
}

/**
 * Track share
 */
export async function trackShare(articleId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const supabase = getSupabaseClient();
    
    // Check if analytics record exists
    const { data: existing } = await supabase
      .from('article_analytics')
      .select('shares')
      .eq('article_id', articleId)
      .single();

    if (existing) {
      await supabase
        .from('article_analytics')
        .update({
          shares: (existing.shares || 0) + 1,
        })
        .eq('article_id', articleId);
    } else {
      await supabase
        .from('article_analytics')
        .insert({
          article_id: articleId,
          views: 0,
          unique_readers: 0,
          reading_completion: 0,
          bookmarks: 0,
          shares: 1,
        });
    }
  } catch (error) {
    console.error('Error tracking share:', error);
  }
}

/**
 * Get article analytics
 */
export async function getArticleAnalytics(articleId: string): Promise<ArticleAnalytics | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('article_analytics')
      .select('*')
      .eq('article_id', articleId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      articleId,
      views: data.views || 0,
      uniqueReaders: data.unique_readers || 0,
      readingCompletion: data.reading_completion || 0,
      bookmarks: data.bookmarks || 0,
      shares: data.shares || 0,
      lastViewedAt: data.last_viewed_at ? new Date(data.last_viewed_at) : undefined,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
    };
  } catch (error) {
    console.error('Error getting article analytics:', error);
    return null;
  }
}
