/**
 * Analytics Types
 * Type definitions for article analytics and statistics
 */

export interface ArticleAnalytics {
  articleId: string;
  views: number;
  uniqueReaders: number;
  readingCompletion: number; // percentage (0-100)
  bookmarks: number;
  shares: number;
  lastViewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScholarStats {
  totalArticles: number;
  totalViews: number;
  totalBookmarks: number;
  averageReadingCompletion: number;
  lastPublishedAt?: Date;
}

export interface ArticleStats {
  articleId: string;
  articleTitle: string;
  views: number;
  bookmarks: number;
  readingCompletion: number;
  publishedAt: Date;
}

export interface AnalyticsTimeSeries {
  date: string; // YYYY-MM-DD
  views: number;
  bookmarks: number;
}
