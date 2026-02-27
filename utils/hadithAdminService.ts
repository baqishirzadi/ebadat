import Constants from 'expo-constants';
import { Hadith, HadithAdminPayload, HadithEntryDTO } from '@/types/hadith';

const SESSION_TTL_MS = 30 * 60 * 1000;

const extra = (Constants.expoConfig?.extra || (Constants as any).manifest?.extra || {}) as {
  supabaseUrl?: string;
  hadithAdminUrl?: string;
};

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || '';
const HADITH_ADMIN_URL =
  process.env.EXPO_PUBLIC_HADITH_ADMIN_URL ||
  extra.hadithAdminUrl ||
  (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/hadith-admin` : '');

interface AdminSession {
  pin: string;
  expiresAt: number;
}

interface AdminResult {
  ok?: boolean;
  error?: string;
}

export interface HadithPublishResult {
  hadith?: Hadith;
  published: boolean;
  sent: number;
  failed: number;
  retryRequired?: boolean;
}

let adminSession: AdminSession | null = null;

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function rowToHadith(row: Partial<HadithEntryDTO>): Hadith | null {
  const id = Number(row.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  if (row.source_book !== 'Bukhari' && row.source_book !== 'Muslim') return null;

  const arabicText = normalizeString(row.arabic_text);
  const dariTranslation = normalizeString(row.dari_translation);
  const pashtoTranslation = normalizeString(row.pashto_translation);
  const sourceNumber = normalizeString(row.source_number);
  if (!arabicText || !dariTranslation || !pashtoTranslation || !sourceNumber) return null;

  const hadith: Hadith = {
    id,
    arabic_text: arabicText,
    dari_translation: dariTranslation,
    pashto_translation: pashtoTranslation,
    source_book: row.source_book,
    source_number: sourceNumber,
    is_muttafaq: !!row.is_muttafaq,
    topics: Array.isArray(row.topics) ? row.topics.map((item) => normalizeString(item)).filter(Boolean) : [],
    daily_index:
      Number.isInteger(row.daily_index) && Number(row.daily_index) > 0
        ? Number(row.daily_index)
        : id,
  };

  if (Array.isArray(row.special_days) && row.special_days.length > 0) {
    hadith.special_days = row.special_days.filter(
      (item): item is NonNullable<Hadith['special_days']>[number] =>
        item === 'ramadan' ||
        item === 'laylat_al_qadr' ||
        item === 'eid_al_fitr' ||
        item === 'eid_al_adha' ||
        item === 'first_10_dhul_hijjah' ||
        item === 'ashura'
    );
  }

  if (
    row.hijri_range &&
    Number.isInteger(row.hijri_range.month) &&
    Number.isInteger(row.hijri_range.day_start) &&
    Number.isInteger(row.hijri_range.day_end)
  ) {
    hadith.hijri_range = {
      month: Number(row.hijri_range.month),
      day_start: Number(row.hijri_range.day_start),
      day_end: Number(row.hijri_range.day_end),
    };
  }

  if (row.weekday_only === 'friday') {
    hadith.weekday_only = 'friday';
  }

  return hadith;
}

function sessionIsActive(): boolean {
  return !!adminSession && adminSession.expiresAt > Date.now();
}

function refreshSessionExpiry(): void {
  if (!adminSession) return;
  adminSession.expiresAt = Date.now() + SESSION_TTL_MS;
}

function setSession(pin: string): void {
  adminSession = {
    pin,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
}

export function clearHadithAdminSession(): void {
  adminSession = null;
}

export function isHadithAdminSessionActive(): boolean {
  return sessionIsActive();
}

function getSessionPin(): string {
  if (!sessionIsActive()) {
    clearHadithAdminSession();
    throw new Error('HADITH_ADMIN_SESSION_EXPIRED');
  }
  refreshSessionExpiry();
  return adminSession!.pin;
}

function assertConfigured(): void {
  if (!HADITH_ADMIN_URL) {
    throw new Error('HADITH_ADMIN_URL_MISSING');
  }
}

async function callHadithAdmin<T>(
  action: string,
  payload?: Record<string, unknown>,
  options?: { pin?: string; skipSession?: boolean }
): Promise<T> {
  assertConfigured();

  const pin = options?.pin || (options?.skipSession ? '' : getSessionPin());
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (pin) {
    headers['x-admin-pin'] = pin;
  }

  const response = await fetch(HADITH_ADMIN_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...payload }),
  });

  const responseText = await response.text().catch(() => '');
  let parsed: T;
  try {
    parsed = responseText ? (JSON.parse(responseText) as T) : ({} as T);
  } catch {
    parsed = {} as T;
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearHadithAdminSession();
      throw new Error('HADITH_ADMIN_UNAUTHORIZED');
    }
    const errorMessage =
      (parsed as AdminResult)?.error ||
      (typeof parsed === 'string' ? parsed : '') ||
      response.statusText ||
      'HADITH_ADMIN_REQUEST_FAILED';
    throw new Error(errorMessage);
  }

  if (!options?.skipSession) {
    refreshSessionExpiry();
  }

  return parsed;
}

function normalizePayload(payload: HadithAdminPayload): HadithAdminPayload {
  return {
    ...payload,
    arabic_text: normalizeString(payload.arabic_text),
    dari_translation: normalizeString(payload.dari_translation),
    pashto_translation: normalizeString(payload.pashto_translation),
    source_number: normalizeString(payload.source_number),
    topics: payload.topics.map((topic) => normalizeString(topic).toLowerCase()).filter(Boolean),
  };
}

export async function verifyHadithAdminPin(pin: string): Promise<boolean> {
  const normalizedPin = pin.trim();
  if (!normalizedPin) return false;

  try {
    const result = await callHadithAdmin<{ ok: boolean }>(
      'verify_pin',
      { pin: normalizedPin },
      { pin: normalizedPin, skipSession: true }
    );
    if (!result.ok) return false;
    setSession(normalizedPin);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message === 'HADITH_ADMIN_UNAUTHORIZED') {
      return false;
    }
    throw error;
  }
}

export async function createAndPublishHadith(payload: HadithAdminPayload): Promise<HadithPublishResult> {
  const normalized = normalizePayload(payload);
  const result = await callHadithAdmin<{
    published: boolean;
    sent: number;
    failed: number;
    retryRequired?: boolean;
    hadith?: HadithEntryDTO;
  }>('create_and_publish_hadith', normalized as unknown as Record<string, unknown>);

  return {
    hadith: result.hadith ? rowToHadith(result.hadith) || undefined : undefined,
    published: !!result.published,
    sent: Number(result.sent || 0),
    failed: Number(result.failed || 0),
    retryRequired: !!result.retryRequired,
  };
}

export async function retryHadithNotification(id: number): Promise<HadithPublishResult> {
  const result = await callHadithAdmin<{
    published: boolean;
    sent: number;
    failed: number;
    retryRequired?: boolean;
    hadith?: HadithEntryDTO;
  }>('retry_hadith_notification', { id });

  return {
    hadith: result.hadith ? rowToHadith(result.hadith) || undefined : undefined,
    published: !!result.published,
    sent: Number(result.sent || 0),
    failed: Number(result.failed || 0),
    retryRequired: !!result.retryRequired,
  };
}
