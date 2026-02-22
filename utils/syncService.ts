/**
 * Sync Service
 * Handles syncing articles and scholars when online
 */

import NetInfo from '@react-native-community/netinfo';
import * as articleService from './articleService';
import * as scholarService from './scholarService';
import * as articleStorage from './articleStorage';

/**
 * Sync all articles and scholars
 */
export async function syncAll(): Promise<{ success: boolean; error?: string }> {
  try {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return { success: false, error: 'No internet connection' };
    }

    // Sync articles
    const articles = await articleService.getPublishedArticles({ limitCount: 100 });
    await articleStorage.cacheArticles(articles);

    // Sync scholars
    const scholars = await scholarService.getAllScholars();
    await articleStorage.cacheScholars(scholars);

    return { success: true };
  } catch (error) {
    console.error('Error syncing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync articles only
 */
export async function syncArticles(): Promise<void> {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) return;

  try {
    const articles = await articleService.getPublishedArticles({ limitCount: 100 });
    await articleStorage.cacheArticles(articles);
  } catch (error) {
    console.error('Error syncing articles:', error);
  }
}

/**
 * Sync scholars only
 */
export async function syncScholars(): Promise<void> {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) return;

  try {
    const scholars = await scholarService.getAllScholars();
    await articleStorage.cacheScholars(scholars);
  } catch (error) {
    console.error('Error syncing scholars:', error);
  }
}
