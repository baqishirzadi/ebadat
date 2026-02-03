/**
 * Analytics Service
 * Tracks article views, reading progress, bookmarks, and shares
 */

import { getFirestoreDB, isFirebaseConfigured } from './firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment as firestoreIncrement,
  serverTimestamp,
} from 'firebase/firestore';
import { ArticleAnalytics } from '@/types/analytics';
import * as articleStorage from './articleStorage';

/**
 * Track article view
 */
export async function trackArticleView(articleId: string, userId?: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    return;
  }

  try {
    const db = getFirestoreDB();
    const analyticsRef = doc(db, 'article_analytics', articleId);

    // Get or create analytics document
    const analyticsSnap = await getDoc(analyticsRef);
    
    if (analyticsSnap.exists()) {
      // Update existing
      const updateData: any = {
        views: firestoreIncrement(1),
        lastViewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Track unique reader if userId provided
      if (userId) {
        // Check if this is a unique reader
        // For simplicity, we'll just increment uniqueReaders
        // In production, you'd maintain a list of unique user IDs
        updateData.uniqueReaders = firestoreIncrement(1);
      }

      await updateDoc(analyticsRef, updateData);
    } else {
      // Create new
      await setDoc(analyticsRef, {
        articleId,
        views: 1,
        uniqueReaders: userId ? 1 : 0,
        readingCompletion: 0,
        bookmarks: 0,
        shares: 0,
        lastViewedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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
  if (!isFirebaseConfigured()) {
    // Still save locally
    await articleStorage.saveReadingProgress(articleId, progressPercentage);
    return;
  }

  try {
    // Save locally first
    await articleStorage.saveReadingProgress(articleId, progressPercentage);

    const db = getFirestoreDB();
    const analyticsRef = doc(db, 'article_analytics', articleId);

    const analyticsSnap = await getDoc(analyticsRef);
    
    if (analyticsSnap.exists()) {
      // Update reading completion (use highest percentage)
      const current = analyticsSnap.data();
      const currentCompletion = current.readingCompletion || 0;
      
      if (progressPercentage > currentCompletion) {
        await updateDoc(analyticsRef, {
          readingCompletion: progressPercentage,
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      // Create new
      await setDoc(analyticsRef, {
        articleId,
        views: 0,
        uniqueReaders: 0,
        readingCompletion: progressPercentage,
        bookmarks: 0,
        shares: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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
  if (!isFirebaseConfigured()) {
    return;
  }

  try {
    const db = getFirestoreDB();
    const analyticsRef = doc(db, 'article_analytics', articleId);

    const analyticsSnap = await getDoc(analyticsRef);
    
    if (analyticsSnap.exists()) {
      await updateDoc(analyticsRef, {
        bookmarks: firestoreIncrement(isBookmarked ? 1 : -1),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(analyticsRef, {
        articleId,
        views: 0,
        uniqueReaders: 0,
        readingCompletion: 0,
        bookmarks: isBookmarked ? 1 : 0,
        shares: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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
  if (!isFirebaseConfigured()) {
    return;
  }

  try {
    const db = getFirestoreDB();
    const analyticsRef = doc(db, 'article_analytics', articleId);

    const analyticsSnap = await getDoc(analyticsRef);
    
    if (analyticsSnap.exists()) {
      await updateDoc(analyticsRef, {
        shares: firestoreIncrement(1),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(analyticsRef, {
        articleId,
        views: 0,
        uniqueReaders: 0,
        readingCompletion: 0,
        bookmarks: 0,
        shares: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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
  if (!isFirebaseConfigured()) {
    return null;
  }

  try {
    const db = getFirestoreDB();
    const analyticsRef = doc(db, 'article_analytics', articleId);
    const analyticsSnap = await getDoc(analyticsRef);

    if (!analyticsSnap.exists()) {
      return null;
    }

    const data = analyticsSnap.data();
    return {
      articleId,
      views: data.views || 0,
      uniqueReaders: data.uniqueReaders || 0,
      readingCompletion: data.readingCompletion || 0,
      bookmarks: data.bookmarks || 0,
      shares: data.shares || 0,
      lastViewedAt: data.lastViewedAt?.toDate(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error getting article analytics:', error);
    return null;
  }
}
