/**
 * Article Service
 * CRUD operations for articles
 */

import { getFirestoreDB, isFirebaseConfigured } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment as firestoreIncrement,
} from 'firebase/firestore';
import { Article, ArticleCategory, ArticleLanguage } from '@/types/articles';

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
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured');
  }

  try {
    const db = getFirestoreDB();
    const articlesRef = collection(db, 'articles');
    const articleRef = doc(articlesRef);

    const readingTime = calculateReadingTime(articleData.body);
    const now = new Date();

    const article: Omit<Article, 'id'> = {
      title: articleData.title,
      language: articleData.language,
      authorId,
      authorName,
      category: articleData.category,
      body: articleData.body,
      audioUrl: articleData.audioUrl,
      published: articleData.published || false,
      publishedAt: articleData.published ? now : undefined,
      createdAt: now,
      updatedAt: now,
      readingTimeEstimate: readingTime,
      viewCount: 0,
      bookmarkCount: 0,
      draft: !articleData.published,
      notificationSent: false,
    };

    await setDoc(articleRef, {
      ...article,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: article.publishedAt ? serverTimestamp() : null,
    });

    return articleRef.id;
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
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured');
  }

  try {
    const db = getFirestoreDB();
    const articleRef = doc(db, 'articles', articleId);

    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    if (updates.title) updateData.title = updates.title;
    if (updates.language) updateData.language = updates.language;
    if (updates.category) updateData.category = updates.category;
    if (updates.body !== undefined) {
      updateData.body = updates.body;
      updateData.readingTimeEstimate = calculateReadingTime(updates.body);
    }
    if (updates.audioUrl !== undefined) updateData.audioUrl = updates.audioUrl;

    if (updates.published !== undefined) {
      updateData.published = updates.published;
      updateData.draft = !updates.published;
      if (updates.published) {
        updateData.publishedAt = serverTimestamp();
        updateData.notificationSent = false; // Reset to send notification
      }
    }

    await updateDoc(articleRef, updateData);
  } catch (error) {
    console.error('Error updating article:', error);
    throw error;
  }
}

/**
 * Get article by ID
 */
export async function getArticleById(articleId: string): Promise<Article | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  try {
    const db = getFirestoreDB();
    const articleRef = doc(db, 'articles', articleId);
    const articleSnap = await getDoc(articleRef);

    if (!articleSnap.exists()) {
      return null;
    }

    const data = articleSnap.data();
    return {
      id: articleSnap.id,
      title: data.title || '',
      language: data.language || 'dari',
      authorId: data.authorId || '',
      authorName: data.authorName || '',
      category: data.category || 'iman',
      body: data.body || '',
      audioUrl: data.audioUrl,
      published: data.published || false,
      publishedAt: data.publishedAt?.toDate(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      readingTimeEstimate: data.readingTimeEstimate || 1,
      viewCount: data.viewCount || 0,
      bookmarkCount: data.bookmarkCount || 0,
      draft: data.draft || false,
      notificationSent: data.notificationSent || false,
    };
  } catch (error) {
    console.error('Error getting article:', error);
    return null;
  }
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
  if (!isFirebaseConfigured()) {
    return [];
  }

  try {
    const db = getFirestoreDB();
    const articlesRef = collection(db, 'articles');

    let q = query(
      articlesRef,
      where('published', '==', true),
      orderBy('publishedAt', 'desc')
    );

    if (options?.category) {
      q = query(q, where('category', '==', options.category));
    }

    if (options?.language) {
      q = query(q, where('language', '==', options.language));
    }

    if (options?.authorId) {
      q = query(q, where('authorId', '==', options.authorId));
    }

    if (options?.limitCount) {
      q = query(q, limit(options.limitCount));
    }

    const snapshot = await getDocs(q);
    const articles: Article[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      articles.push({
        id: docSnap.id,
        title: data.title || '',
        language: data.language || 'dari',
        authorId: data.authorId || '',
        authorName: data.authorName || '',
        category: data.category || 'iman',
        body: data.body || '',
        audioUrl: data.audioUrl,
        published: true,
        publishedAt: data.publishedAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        readingTimeEstimate: data.readingTimeEstimate || 1,
        viewCount: data.viewCount || 0,
        bookmarkCount: data.bookmarkCount || 0,
        draft: false,
        notificationSent: data.notificationSent || false,
      });
    });

    return articles;
  } catch (error) {
    console.error('Error getting published articles:', error);
    return [];
  }
}

/**
 * Get scholar's articles (published and drafts)
 */
export async function getScholarArticles(authorId: string): Promise<Article[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  try {
    const db = getFirestoreDB();
    const articlesRef = collection(db, 'articles');
    const q = query(
      articlesRef,
      where('authorId', '==', authorId),
      orderBy('updatedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const articles: Article[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      articles.push({
        id: docSnap.id,
        title: data.title || '',
        language: data.language || 'dari',
        authorId: data.authorId || '',
        authorName: data.authorName || '',
        category: data.category || 'iman',
        body: data.body || '',
        audioUrl: data.audioUrl,
        published: data.published || false,
        publishedAt: data.publishedAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        readingTimeEstimate: data.readingTimeEstimate || 1,
        viewCount: data.viewCount || 0,
        bookmarkCount: data.bookmarkCount || 0,
        draft: data.draft || false,
        notificationSent: data.notificationSent || false,
      });
    });

    return articles;
  } catch (error) {
    console.error('Error getting scholar articles:', error);
    return [];
  }
}

/**
 * Delete an article
 */
export async function deleteArticle(articleId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured');
  }

  try {
    const db = getFirestoreDB();
    const articleRef = doc(db, 'articles', articleId);
    await deleteDoc(articleRef);
  } catch (error) {
    console.error('Error deleting article:', error);
    throw error;
  }
}

/**
 * Increment article view count
 */
export async function incrementArticleView(articleId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    return;
  }

  try {
    const db = getFirestoreDB();
    const articleRef = doc(db, 'articles', articleId);
    await updateDoc(articleRef, {
      viewCount: firestoreIncrement(1),
    });
  } catch (error) {
    console.error('Error incrementing view count:', error);
  }
}
