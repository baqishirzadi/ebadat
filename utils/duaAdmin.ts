/**
 * Dua Admin Client (Edge Function)
 * Calls Supabase Edge Function `dua-admin`
 */

import { DuaRequest } from '@/types/dua';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra || Constants.manifest?.extra || {}) as {
  supabaseUrl?: string;
  duaAdminUrl?: string;
};
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || '';
const ADMIN_FUNCTION_URL =
  process.env.EXPO_PUBLIC_DUA_ADMIN_URL ||
  extra.duaAdminUrl ||
  (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/dua-admin` : '');

const ADMIN_PIN = '0852';

/**
 * Map Supabase snake_case row to DuaRequest (camelCase + Date fields)
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

async function callAdmin<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
  if (!ADMIN_FUNCTION_URL) {
    throw new Error('ADMIN_FUNCTION_URL_MISSING');
  }

  const response = await fetch(ADMIN_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-pin': ADMIN_PIN,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('ADMIN_UNAUTHORIZED');
    }
    const text = await response.text().catch(() => '');
    throw new Error(text || 'Admin request failed');
  }

  return (await response.json()) as T;
}

export async function fetchAdminRequests(status?: string): Promise<DuaRequest[]> {
  const data = await callAdmin<{ requests: any[] }>('list', {
    status: status && status !== 'all' ? status : undefined,
  });
  return (data.requests || []).map(rowToRequest);
}

export async function fetchAdminRequestById(id: string): Promise<DuaRequest | null> {
  const data = await callAdmin<{ request: any }>('get', { id });
  if (!data.request) return null;
  return rowToRequest(data.request);
}

export async function updateAdminResponse(params: {
  id: string;
  response: string;
  reviewerName: string;
}): Promise<void> {
  await callAdmin('update', {
    id: params.id,
    response: params.response,
    reviewer_name: params.reviewerName,
  });
}
