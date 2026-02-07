/**
 * Dua Request Service
 * Handles API calls to Supabase
 */

import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import { DuaRequest, UserMetadata } from '@/types/dua';
import * as duaStorage from './duaStorage';

/**
 * Check if online and Supabase is configured
 */
const extra = (Constants.expoConfig?.extra || Constants.manifest?.extra || {}) as {
  supabaseUrl?: string;
  duaClientUrl?: string;
};
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || '';
const DUA_CLIENT_URL =
  process.env.EXPO_PUBLIC_DUA_CLIENT_URL ||
  extra.duaClientUrl ||
  (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/dua-client` : '');

function isAvailable(): boolean {
  return !!DUA_CLIENT_URL;
}

async function callDuaClient<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
  if (!DUA_CLIENT_URL) {
    throw new Error('DUA_CLIENT_URL_MISSING');
  }

  const response = await fetch(DUA_CLIENT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('DUA_CLIENT_UNAUTHORIZED');
    }
    const text = await response.text().catch(() => '');
    throw new Error(text || 'Dua client request failed');
  }
  return (await response.json()) as T;
}

async function hasNetwork(): Promise<boolean> {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) return false;
  if (netInfo.isInternetReachable === false) return false;
  return true;
}

function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    typeof error.message === 'string' &&
    /network request failed|failed to fetch|networkerror/i.test(error.message)
  );
}

/**
 * Convert Supabase row to DuaRequest
 */
function rowToRequest(row: any): DuaRequest {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    message: row.message,
    gender: row.gender || 'unspecified',
    isAnonymous: row.is_anonymous || false,
    status: row.status || 'pending',
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    answeredAt: row.answered_at ? new Date(row.answered_at) : undefined,
    response: row.response || undefined,
    reviewerId: row.reviewer_id || undefined,
    reviewerName: row.reviewer_name || undefined,
  };
}

/**
 * Convert DuaRequest to Supabase format
 */
function requestToRow(request: DuaRequest): any {
  return {
    user_id: request.userId,
    category: request.category,
    message: request.message,
    gender: request.gender || 'unspecified',
    is_anonymous: request.isAnonymous,
    status: request.status,
    created_at: request.createdAt instanceof Date ? request.createdAt.toISOString() : new Date().toISOString(),
    answered_at: request.answeredAt ? request.answeredAt.toISOString() : null,
    response: request.response || null,
    reviewer_id: request.reviewerId || null,
    reviewer_name: request.reviewerName || null,
  };
}

/**
 * Submit a new request
 */
export async function submitRequest(request: Omit<DuaRequest, 'id' | 'createdAt' | 'status'>): Promise<DuaRequest> {
  if (!isAvailable() || !(await hasNetwork())) {
    // Save offline and return
    const userId = await duaStorage.getOrCreateUserId();
    const offlineRequest: DuaRequest = {
      ...request,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: new Date(),
    };
    await duaStorage.savePendingRequest(offlineRequest);
    await duaStorage.addToSyncQueue(offlineRequest.id);
    return offlineRequest;
  }

  try {
    const userId = await duaStorage.getOrCreateUserId();
    const requestData: DuaRequest = {
      ...request,
      userId,
      status: 'pending',
      createdAt: new Date(),
    };

    const data = await callDuaClient<{ request: any }>('submit', {
      request: requestToRow(requestData),
    });

    const submittedRequest = rowToRequest(data.request);
    await duaStorage.cacheRequest(submittedRequest);
    return submittedRequest;
  } catch (error) {
    if (isNetworkError(error) || !(await hasNetwork())) {
      // Fallback to offline storage for network issues
      const userId = await duaStorage.getOrCreateUserId();
      const offlineRequest: DuaRequest = {
        ...request,
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        createdAt: new Date(),
      };
      await duaStorage.savePendingRequest(offlineRequest);
      await duaStorage.addToSyncQueue(offlineRequest.id);
      return offlineRequest;
    }

    console.error('Failed to submit request:', error);
    throw error;
  }
}

/**
 * Get user's requests
 */
export async function getUserRequests(userId: string): Promise<DuaRequest[]> {
  // Try to get from cache first
  const cached = await duaStorage.getCachedRequests();
  const userCached = cached.filter((r) => r.userId === userId);

  if (!isAvailable() || !(await hasNetwork())) {
    return userCached;
  }

  try {
    const data = await callDuaClient<{ requests: any[] }>('list', { user_id: userId });
    const requests = (data.requests || []).map(rowToRequest);

    // Cache all requests
    for (const request of requests) {
      await duaStorage.cacheRequest(request);
    }

    return requests;
  } catch (error) {
    if (!isNetworkError(error)) {
      console.error('Failed to get user requests:', error);
    }
    return userCached;
  }
}

/**
 * Get request by ID
 */
export async function getRequestById(requestId: string): Promise<DuaRequest | null> {
  const cached = await duaStorage.getCachedRequestById(requestId);
  const online = isAvailable() && (await hasNetwork());
  if (!online) {
    return cached ?? null;
  }

  try {
    const data = await callDuaClient<{ request: any }>('get', {
      id: requestId,
      user_id: (await duaStorage.getOrCreateUserId()),
    });
    if (!data.request) return cached ?? null;
    const request = rowToRequest(data.request);
    await duaStorage.cacheRequest(request);
    return request;
  } catch (error) {
    if (!isNetworkError(error)) {
      console.error('Failed to get request:', error);
    }
    return cached ?? null;
  }
}

/**
 * Update user metadata (device token, notification settings)
 */
export async function updateUserMetadata(metadata: Partial<UserMetadata>): Promise<void> {
  if (!isAvailable() || !(await hasNetwork())) {
    return;
  }

  try {
    const userId = await duaStorage.getOrCreateUserId();
    await callDuaClient('metadata', {
      user_id: userId,
      device_token: metadata.deviceToken ?? null,
      notification_enabled: metadata.notificationEnabled ?? true,
    });
  } catch (error) {
    if (!isNetworkError(error)) {
      console.error('Failed to update user metadata:', error);
    }
  }
}

/**
 * Sync pending requests (called when coming online)
 */
export async function syncPendingRequests(): Promise<void> {
  if (!isAvailable() || !(await hasNetwork())) {
    return;
  }

  try {
    const pending = await duaStorage.getPendingRequests();
    const queue = await duaStorage.getSyncQueue();

    for (const request of pending) {
      if (queue.includes(request.id)) {
        try {
          const data = await callDuaClient<{ request: any }>('submit', {
            request: requestToRow(request),
          });
          const syncedRequest = rowToRequest(data.request);
          await duaStorage.cacheRequest(syncedRequest);
          await duaStorage.removePendingRequest(request.id);
          await duaStorage.removeFromSyncQueue(request.id);
        } catch (error) {
          if (!isNetworkError(error)) {
            console.error(`Failed to sync request ${request.id}:`, error);
          }
        }
      }
    }
  } catch (error) {
    if (!isNetworkError(error)) {
      console.error('Failed to sync pending requests:', error);
    }
  }
}
