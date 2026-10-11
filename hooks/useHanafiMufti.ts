/**
 * Shared Hanafi Mufti chat state for home widget and full chat screen.
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { useAppLanguage } from '@/context/AppContext';
import type { AppLanguage } from '@/types/quran';
import { translateUi } from '@/utils/i18n/catalog';
import type { HanafiMuftiErrorCode, HanafiMuftiLanguage } from '@/utils/hanafiMufti';
import { detectMuftiMessageLanguage } from '@/utils/i18n/languageDetection';

import { askHanafiMufti, isHanafiMuftiConfigured } from '@/utils/hanafiMufti';
import {
  clearHanafiMuftiMessages,
  clearScopedMuftiMessages,
  loadHanafiMuftiMessages,
  loadScopedMuftiMessages,
  saveHanafiMuftiMessages,
  saveScopedMuftiMessages,
  type StoredHanafiMuftiMessage,
} from '@/utils/hanafiMuftiStorage';
import {
  getActiveMadhhab,
  isHanafiMadhhab,
  subscribeActiveMadhhab,
  type MadhhabKey,
} from '@/utils/madhhab';
import { hydrateMadhhab } from '@/utils/madhhabStorage';

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

function resolveMuftiError(code: HanafiMuftiErrorCode, language: AppLanguage): string {
  const keys: Record<HanafiMuftiErrorCode, Parameters<typeof translateUi>[0]> = {
    not_configured: 'mufti.error.notConfigured',
    offline: 'mufti.error.offline',
    invalid_request: 'mufti.error.invalid',
    unavailable: 'mufti.error.server',
    rate_limited: 'mufti.error.rateLimited',
    server_error: 'mufti.error.server',
    connection_error: 'mufti.error.connection',
    empty_response: 'mufti.error.empty',
    aborted: 'mufti.error.aborted',
  };
  return translateUi(keys[code], language);
}

let store: HanafiMuftiStore = { ...INITIAL_STORE };
const listeners = new Set<() => void>();
let loadPromise: Promise<void> | null = null;
let threadMadhhab: MadhhabKey = 'hanafi';
let pendingNewSession = false;
let activeAbort: AbortController | null = null;
let threadReady = false;

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

async function loadThread(madhhab: MadhhabKey): Promise<StoredHanafiMuftiMessage[]> {
  if (isHanafiMadhhab(madhhab)) return loadHanafiMuftiMessages();
  return loadScopedMuftiMessages(madhhab);
}

async function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const madhhab = await hydrateMadhhab();
      threadMadhhab = madhhab;
      const messages = await loadThread(madhhab);
      setStore({ messages, isLoading: false });
      threadReady = true;
    })();
  }
  await loadPromise;
}

async function adoptMadhhabThread(next: MadhhabKey): Promise<void> {
  const switching = threadReady && next !== threadMadhhab;
  if (next === threadMadhhab && !store.isLoading) return;
  activeAbort?.abort();
  activeAbort = null;
  threadMadhhab = next;
  if (switching) pendingNewSession = !isHanafiMadhhab(next);
  const messages = await loadThread(next);
  if (threadMadhhab !== next) return;
  setStore({
    messages,
    isStreaming: false,
    streamingContent: '',
    error: null,
    isLoading: false,
  });
}

async function persistMessages(messages: StoredHanafiMuftiMessage[]): Promise<void> {
  if (isHanafiMadhhab(threadMadhhab)) {
    await saveHanafiMuftiMessages(messages);
    return;
  }
  await saveScopedMuftiMessages(threadMadhhab, messages);
}

export function useHanafiMufti() {
  const appLanguage = useAppLanguage();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void ensureLoaded();
    const unsubscribe = subscribeActiveMadhhab(() => {
      void adoptMadhhabThread(getActiveMadhhab());
    });
    return () => {
      unsubscribe();
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || store.isStreaming) return false;

    if (!isHanafiMuftiConfigured()) {
      setStore({ error: translateUi('mufti.error.notConfigured', appLanguage) });
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
    activeAbort = controller;

    const apiMessages = nextMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let assistantText = '';
    const preferredLanguage = detectMuftiMessageLanguage(trimmed, appLanguage);
    const school = threadMadhhab;
    const sendAsNewSession = pendingNewSession && !isHanafiMadhhab(school);

    await askHanafiMufti(apiMessages, {
      signal: controller.signal,
      preferredLanguage,
      ...(isHanafiMadhhab(school)
        ? {}
        : { madhhab: school, ...(sendAsNewSession ? { sessionState: 'new' as const } : {}) }),
      onDelta: (chunk) => {
        if (threadMadhhab !== school) return;
        assistantText += chunk;
        setStore({ streamingContent: assistantText });
      },
      onDone: () => {
        if (controller.signal.aborted || threadMadhhab !== school) return;
        if (sendAsNewSession) pendingNewSession = false;

        const assistantMessage: StoredHanafiMuftiMessage = {
          role: 'assistant',
          content: assistantText.trim() || translateUi('mufti.error.empty', preferredLanguage),
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
      onError: (code) => {
        if (controller.signal.aborted || threadMadhhab !== school) return;
        setStore({
          isStreaming: false,
          streamingContent: '',
          error: resolveMuftiError(code, preferredLanguage),
        });
      },
    });

    return true;
  }, [appLanguage]);

  const clearConversation = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = null;
    activeAbort = null;
    if (isHanafiMadhhab(threadMadhhab)) {
      await clearHanafiMuftiMessages();
    } else {
      await clearScopedMuftiMessages(threadMadhhab);
      pendingNewSession = true;
    }
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
