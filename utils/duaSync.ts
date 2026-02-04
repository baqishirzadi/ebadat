/**
 * Dua Request Sync Manager
 * Handles offline-to-online synchronization
 */

import { isSupabaseConfigured } from './supabase';
import * as duaService from './duaService';
import * as duaStorage from './duaStorage';

let syncInProgress = false;
let syncListeners: Array<() => void> = [];

/**
 * Check if device is online (simplified - checks if Supabase is configured and available)
 */
export async function isOnline(): Promise<boolean> {
  // Simple check: if Supabase is configured, assume we can try to sync
  // Actual network check happens when making the API call
  return isSupabaseConfigured();
}

/**
 * Sync pending requests when coming online
 */
export async function syncIfOnline(): Promise<void> {
  if (syncInProgress) {
    return;
  }

  const online = await isOnline();
  if (!online) {
    return;
  }

  syncInProgress = true;
  try {
    await duaService.syncPendingRequests();
    notifySyncListeners();
  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    syncInProgress = false;
  }
}

/**
 * Subscribe to network changes and auto-sync
 * For Expo, we'll use a polling approach or manual triggers
 */
export function startAutoSync(): () => void {
  // Sync immediately
  syncIfOnline();

  // Set up periodic sync (every 30 seconds when app is active)
  const intervalId = setInterval(() => {
    syncIfOnline();
  }, 30000);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
}

/**
 * Add sync listener (called when sync completes)
 */
export function addSyncListener(listener: () => void): () => void {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener);
  };
}

/**
 * Notify all sync listeners
 */
function notifySyncListeners(): void {
  syncListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('Sync listener error:', error);
    }
  });
}

/**
 * Force sync (manual trigger)
 */
export async function forceSync(): Promise<void> {
  await syncIfOnline();
}
