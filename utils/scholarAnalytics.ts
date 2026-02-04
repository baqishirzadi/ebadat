/**
 * Scholar Analytics
 * Calculate and aggregate analytics for scholars using Supabase
 */

import { ScholarStats, ArticleStats } from '@/types/analytics';
import { getScholarArticles } from './articleService';
import { getArticleAnalytics } from './analyticsService';

/**
 * Get scholar statistics
 */
export async function getScholarStats(authorId: string): Promise<ScholarStats> {
  const articles = await getScholarArticles(authorId);
  const publishedArticles = articles.filter((a) => a.published);

  let totalViews = 0;
  let totalBookmarks = 0;
  let totalCompletion = 0;
  let lastPublishedAt: Date | undefined;

  for (const article of publishedArticles) {
    totalViews += article.viewCount;
    totalBookmarks += article.bookmarkCount;

    const analytics = await getArticleAnalytics(article.id);
    if (analytics) {
      totalCompletion += analytics.readingCompletion;
    }

    if (article.publishedAt) {
      if (!lastPublishedAt || article.publishedAt > lastPublishedAt) {
        lastPublishedAt = article.publishedAt;
      }
    }
  }

  const averageReadingCompletion =
    publishedArticles.length > 0 ? totalCompletion / publishedArticles.length : 0;

  return {
    totalArticles: publishedArticles.length,
    totalViews,
    totalBookmarks,
    averageReadingCompletion: Math.round(averageReadingCompletion),
    lastPublishedAt,
  };
}

/**
 * Get article statistics for scholar
 */
export async function getScholarArticleStats(authorId: string): Promise<ArticleStats[]> {
  const articles = await getScholarArticles(authorId);
  const publishedArticles = articles.filter((a) => a.published);

  const stats: ArticleStats[] = [];

  for (const article of publishedArticles) {
    const analytics = await getArticleAnalytics(article.id);
    stats.push({
      articleId: article.id,
      articleTitle: article.title,
      views: article.viewCount,
      bookmarks: article.bookmarkCount,
      readingCompletion: analytics?.readingCompletion || 0,
      publishedAt: article.publishedAt || article.createdAt,
    });
  }

  // Sort by published date (newest first)
  return stats.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}
