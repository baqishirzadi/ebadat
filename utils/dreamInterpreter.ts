/**
 * Islamic Dream Interpreter — SSE client for the dream-interpreter edge function.
 */

import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';

import { DREAM_COPY } from '@/constants/dreamInterpreterCopy';
import type { AppLanguage } from '@/types/quran';

export type DreamInterpreterRole = 'user' | 'assistant';
export type DreamSessionState = 'new' | 'continuing';

export interface DreamInterpreterMessage {
  role: DreamInterpreterRole;
  content: string;
}

export interface AskDreamInterpreterOptions {
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
  signal?: AbortSignal;
  sessionState: DreamSessionState;
  /** UI language for client-side error copy. */
  language?: AppLanguage;
}

const DEFAULT_DREAM_URL =
  'https://sifmemjhejnopduwoajr.supabase.co/functions/v1/dream-interpreter';

const extra = (Constants.expoConfig?.extra || (Constants as { manifest?: { extra?: Record<string, string> } }).manifest?.extra || {}) as {
  dreamInterpreterUrl?: string;
  hanafiMuftiUrl?: string;
  hanafiMuftiAnonKey?: string;
};

const DREAM_URL =
  process.env.EXPO_PUBLIC_DREAM_INTERPRETER_URL || extra.dreamInterpreterUrl || DEFAULT_DREAM_URL;

const DREAM_ANON_KEY =
  process.env.EXPO_PUBLIC_HANAFI_MUFTI_ANON_KEY ||
  extra.hanafiMuftiAnonKey ||
  '';

const MAX_MESSAGES = 24;
const MAX_CONTENT_LENGTH = 4000;
const READ_TIMEOUT_MS = 90_000;

function dreamCopy(language: AppLanguage = 'dari') {
  return DREAM_COPY[language] ?? DREAM_COPY.dari;
}

export function isDreamInterpreterConfigured(): boolean {
  return DREAM_URL.length > 0 && DREAM_ANON_KEY.length > 0;
}

export function stripDreamMarkdown(text: string): string {
  return text
    .split('\n')
    .map((line) => line
      .replace(/^\s*#{1,6}\s*/, '')
      .replace(/\*\*/g, '')
      .replace(/__/g, '')
      .replace(/`+/g, ''))
    .join('\n');
}

async function hasNetwork(): Promise<boolean> {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) return false;
  if (netInfo.isInternetReachable === false) return false;
  return true;
}

function mapHttpError(status: number, bodyText: string, language: AppLanguage = 'dari'): string {
  const copy = dreamCopy(language);
  if (status === 402) return copy.unavailable;

  let parsedError = '';
  try {
    const parsed = JSON.parse(bodyText) as { error?: string };
    parsedError = typeof parsed.error === 'string' ? parsed.error : '';
  } catch {
    parsedError = bodyText.trim();
  }

  if (status === 429 && parsedError) return parsedError;
  if (parsedError && status !== 500) return parsedError;

  switch (status) {
    case 400:
      return language === 'english'
        ? 'The request is not valid.'
        : language === 'pashto'
          ? 'غوښتنه ناسمه ده.'
          : 'درخواست نامعتبر است.';
    case 429:
      return language === 'english'
        ? 'Please wait a moment and try again.'
        : language === 'pashto'
          ? 'لږه شېبه صبر وکړئ او بیا هڅه وکړئ.'
          : 'لطفاً چند لحظه صبر کنید و دوباره تلاش کنید.';
    case 500:
    default:
      return language === 'english'
        ? 'Server error. Please try again.'
        : language === 'pashto'
          ? 'د سرور تېروتنه ده. بیا هڅه وکړئ.'
          : 'خطای سرور. لطفاً دوباره تلاش کنید.';
  }
}

function parseSsePayload(data: string, onDelta: (chunk: string) => void): void {
  if (data === '[DONE]') return;

  try {
    const parsed = JSON.parse(data) as {
      choices?: Array<{ delta?: { content?: string } }>;
    };
    const delta = parsed.choices?.[0]?.delta?.content;
    if (typeof delta === 'string' && delta.length > 0) {
      onDelta(delta);
    }
  } catch {
    // Incomplete or heartbeat JSON; wait for the rest of the line.
  }
}

function processSseBuffer(buffer: string, onDelta: (chunk: string) => void, onDone: () => void): string {
  const lines = buffer.split('\n');
  const remainder = lines.pop() ?? '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith(':')) continue;
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (payload === '[DONE]') {
      onDone();
      return remainder;
    }
    parseSsePayload(payload, onDelta);
  }

  return remainder;
}

export function sanitizeDreamMessages(messages: DreamInterpreterMessage[]): DreamInterpreterMessage[] {
  return messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, MAX_CONTENT_LENGTH),
    }))
    .filter((m) => m.content.length > 0)
    .slice(-MAX_MESSAGES);
}

function mergeAbortSignals(userSignal: AbortSignal | undefined, timeoutMs: number): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onUserAbort = () => {
    clearTimeout(timer);
    controller.abort();
  };
  userSignal?.addEventListener('abort', onUserAbort);

  if (userSignal?.aborted) {
    clearTimeout(timer);
    controller.abort();
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      userSignal?.removeEventListener('abort', onUserAbort);
    },
  };
}

async function streamFromResponse(
  response: Response,
  options: AskDreamInterpreterOptions,
): Promise<void> {
  const { onDelta, onDone, signal } = options;
  let doneCalled = false;
  const finish = () => {
    if (doneCalled) return;
    doneCalled = true;
    onDone();
  };

  if (signal?.aborted) return;

  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    if (signal?.aborted) return;
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith(':') || !line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') break;
      parseSsePayload(payload, onDelta);
    }
    finish();
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    if (signal?.aborted) {
      await reader.cancel().catch(() => undefined);
      return;
    }

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    buffer = processSseBuffer(buffer, onDelta, finish);
    if (doneCalled) return;
  }

  if (!doneCalled && buffer.trim()) {
    processSseBuffer(`${buffer}\n`, onDelta, finish);
  }

  finish();
}

export async function askDreamInterpreter(
  messages: DreamInterpreterMessage[],
  options: AskDreamInterpreterOptions,
): Promise<void> {
  const { onError, sessionState } = options;
  const language = options.language ?? 'dari';
  const copy = dreamCopy(language);

  if (!isDreamInterpreterConfigured()) {
    onError(copy.notConfigured);
    return;
  }

  if (!(await hasNetwork())) {
    onError(copy.offline);
    return;
  }

  const payload = {
    messages: sanitizeDreamMessages(messages),
    sessionState,
  };
  if (payload.messages.length === 0) {
    onError(copy.noMessage);
    return;
  }

  const { signal, cleanup } = mergeAbortSignals(options.signal, READ_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(DREAM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: DREAM_ANON_KEY,
        Authorization: `Bearer ${DREAM_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    cleanup();
    if (options.signal?.aborted || signal.aborted) {
      if (options.signal?.aborted) return;
      onError(copy.unavailable);
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (/network request failed|failed to fetch|aborted/i.test(message)) {
      onError(copy.offline);
      return;
    }
    onError(copy.connectionError);
    return;
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    cleanup();
    if (options.signal?.aborted) return;
    onError(mapHttpError(response.status, bodyText, language));
    return;
  }

  try {
    await streamFromResponse(response, { ...options, signal });
  } catch (error) {
    if (options.signal?.aborted) return;
    const message = error instanceof Error ? error.message : String(error);
    onError(message || copy.receiveError);
  } finally {
    cleanup();
  }
}
