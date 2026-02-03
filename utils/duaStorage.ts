/**
 * Dua Request Offline Storage
 * Manages local storage using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DuaRequest } from '@/types/dua';

const STORAGE_KEYS = {
  PENDING_REQUESTS: '@ebadat/dua_pending_requests',
  CACHED_REQUESTS: '@ebadat/dua_cached_requests',
  SYNC_QUEUE: '@ebadat/dua_sync_queue',
  USER_ID: '@ebadat/dua_user_id',
  DEVICE_TOKEN: '@ebadat/dua_device_token',
};

/**
 * Generate a unique user ID (stored locally)
 */
export async function getOrCreateUserId(): Promise<string> {
  try {
    let userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
    if (!userId) {
      // Generate a unique ID
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
    }
    return userId;
  } catch (error) {
    console.error('Failed to get/create user ID:', error);
    // Fallback ID
    return `user_${Date.now()}`;
  }
}

/**
 * Save device token for notifications
 */
export async function saveDeviceToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_TOKEN, token);
  } catch (error) {
    console.error('Failed to save device token:', error);
  }
}

/**
 * Get device token
 */
export async function getDeviceToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_TOKEN);
  } catch (error) {
    console.error('Failed to get device token:', error);
    return null;
  }
}

/**
 * Save request to pending queue (offline)
 */
export async function savePendingRequest(request: DuaRequest): Promise<void> {
  try {
    const pending = await getPendingRequests();
    pending.push(request);
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_REQUESTS, JSON.stringify(pending));
  } catch (error) {
    console.error('Failed to save pending request:', error);
    throw error;
  }
}

/**
 * Get all pending requests
 */
export async function getPendingRequests(): Promise<DuaRequest[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_REQUESTS);
    if (!data) return [];
    const requests = JSON.parse(data);
    // Convert date strings back to Date objects
    return requests.map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt),
      answeredAt: r.answeredAt ? new Date(r.answeredAt) : undefined,
    }));
  } catch (error) {
    console.error('Failed to get pending requests:', error);
    return [];
  }
}

/**
 * Remove request from pending queue
 */
export async function removePendingRequest(requestId: string): Promise<void> {
  try {
    const pending = await getPendingRequests();
    const filtered = pending.filter((r) => r.id !== requestId);
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_REQUESTS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove pending request:', error);
  }
}

/**
 * Cache request/response locally
 */
export async function cacheRequest(request: DuaRequest): Promise<void> {
  try {
    const cached = await getCachedRequests();
    // Remove old entry if exists
    const filtered = cached.filter((r) => r.id !== request.id);
    filtered.push(request);
    // Keep only last 50 requests
    const limited = filtered.slice(-50);
    await AsyncStorage.setItem(STORAGE_KEYS.CACHED_REQUESTS, JSON.stringify(limited));
  } catch (error) {
    console.error('Failed to cache request:', error);
  }
}

/**
 * Get cached requests
 */
export async function getCachedRequests(): Promise<DuaRequest[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_REQUESTS);
    if (!data) return [];
    const requests = JSON.parse(data);
    return requests.map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt),
      answeredAt: r.answeredAt ? new Date(r.answeredAt) : undefined,
    }));
  } catch (error) {
    console.error('Failed to get cached requests:', error);
    return [];
  }
}

/**
 * Get cached request by ID
 */
export async function getCachedRequestById(id: string): Promise<DuaRequest | null> {
  try {
    const cached = await getCachedRequests();
    return cached.find((r) => r.id === id) || null;
  } catch (error) {
    console.error('Failed to get cached request:', error);
    return null;
  }
}

/**
 * Add to sync queue
 */
export async function addToSyncQueue(requestId: string): Promise<void> {
  try {
    const queue = await getSyncQueue();
    if (!queue.includes(requestId)) {
      queue.push(requestId);
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    }
  } catch (error) {
    console.error('Failed to add to sync queue:', error);
  }
}

/**
 * Get sync queue
 */
export async function getSyncQueue(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get sync queue:', error);
    return [];
  }
}

/**
 * Remove from sync queue
 */
export async function removeFromSyncQueue(requestId: string): Promise<void> {
  try {
    const queue = await getSyncQueue();
    const filtered = queue.filter((id) => id !== requestId);
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove from sync queue:', error);
  }
}

/**
 * Clear all storage (for testing/reset)
 */
export async function clearDuaStorage(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.PENDING_REQUESTS),
      AsyncStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE),
      // Don't clear cached requests or user ID
    ]);
  } catch (error) {
    console.error('Failed to clear storage:', error);
  }
}
