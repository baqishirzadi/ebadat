import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Hadith, HadithEntryDTO } from '@/types/hadith';

const STORAGE_KEYS = {
  CACHE: '@ebadat/ahadith_remote_cache_v1',
  LAST_SYNC_AT: '@ebadat/ahadith_remote_last_sync_at',
};

const extra = (Constants.expoConfig?.extra || (Constants as any).manifest?.extra || {}) as {
  supabaseUrl?: string;
  hadithClientUrl?: string;
};

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || '';
const HADITH_CLIENT_URL =
  process.env.EXPO_PUBLIC_HADITH_CLIENT_URL ||
  extra.hadithClientUrl ||
  (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/hadith-client` : '');

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTopics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeString(item).toLowerCase())
    .filter((item) => item.length > 0);
}

function normalizeRemoteHadith(input: Partial<HadithEntryDTO>): Hadith | null {
  const id = Number(input.id);
  if (!Number.isInteger(id) || id <= 0) return null;

  const sourceBook = input.source_book === 'Bukhari' || input.source_book === 'Muslim'
    ? input.source_book
    : null;
  if (!sourceBook) return null;

  const arabicText = normalizeString(input.arabic_text);
  const dariTranslation = normalizeString(input.dari_translation);
  const pashtoTranslation = normalizeString(input.pashto_translation);
  const sourceNumber = normalizeString(input.source_number);
  if (!arabicText || !dariTranslation || !pashtoTranslation || !sourceNumber) return null;

  const dailyIndex =
    Number.isInteger(input.daily_index) && Number(input.daily_index) > 0
      ? Number(input.daily_index)
      : id;

  const hadith: Hadith = {
    id,
    arabic_text: arabicText,
    dari_translation: dariTranslation,
    pashto_translation: pashtoTranslation,
    source_book: sourceBook,
    source_number: sourceNumber,
    is_muttafaq: !!input.is_muttafaq,
    topics: normalizeTopics(input.topics),
    daily_index: dailyIndex,
  };

  if (Array.isArray(input.special_days) && input.special_days.length > 0) {
    const special = input.special_days.filter(
      (item): item is NonNullable<Hadith['special_days']>[number] =>
        item === 'ramadan' ||
        item === 'laylat_al_qadr' ||
        item === 'eid_al_fitr' ||
        item === 'eid_al_adha' ||
        item === 'first_10_dhul_hijjah' ||
        item === 'ashura'
    );
    if (special.length > 0) {
      hadith.special_days = special;
    }
  }

  if (
    input.hijri_range &&
    Number.isInteger(input.hijri_range.month) &&
    Number.isInteger(input.hijri_range.day_start) &&
    Number.isInteger(input.hijri_range.day_end)
  ) {
    hadith.hijri_range = {
      month: Number(input.hijri_range.month),
      day_start: Number(input.hijri_range.day_start),
      day_end: Number(input.hijri_range.day_end),
    };
  }

  if (input.weekday_only === 'friday') {
    hadith.weekday_only = 'friday';
  }

  return hadith;
}

async function callHadithClient<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
  if (!HADITH_CLIENT_URL) {
    throw new Error('HADITH_CLIENT_URL_MISSING');
  }

  const response = await fetch(HADITH_CLIENT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const responseText = await response.text().catch(() => '');
  const parsed = responseText ? (JSON.parse(responseText) as T) : ({} as T);

  if (!response.ok) {
    const error = (parsed as any)?.error || response.statusText || 'HADITH_CLIENT_REQUEST_FAILED';
    throw new Error(String(error));
  }

  return parsed;
}

async function saveRemoteCache(items: Hadith[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(items));
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_AT, new Date().toISOString());
}

export async function getCachedRemoteHadiths(): Promise<Hadith[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CACHE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeRemoteHadith(item))
      .filter((item): item is Hadith => !!item);
  } catch {
    return [];
  }
}

export async function syncPublishedHadiths(limit = 500): Promise<Hadith[]> {
  try {
    const result = await callHadithClient<{ hadiths: HadithEntryDTO[] }>('list_published', {
      limit,
    });

    const items = Array.isArray(result.hadiths)
      ? result.hadiths
          .map((item) => normalizeRemoteHadith(item))
          .filter((item): item is Hadith => !!item)
      : [];

    await saveRemoteCache(items);
    return items;
  } catch {
    return getCachedRemoteHadiths();
  }
}

export async function getPublishedHadithById(id: number): Promise<Hadith | null> {
  try {
    const result = await callHadithClient<{ hadith?: HadithEntryDTO }>('get_published_by_id', { id });
    if (!result.hadith) return null;
    const normalized = normalizeRemoteHadith(result.hadith);
    if (!normalized) return null;

    const cached = await getCachedRemoteHadiths();
    const merged = [...cached.filter((item) => item.id !== normalized.id), normalized];
    await saveRemoteCache(merged);
    return normalized;
  } catch {
    const cached = await getCachedRemoteHadiths();
    return cached.find((item) => item.id === id) || null;
  }
}
