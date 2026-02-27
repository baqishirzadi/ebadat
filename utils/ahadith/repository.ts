import dataset from '@/data/ahadith/hadiths.curated.v1.json';
import { Hadith } from '@/types/hadith';

const localHadiths = Object.freeze(
  (dataset as Hadith[]).slice().sort((a, b) => a.daily_index - b.daily_index || a.id - b.id)
);

let remoteHadiths: Hadith[] = [];
let mergedCache: Hadith[] | null = null;
let topicCache: Map<string, Hadith[]> | null = null;
let muttafaqCache: Hadith[] | null = null;
let idCache: Map<number, Hadith> | null = null;

function sortDeterministic(items: Hadith[]): Hadith[] {
  return items.slice().sort((a, b) => a.daily_index - b.daily_index || a.id - b.id);
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTopics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const cleaned = value
    .map((item) => normalizeString(item).toLowerCase())
    .filter((item) => item.length > 0);
  return Array.from(new Set(cleaned));
}

function isValidSourceBook(value: unknown): value is Hadith['source_book'] {
  return value === 'Bukhari' || value === 'Muslim';
}

function normalizeHadithEntry(input: Hadith): Hadith | null {
  if (!Number.isInteger(input.id) || input.id <= 0) return null;
  if (!isValidSourceBook(input.source_book)) return null;

  const arabicText = normalizeString(input.arabic_text);
  const dariTranslation = normalizeString(input.dari_translation);
  const pashtoTranslation = normalizeString(input.pashto_translation);
  const sourceNumber = normalizeString(input.source_number);
  const topics = normalizeTopics(input.topics);

  if (!arabicText || !dariTranslation || !pashtoTranslation || !sourceNumber) {
    return null;
  }

  const dailyIndex =
    Number.isInteger(input.daily_index) && input.daily_index > 0
      ? input.daily_index
      : input.id;

  const normalized: Hadith = {
    id: input.id,
    arabic_text: arabicText,
    dari_translation: dariTranslation,
    pashto_translation: pashtoTranslation,
    source_book: input.source_book,
    source_number: sourceNumber,
    is_muttafaq: !!input.is_muttafaq,
    topics,
    daily_index: dailyIndex,
  };

  if (Array.isArray(input.special_days) && input.special_days.length > 0) {
    normalized.special_days = input.special_days.filter(
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
    input.hijri_range &&
    Number.isInteger(input.hijri_range.month) &&
    Number.isInteger(input.hijri_range.day_start) &&
    Number.isInteger(input.hijri_range.day_end)
  ) {
    normalized.hijri_range = {
      month: input.hijri_range.month,
      day_start: input.hijri_range.day_start,
      day_end: input.hijri_range.day_end,
    };
  }

  if (input.weekday_only === 'friday') {
    normalized.weekday_only = 'friday';
  }

  return normalized;
}

function clearCaches(): void {
  mergedCache = null;
  topicCache = null;
  muttafaqCache = null;
  idCache = null;
}

function getMergedHadiths(): Hadith[] {
  if (mergedCache) return mergedCache;

  const byId = new Map<number, Hadith>();
  for (const hadith of localHadiths) {
    byId.set(hadith.id, hadith);
  }
  for (const hadith of remoteHadiths) {
    byId.set(hadith.id, hadith);
  }

  mergedCache = sortDeterministic(Array.from(byId.values()));
  return mergedCache;
}

function ensureTopicCache(): Map<string, Hadith[]> {
  if (topicCache) return topicCache;
  const hadiths = getMergedHadiths();

  const map = new Map<string, Hadith[]>();
  for (const hadith of hadiths) {
    for (const topic of hadith.topics) {
      const key = topic.toLowerCase().trim();
      const list = map.get(key);
      if (list) {
        list.push(hadith);
      } else {
        map.set(key, [hadith]);
      }
    }
  }

  for (const [topic, list] of map.entries()) {
    map.set(topic, sortDeterministic(list));
  }

  topicCache = map;
  return map;
}

function ensureIdCache(): Map<number, Hadith> {
  if (idCache) return idCache;
  const hadiths = getMergedHadiths();

  const map = new Map<number, Hadith>();
  for (const hadith of hadiths) {
    map.set(hadith.id, hadith);
  }

  idCache = map;
  return map;
}

export function getAllHadiths(): Hadith[] {
  return getMergedHadiths();
}

export function getRemoteHadiths(): Hadith[] {
  return remoteHadiths;
}

export function setRemoteHadiths(items: Hadith[]): void {
  const normalized = items
    .map((item) => normalizeHadithEntry(item))
    .filter((item): item is Hadith => !!item);
  remoteHadiths = sortDeterministic(normalized);
  clearCaches();
}

export function getHadithById(id: number): Hadith | undefined {
  return ensureIdCache().get(id);
}

export function getMuttafaqHadiths(): Hadith[] {
  if (!muttafaqCache) {
    muttafaqCache = getMergedHadiths().filter((hadith) => hadith.is_muttafaq);
  }
  return muttafaqCache;
}

export function getHadithTopics(): string[] {
  return Array.from(ensureTopicCache().keys()).sort((a, b) => a.localeCompare(b));
}

export function getHadithsByTopic(topic: string): Hadith[] {
  return ensureTopicCache().get(topic.toLowerCase().trim()) ?? [];
}

export function getHadithsSortedByDailyIndex(items: Hadith[]): Hadith[] {
  return sortDeterministic(items);
}
