/**
 * Shared Hanafi Mufti chat state for home widget and full chat screen.
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

import { askHanafiMufti, isHanafiMuftiConfigured } from '@/utils/hanafiMufti';
import {
  clearHanafiMuftiMessages,
  loadHanafiMuftiMessages,
  saveHanafiMuftiMessages,
  type StoredHanafiMuftiMessage,
} from '@/utils/hanafiMuftiStorage';

interface HanafiMuftiStore {
  messages: StoredHanafiMuftiMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  streamingContent: string;
}

const INITIAL_STORE: HanafiMuftiStore = {
  messages: [],
  isStreaming: false,
  isLoading: true,
  error: null,
  streamingContent: '',
};

let store: HanafiMuftiStore = { ...INITIAL_STORE };
const listeners = new Set<() => void>();
let loadPromise: Promise<void> | null = null;

function emit(): void {
  listeners.forEach((listener) => listener());
}

function setStore(patch: Partial<HanafiMuftiStore>): void {
  store = { ...store, ...patch };
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): HanafiMuftiStore {
  return store;
}

async function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const messages = await loadHanafiMuftiMessages();
      setStore({ messages, isLoading: false });
    })();
  }
  await loadPromise;
}

async function persistMessages(messages: StoredHanafiMuftiMessage[]): Promise<void> {
  await saveHanafiMuftiMessages(messages);
}

export function useHanafiMufti() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void ensureLoaded();
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || store.isStreaming) return false;

    if (!isHanafiMuftiConfigured()) {
      setStore({ error: 'سرویس مفتی پیکربندی نشده است.' });
      return false;
    }

    await ensureLoaded();

    const userMessage: StoredHanafiMuftiMessage = {
      role: 'user',
      content: trimmed.slice(0, 4000),
      createdAt: Date.now(),
    };

    const nextMessages = [...store.messages, userMessage];
    setStore({
      messages: nextMessages,
      isStreaming: true,
      error: null,
      streamingContent: '',
    });
    await persistMessages(nextMessages);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const apiMessages = nextMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let assistantText = '';

    await askHanafiMufti(apiMessages, {
      signal: controller.signal,
      onDelta: (chunk) => {
        assistantText += chunk;
        setStore({ streamingContent: assistantText });
      },
      onDone: () => {
        if (controller.signal.aborted) return;

        const assistantMessage: StoredHanafiMuftiMessage = {
          role: 'assistant',
          content: assistantText.trim() || 'پاسخی دریافت نشد.',
          createdAt: Date.now(),
        };

        const finalMessages = [...nextMessages, assistantMessage];
        setStore({
          messages: finalMessages,
          isStreaming: false,
          streamingContent: '',
          error: null,
        });
        void persistMessages(finalMessages);
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

    return true;
  }, []);

  const clearConversation = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = null;
    await clearHanafiMuftiMessages();
    setStore({
      messages: [],
      isStreaming: false,
      streamingContent: '',
      error: null,
    });
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
    isConfigured: isHanafiMuftiConfigured(),
    sendMessage,
    clearConversation,
    dismissError,
  };
}
