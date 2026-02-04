/**
 * Dua Admin Client (Edge Function)
 * Calls Supabase Edge Function `dua-admin`
 */

import { DuaRequest } from '@/types/dua';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const ADMIN_FUNCTION_URL =
  process.env.EXPO_PUBLIC_DUA_ADMIN_URL ||
  (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/dua-admin` : '');

const ADMIN_PIN = '0852';

async function callAdmin<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
  if (!ADMIN_FUNCTION_URL) {
    throw new Error('Admin function URL is not configured');
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
    const text = await response.text().catch(() => '');
    throw new Error(text || 'Admin request failed');
  }

  return (await response.json()) as T;
}

export async function fetchAdminRequests(status?: string): Promise<DuaRequest[]> {
  const data = await callAdmin<{ requests: DuaRequest[] }>('list', {
    status: status && status !== 'all' ? status : undefined,
  });
  return data.requests || [];
}

export async function fetchAdminRequestById(id: string): Promise<DuaRequest | null> {
  const data = await callAdmin<{ request: DuaRequest | null }>('get', { id });
  return data.request || null;
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
