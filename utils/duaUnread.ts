/**
 * Local unread tracking for answered دعای خیر requests (WhatsApp-style badges).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DuaRequest } from '@/types/dua';

const SEEN_KEY = '@ebadat/dua_seen_request_ids';

async function loadSeenIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

async function saveSeenIds(ids: Set<string>): Promise<void> {
  await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
}

export async function getSeenDuaRequestIds(): Promise<Set<string>> {
  return loadSeenIds();
}

export async function markDuaRequestSeen(requestId: string): Promise<void> {
  if (!requestId) return;
  const seen = await loadSeenIds();
  if (seen.has(requestId)) return;
  seen.add(requestId);
  await saveSeenIds(seen);
}

export function getUnreadDuaIds(requests: DuaRequest[], seenIds: Set<string>): string[] {
  return requests
    .filter((r) => r.status === 'answered' && !seenIds.has(r.id))
    .map((r) => r.id);
}

export function getUnreadDuaCount(requests: DuaRequest[], seenIds: Set<string>): number {
  return getUnreadDuaIds(requests, seenIds).length;
}
