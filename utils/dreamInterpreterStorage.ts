/**
 * Local persistence for Islamic Dream Interpreter chat history.
 * Kept separate from Hanafi Mufti history.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DreamInterpreterRole } from '@/utils/dreamInterpreter';

export const DREAM_INTERPRETER_STORAGE_KEY = '@ebadat/dream_interpreter_v1';
const MAX_MESSAGES = 24;
const SESSION_IDLE_MS = 30 * 60 * 1000;

export interface StoredDreamInterpreterMessage {
  role: DreamInterpreterRole;
  content: string;
  createdAt: number;
}

export interface DreamInterpreterPersistedState {
  messages: StoredDreamInterpreterMessage[];
  lastMessageAt: number | null;
  lang: 'fa' | 'ps';
}

function normalizeMessages(raw: unknown): StoredDreamInterpreterMessage[] {
  if (!Array.isArray(raw)) return [];

  const messages: StoredDreamInterpreterMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const role = (item as StoredDreamInterpreterMessage).role;
    const content = (item as StoredDreamInterpreterMessage).content;
    const createdAt = (item as StoredDreamInterpreterMessage).createdAt;
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

function normalizeLang(raw: unknown): 'fa' | 'ps' {
  return raw === 'ps' ? 'ps' : 'fa';
}

export function computeDreamSessionState(lastMessageAt: number | null, now = Date.now()): 'new' | 'continuing' {
  if (!lastMessageAt || now - lastMessageAt > SESSION_IDLE_MS) return 'new';
  return 'continuing';
}

export async function loadDreamInterpreterState(): Promise<DreamInterpreterPersistedState> {
  try {
    const raw = await AsyncStorage.getItem(DREAM_INTERPRETER_STORAGE_KEY);
    if (!raw) {
      return { messages: [], lastMessageAt: null, lang: 'fa' };
    }
    const parsed = JSON.parse(raw) as {
      messages?: unknown;
      lastMessageAt?: unknown;
      lang?: unknown;
    };
    const messages = normalizeMessages(parsed.messages);
    const lastMessageAt = typeof parsed.lastMessageAt === 'number'
      ? parsed.lastMessageAt
      : (messages[messages.length - 1]?.createdAt ?? null);
    return {
      messages,
      lastMessageAt,
      lang: normalizeLang(parsed.lang),
    };
  } catch {
    return { messages: [], lastMessageAt: null, lang: 'fa' };
  }
}

export async function saveDreamInterpreterState(state: DreamInterpreterPersistedState): Promise<void> {
  const messages = normalizeMessages(state.messages);
  await AsyncStorage.setItem(DREAM_INTERPRETER_STORAGE_KEY, JSON.stringify({
    messages,
    lastMessageAt: state.lastMessageAt,
    lang: normalizeLang(state.lang),
  }));
}

export async function clearDreamInterpreterState(): Promise<void> {
  await AsyncStorage.removeItem(DREAM_INTERPRETER_STORAGE_KEY);
}
