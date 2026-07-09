/**
 * Local persistence for Hanafi Mufti chat history.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { HanafiMuftiRole } from '@/utils/hanafiMufti';

const STORAGE_KEY = '@ebadat/hanafi_mufti_messages';
const MAX_MESSAGES = 40;

export interface StoredHanafiMuftiMessage {
  role: HanafiMuftiRole;
  content: string;
  createdAt: number;
}

function normalizeMessages(raw: unknown): StoredHanafiMuftiMessage[] {
  if (!Array.isArray(raw)) return [];

  const messages: StoredHanafiMuftiMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const role = (item as StoredHanafiMuftiMessage).role;
    const content = (item as StoredHanafiMuftiMessage).content;
    const createdAt = (item as StoredHanafiMuftiMessage).createdAt;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') continue;
    const trimmed = content.trim();
    if (!trimmed) continue;
    messages.push({
      role,
      content: trimmed.slice(0, 4000),
      createdAt: typeof createdAt === 'number' ? createdAt : Date.now(),
    });
  }

  return messages.slice(-MAX_MESSAGES);
}

export async function loadHanafiMuftiMessages(): Promise<StoredHanafiMuftiMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeMessages(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function saveHanafiMuftiMessages(messages: StoredHanafiMuftiMessage[]): Promise<void> {
  const normalized = normalizeMessages(messages);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export async function clearHanafiMuftiMessages(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
