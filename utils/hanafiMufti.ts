/**
 * Smart Hanafi Mufti — SSE client for the hanafi-mufti edge function.
 */

import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';

import type { AppLanguage } from '@/types/quran';

export type HanafiMuftiRole = 'user' | 'assistant';
export type HanafiMuftiErrorCode =
  | 'not_configured'
  | 'offline'
  | 'invalid_request'
  | 'unavailable'
  | 'rate_limited'
  | 'server_error'
  | 'connection_error'
  | 'empty_response'
  | 'aborted';
/**
 * Sent as `preferred_language`. The edge function currently composes its answer
 * in Dari regardless of this value, so changing it needs a server-side prompt
 * update to take effect.
 */
export type HanafiMuftiLanguage = AppLanguage;

export interface HanafiMuftiMessage {
  role: HanafiMuftiRole;
  content: string;
}

export interface AskHanafiMuftiOptions {
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (code: HanafiMuftiErrorCode) => void;
  signal?: AbortSignal;
  /** Set only for Dua/admin persona requests; normal Mufti chat omits it. */
  responderId?: string;
  preferredLanguage?: HanafiMuftiLanguage;
}

const DEFAULT_MUFTI_URL =
  'https://sifmemjhejnopduwoajr.supabase.co/functions/v1/hanafi-mufti';

const extra = (Constants.expoConfig?.extra || (Constants as { manifest?: { extra?: Record<string, string> } }).manifest?.extra || {}) as {
  hanafiMuftiUrl?: string;
  hanafiMuftiAnonKey?: string;
  supabaseAnonKey?: string;
};

const MUFTI_URL =
  process.env.EXPO_PUBLIC_HANAFI_MUFTI_URL || extra.hanafiMuftiUrl || DEFAULT_MUFTI_URL;

const MUFTI_ANON_KEY =
  process.env.EXPO_PUBLIC_HANAFI_MUFTI_ANON_KEY ||
  extra.hanafiMuftiAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  extra.supabaseAnonKey ||
  '';

const MAX_MESSAGES = 40;
const MAX_CONTENT_LENGTH = 4000;

export function isHanafiMuftiConfigured(): boolean {
  return MUFTI_URL.length > 0 && MUFTI_ANON_KEY.length > 0;
}

async function hasNetwork(): Promise<boolean> {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) return false;
  if (netInfo.isInternetReachable === false) return false;
  return true;
}

function mapHttpError(status: number): HanafiMuftiErrorCode {
  switch (status) {
    case 400:
      return 'invalid_request';
    case 402:
      return 'unavailable';
    case 429:
      return 'rate_limited';
    case 500:
    default:
      return 'server_error';
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
    // Ignore malformed SSE chunks.
  }
}

function processSseBuffer(buffer: string, onDelta: (chunk: string) => void, onDone: () => void): string {
  const lines = buffer.split('\n');
  const remainder = lines.pop() ?? '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
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

function sanitizeMessages(messages: HanafiMuftiMessage[]): HanafiMuftiMessage[] {
  return messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, MAX_CONTENT_LENGTH),
    }))
    .filter((m) => m.content.length > 0)
    .slice(-MAX_MESSAGES);
}

async function streamFromResponse(
  response: Response,
  options: AskHanafiMuftiOptions,
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
      if (!line.startsWith('data:')) continue;
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

export async function askHanafiMufti(
  messages: HanafiMuftiMessage[],
  options: AskHanafiMuftiOptions,
): Promise<void> {
  const { onError, signal } = options;

  if (!isHanafiMuftiConfigured()) {
    onError('not_configured');
    return;
  }

  if (!(await hasNetwork())) {
    onError('offline');
    return;
  }

  const payload = {
    messages: sanitizeMessages(messages),
    preferred_language: options.preferredLanguage || 'dari',
    ...(options.responderId ? { responder_id: options.responderId } : {}),
  };
  if (payload.messages.length === 0) {
    onError('invalid_request');
    return;
  }

  let response: Response;
  try {
    response = await fetch(MUFTI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MUFTI_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) return;
    const message = error instanceof Error ? error.message : String(error);
    if (/network request failed|failed to fetch|aborted/i.test(message)) {
      onError('offline');
      return;
    }
    onError('connection_error');
    return;
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    if (signal?.aborted) return;
    onError(mapHttpError(response.status));
    return;
  }

  try {
    await streamFromResponse(response, options);
  } catch (error) {
    if (signal?.aborted) return;
    const message = error instanceof Error ? error.message : String(error);
    onError(message ? 'connection_error' : 'empty_response');
  }
}
