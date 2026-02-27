import { Hadith } from '@/types/hadith';

export interface HadithSearchResult {
  hadith: Hadith;
  score: number;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\u06D6-\u06ED]/g, '')
    .replace(/[^\u0600-\u06FFa-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchBlob(hadith: Hadith): string {
  return normalizeText(
    `${hadith.arabic_text} ${hadith.dari_translation} ${hadith.pashto_translation} ${hadith.topics.join(' ')}`
  );
}

const blobCache = new Map<number, string>();

function getSearchBlob(hadith: Hadith): string {
  const cached = blobCache.get(hadith.id);
  if (cached) return cached;

  const blob = buildSearchBlob(hadith);
  blobCache.set(hadith.id, blob);
  return blob;
}

export function searchHadiths(hadiths: Hadith[], query: string, limit = 100): HadithSearchResult[] {
  const term = normalizeText(query);
  if (!term || term.length < 2) {
    return [];
  }

  const results: HadithSearchResult[] = [];

  for (const hadith of hadiths) {
    const blob = getSearchBlob(hadith);
    if (!blob.includes(term)) continue;

    let score = 0;
    if (normalizeText(hadith.arabic_text).includes(term)) score += 5;
    if (normalizeText(hadith.dari_translation).includes(term)) score += 3;
    if (normalizeText(hadith.pashto_translation).includes(term)) score += 3;
    if (hadith.topics.some((topic) => normalizeText(topic).includes(term))) score += 2;

    results.push({ hadith, score });
  }

  return results
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.hadith.daily_index !== b.hadith.daily_index) return a.hadith.daily_index - b.hadith.daily_index;
      return a.hadith.id - b.hadith.id;
    })
    .slice(0, limit);
}
