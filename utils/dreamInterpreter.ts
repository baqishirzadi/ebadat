/**
 * Islamic Dream Interpreter — SSE client for the dream-interpreter edge function.
 */

import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';

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
const GENERIC_UNAVAILABLE = 'سرویس موقتاً در دسترس نیست. لطفاً بعداً تلاش کنید.';

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

function mapHttpError(status: number, bodyText: string): string {
  if (status === 402) return GENERIC_UNAVAILABLE;

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
      return 'درخواست نامعتبر است.';
    case 429:
      return 'لطفاً چند لحظه صبر کنید و دوباره تلاش کنید.';
    case 500:
    default:
      return 'خطای سرور. لطفاً دوباره تلاش کنید.';
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

  if (!isDreamInterpreterConfigured()) {
    onError('سرویس تعبیر خواب هنوز پیکربندی نشده است.');
    return;
  }

  if (!(await hasNetwork())) {
    onError('اتصال اینترنت برقرار نیست.');
    return;
  }

  const payload = {
    messages: sanitizeDreamMessages(messages),
    sessionState,
  };
  if (payload.messages.length === 0) {
    onError('پیامی برای ارسال وجود ندارد.');
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
      onError(GENERIC_UNAVAILABLE);
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (/network request failed|failed to fetch|aborted/i.test(message)) {
      onError('اتصال اینترنت برقرار نیست.');
      return;
    }
    onError('خطا در ارتباط با سرور.');
    return;
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    cleanup();
    if (options.signal?.aborted) return;
    onError(mapHttpError(response.status, bodyText));
    return;
  }

  try {
    await streamFromResponse(response, { ...options, signal });
  } catch (error) {
    if (options.signal?.aborted) return;
    const message = error instanceof Error ? error.message : String(error);
    onError(message || 'خطا در دریافت پاسخ.');
  } finally {
    cleanup();
  }
}
