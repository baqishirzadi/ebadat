/**
 * Shared Islamic Dream Interpreter chat state for home widget and full chat screen.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';

import {
  askDreamInterpreter,
  isDreamInterpreterConfigured,
} from '@/utils/dreamInterpreter';
import {
  clearDreamInterpreterState,
  computeDreamSessionState,
  loadDreamInterpreterState,
  saveDreamInterpreterState,
  type StoredDreamInterpreterMessage,
} from '@/utils/dreamInterpreterStorage';
import { DREAM_COPY } from '@/constants/dreamInterpreterCopy';
import type { AppLanguage } from '@/types/quran';

type DreamStoreLang = 'fa' | 'ps' | 'en';

interface DreamInterpreterStore {
  messages: StoredDreamInterpreterMessage[];
  lastMessageAt: number | null;
  lang: DreamStoreLang;
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  streamingContent: string;
}

const INITIAL_STORE: DreamInterpreterStore = {
  messages: [],
  lastMessageAt: null,
  lang: 'fa',
  isStreaming: false,
  isLoading: true,
  error: null,
  streamingContent: '',
};

function storeLangToAppLanguage(lang: DreamStoreLang): AppLanguage {
  if (lang === 'ps') return 'pashto';
  if (lang === 'en') return 'english';
  return 'dari';
}

function dreamUiCopy(lang: DreamStoreLang = store.lang) {
  return DREAM_COPY[storeLangToAppLanguage(lang)] ?? DREAM_COPY.dari;
}

let store: DreamInterpreterStore = { ...INITIAL_STORE };
const listeners = new Set<() => void>();
let loadPromise: Promise<void> | null = null;
let activeAbort: AbortController | null = null;

function emit(): void {
  listeners.forEach((listener) => listener());
}

function setStore(patch: Partial<DreamInterpreterStore>): void {
  store = { ...store, ...patch };
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): DreamInterpreterStore {
  return store;
}

async function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const persisted = await loadDreamInterpreterState();
      setStore({
        messages: persisted.messages,
        lastMessageAt: persisted.lastMessageAt,
        lang: persisted.lang,
        isLoading: false,
      });
    })();
  }
  await loadPromise;
}

async function persistState(patch: Partial<Pick<DreamInterpreterStore, 'messages' | 'lastMessageAt' | 'lang'>>): Promise<void> {
  const nextLang = patch.lang ?? store.lang;
  await saveDreamInterpreterState({
    messages: patch.messages ?? store.messages,
    lastMessageAt: patch.lastMessageAt === undefined ? store.lastMessageAt : patch.lastMessageAt,
    lang: nextLang === 'ps' ? 'ps' : 'fa',
  });
}

async function streamForMessages(history: StoredDreamInterpreterMessage[]): Promise<void> {
  activeAbort?.abort();
  const controller = new AbortController();
  activeAbort = controller;

  const apiMessages = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let assistantText = '';
  const sessionState = computeDreamSessionState(store.lastMessageAt);

  await askDreamInterpreter(apiMessages, {
    sessionState,
    language: storeLangToAppLanguage(store.lang),
    signal: controller.signal,
    onDelta: (chunk) => {
      assistantText += chunk;
      setStore({ streamingContent: assistantText });
    },
    onDone: () => {
      if (controller.signal.aborted) return;

      const now = Date.now();
      const assistantMessage: StoredDreamInterpreterMessage = {
        role: 'assistant',
        content: assistantText.trim() || dreamUiCopy().emptyReply,
        createdAt: now,
      };

      const finalMessages = [...history, assistantMessage];
      setStore({
        messages: finalMessages,
        lastMessageAt: now,
        isStreaming: false,
        streamingContent: '',
        error: null,
      });
      void persistState({ messages: finalMessages, lastMessageAt: now });
    },
    onError: (message) => {
      if (controller.signal.aborted) return;
      setStore({
        isStreaming: false,
        streamingContent: '',
        error: message,
      });
    },
  });
}

export function useDreamInterpreter() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void ensureLoaded();
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || store.isStreaming) return false;

    if (!isDreamInterpreterConfigured()) {
      setStore({ error: dreamUiCopy().notConfigured });
      return false;
    }

    await ensureLoaded();

    const userMessage: StoredDreamInterpreterMessage = {
      role: 'user',
      content: trimmed.slice(0, 2000),
      createdAt: Date.now(),
    };

    const nextMessages = [...store.messages, userMessage];
    setStore({
      messages: nextMessages,
      isStreaming: true,
      error: null,
      streamingContent: '',
    });
    await persistState({ messages: nextMessages });
    await streamForMessages(nextMessages);
    return true;
  }, []);

  const retryLast = useCallback(async () => {
    if (store.isStreaming) return false;
    await ensureLoaded();
    const last = store.messages[store.messages.length - 1];
    if (!last || last.role !== 'user') return false;
    if (!isDreamInterpreterConfigured()) {
      setStore({ error: dreamUiCopy().notConfigured });
      return false;
    }

    setStore({
      isStreaming: true,
      error: null,
      streamingContent: '',
    });
    await streamForMessages(store.messages);
    return true;
  }, []);

  const clearConversation = useCallback(async () => {
    activeAbort?.abort();
    activeAbort = null;
    await clearDreamInterpreterState();
    setStore({
      messages: [],
      lastMessageAt: null,
      isStreaming: false,
      streamingContent: '',
      error: null,
    });
  }, []);

  const setLang = useCallback((lang: DreamStoreLang) => {
    setStore({ lang });
    // Persistence only stores fa/ps historically; english stays in memory from app language.
    if (lang === 'fa' || lang === 'ps') {
      void persistState({ lang });
    }
  }, []);

  const dismissError = useCallback(() => {
    setStore({ error: null });
  }, []);

  return {
    messages: snapshot.messages,
    isStreaming: snapshot.isStreaming,
    isLoading: snapshot.isLoading,
    error: snapshot.error,
    streamingContent: snapshot.streamingContent,
    lang: snapshot.lang,
    isConfigured: isDreamInterpreterConfigured(),
    sendMessage,
    retryLast,
    clearConversation,
    setLang,
    dismissError,
  };
}
