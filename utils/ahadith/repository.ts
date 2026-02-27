import dataset from '@/data/ahadith/hadiths.curated.v1.json';
import { Hadith } from '@/types/hadith';

const hadiths = Object.freeze((dataset as Hadith[]).slice().sort((a, b) => a.daily_index - b.daily_index || a.id - b.id));

let topicCache: Map<string, Hadith[]> | null = null;
let muttafaqCache: Hadith[] | null = null;
let idCache: Map<number, Hadith> | null = null;

function ensureTopicCache(): Map<string, Hadith[]> {
  if (topicCache) return topicCache;

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
    map.set(topic, list.slice().sort((a, b) => a.daily_index - b.daily_index || a.id - b.id));
  }

  topicCache = map;
  return map;
}

function ensureIdCache(): Map<number, Hadith> {
  if (idCache) return idCache;

  const map = new Map<number, Hadith>();
  for (const hadith of hadiths) {
    map.set(hadith.id, hadith);
  }

  idCache = map;
  return map;
}

export function getAllHadiths(): Hadith[] {
  return hadiths as Hadith[];
}

export function getHadithById(id: number): Hadith | undefined {
  return ensureIdCache().get(id);
}

export function getMuttafaqHadiths(): Hadith[] {
  if (!muttafaqCache) {
    muttafaqCache = hadiths.filter((hadith) => hadith.is_muttafaq);
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
  return items.slice().sort((a, b) => a.daily_index - b.daily_index || a.id - b.id);
}
