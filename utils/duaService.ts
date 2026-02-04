/**
 * Dua Request Service
 * Handles API calls to Supabase
 */

import NetInfo from '@react-native-community/netinfo';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { DuaRequest, UserMetadata } from '@/types/dua';
import * as duaStorage from './duaStorage';

/**
 * Check if online and Supabase is configured
 */
function isAvailable(): boolean {
  return isSupabaseConfigured();
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
    const supabase = getSupabaseClient();
    const userId = await duaStorage.getOrCreateUserId();
    
    const requestData: DuaRequest = {
      ...request,
      userId,
      status: 'pending',
      createdAt: new Date(),
    };

    const rowData = requestToRow(requestData);
    const { data, error } = await supabase
      .from('dua_requests')
      .insert(rowData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const submittedRequest = rowToRequest(data);

    // Cache locally
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
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('dua_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      if (!isNetworkError(error)) {
        console.error('Failed to get user requests:', error);
      }
      return userCached;
    }

    if (!data) {
      return userCached;
    }

    const requests = data.map(rowToRequest);

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
  // Check cache first
  const cached = await duaStorage.getCachedRequestById(requestId);
  if (cached) {
    return cached;
  }

  if (!isAvailable() || !(await hasNetwork())) {
    return null;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('dua_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error || !data) {
      return null;
    }

    const request = rowToRequest(data);
    await duaStorage.cacheRequest(request);
    return request;
  } catch (error) {
    if (!isNetworkError(error)) {
      console.error('Failed to get request:', error);
    }
    return null;
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
    const supabase = getSupabaseClient();
    const userId = await duaStorage.getOrCreateUserId();

    const updateData: any = {};
    if (metadata.deviceToken !== undefined) {
      updateData.device_token = metadata.deviceToken;
    }
    if (metadata.notificationEnabled !== undefined) {
      updateData.notification_enabled = metadata.notificationEnabled;
    }

    // Try to update existing record
    const { error: updateError } = await supabase
      .from('user_metadata')
      .update(updateData)
      .eq('user_id', userId);

    // If update fails (record doesn't exist), insert new record
    if (updateError) {
      const { error: insertError } = await supabase
        .from('user_metadata')
        .insert({
          user_id: userId,
          device_token: metadata.deviceToken || null,
          notification_enabled: metadata.notificationEnabled ?? true,
        });

      if (insertError) {
        console.error('Failed to create/update user metadata:', insertError);
      }
    }
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
          // Try to submit to Supabase
          const supabase = getSupabaseClient();
          const rowData = requestToRow(request);
          
          const { data, error } = await supabase
            .from('dua_requests')
            .insert(rowData)
            .select()
            .single();

          if (error) {
            throw error;
          }

          // Update local cache with new ID
          const syncedRequest = rowToRequest(data);
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
