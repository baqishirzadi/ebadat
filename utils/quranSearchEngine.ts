/**
 * Disk-backed Quran search engine (expo-sqlite + FTS5).
 * Does not load the full surah JSON corpus into JS memory.
 */

import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { SearchResult } from '@/types/quran';
import {
  cleanPashtoDisplay,
  compactArabicForSearch,
  normalizeArabicForSearch,
  normalizeDariForSearch,
  normalizePashtoForSearch,
  scoreMatch,
  type SearchLanguage,
} from '@/utils/quranSearchNormalize';

export type QuranSearchMode = 'arabic' | 'dari' | 'pashto' | 'all';

export type QuranSearchOptions = {
  mode?: QuranSearchMode;
  limit?: number;
  offset?: number;
};

export type QuranSearchPage = {
  results: SearchResult[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

type DbAyahRow = {
  id: number;
  surah_number: number;
  ayah_number: number;
  surah_name: string;
  arabic_text: string;
  dari_text: string;
  pashto_text: string;
  arabic_norm: string;
  arabic_compact: string;
  dari_norm: string;
  pashto_norm: string;
};

const DB_ASSET_NAME = 'quran-search.db';
const DB_RUNTIME_NAME = 'quran-search-v1.db';
const DEFAULT_LIMIT = 25;
const MAX_CANDIDATES = 400;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let ftsAvailable: boolean | null = null;

function escapeLike(value: string): string {
  return value.replace(/([%_\\])/g, '\\$1');
}

async function ensureDatabaseCopied(): Promise<string> {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error('FileSystem.documentDirectory is unavailable');
  }

  const sqliteDir = `${documentDirectory}SQLite`;
  const targetPath = `${sqliteDir}/${DB_RUNTIME_NAME}`;

  const targetInfo = await FileSystem.getInfoAsync(targetPath);
  if (!targetInfo.exists) {
    const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
    }

    const asset = Asset.fromModule(require('../assets/quran-search.db'));
    await asset.downloadAsync();
    const sourceUri = asset.localUri || asset.uri;
    if (!sourceUri) {
      throw new Error('Quran search database asset is unavailable');
    }
    await FileSystem.copyAsync({ from: sourceUri, to: targetPath });
  }

  return DB_RUNTIME_NAME;
}

async function openSearchDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === 'web') {
    throw new Error('Quran search is unavailable on web');
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      const dbName = await ensureDatabaseCopied();
      const db = await SQLite.openDatabaseAsync(dbName);
      try {
        await db.execAsync('SELECT 1 FROM ayahs_fts LIMIT 1');
        ftsAvailable = true;
      } catch {
        ftsAvailable = false;
      }
      return db;
    })().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }

  return dbPromise;
}

function buildResult(
  row: DbAyahRow,
  matchedLanguage: SearchLanguage,
  score: number,
  matchedText: string,
): SearchResult {
  return {
    surahNumber: row.surah_number,
    surahName: row.surah_name,
    ayahNumber: row.ayah_number,
    text: row.arabic_text,
    matchedText,
    matchedLanguage,
    score,
    snippet:
      matchedLanguage === 'arabic'
        ? row.arabic_text
        : matchedLanguage === 'dari'
          ? row.dari_text
          : row.pashto_text,
    translation: {
      dari: row.dari_text,
      pashto: row.pashto_text,
    },
    highlightRanges: [{ start: 0, end: matchedLanguage === 'arabic' ? row.arabic_text.length : matchedLanguage === 'dari' ? row.dari_text.length : row.pashto_text.length }],
  };
}

function scoreRow(
  row: DbAyahRow,
  mode: QuranSearchMode,
  norms: {
    arabic: string;
    arabicCompact: string;
    dari: string;
    pashto: string;
  },
): { language: SearchLanguage; score: number; matchedText: string } | null {
  const candidates: Array<{ language: SearchLanguage; score: number; matchedText: string }> = [];

  if (mode === 'arabic' || mode === 'all') {
    let score = scoreMatch(row.arabic_norm, norms.arabic);
    if (score <= 0 && norms.arabicCompact) {
      score = Math.max(0, scoreMatch(row.arabic_compact, norms.arabicCompact) - 50);
    }
    if (score > 0) {
      candidates.push({ language: 'arabic', score, matchedText: norms.arabic });
    }
  }

  if (mode === 'dari' || mode === 'all') {
    const score = scoreMatch(row.dari_norm, norms.dari);
    if (score > 0) {
      candidates.push({ language: 'dari', score, matchedText: norms.dari });
    }
  }

  if (mode === 'pashto' || mode === 'all') {
    const score = scoreMatch(row.pashto_norm, norms.pashto);
    if (score > 0) {
      candidates.push({ language: 'pashto', score, matchedText: norms.pashto });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

async function queryCandidates(
  db: SQLite.SQLiteDatabase,
  mode: QuranSearchMode,
  norms: {
    arabic: string;
    arabicCompact: string;
    dari: string;
    pashto: string;
  },
): Promise<DbAyahRow[]> {
  const clauses: string[] = [];
  const params: string[] = [];

  if ((mode === 'arabic' || mode === 'all') && norms.arabic.length >= 2) {
    clauses.push('arabic_norm LIKE ? ESCAPE \'\\\'');
    params.push(`%${escapeLike(norms.arabic)}%`);
    if (norms.arabicCompact.length >= 2) {
      clauses.push('arabic_compact LIKE ? ESCAPE \'\\\'');
      params.push(`%${escapeLike(norms.arabicCompact)}%`);
    }
  }

  if ((mode === 'dari' || mode === 'all') && norms.dari.length >= 2) {
    clauses.push('dari_norm LIKE ? ESCAPE \'\\\'');
    params.push(`%${escapeLike(norms.dari)}%`);
  }

  if ((mode === 'pashto' || mode === 'all') && norms.pashto.length >= 2) {
    clauses.push('pashto_norm LIKE ? ESCAPE \'\\\'');
    params.push(`%${escapeLike(norms.pashto)}%`);
  }

  if (clauses.length === 0) return [];

  // Prefer FTS when available for multi-token queries; LIKE fallback always works for phrases.
  if (ftsAvailable && norms.arabic.split(' ').length === 1 && mode === 'arabic') {
    try {
      const token = norms.arabic.replace(/"/g, '');
      const ftsRows = await db.getAllAsync<DbAyahRow>(
        `
          SELECT a.*
          FROM ayahs_fts f
          JOIN ayahs a ON a.id = f.rowid
          WHERE ayahs_fts MATCH ?
          LIMIT ?
        `,
        [`arabic_norm:${token}* OR arabic_compact:${norms.arabicCompact}*`, MAX_CANDIDATES],
      );
      if (ftsRows.length > 0) return ftsRows;
    } catch {
      // Fall through to LIKE.
    }
  }

  const sql = `
    SELECT *
    FROM ayahs
    WHERE ${clauses.join(' OR ')}
    ORDER BY surah_number ASC, ayah_number ASC
    LIMIT ?
  `;
  return db.getAllAsync<DbAyahRow>(sql, [...params, MAX_CANDIDATES]);
}

export async function searchQuranPaged(
  query: string,
  options: QuranSearchOptions = {},
): Promise<QuranSearchPage> {
  const mode = options.mode || 'all';
  const limit = Math.max(1, Math.min(options.limit ?? DEFAULT_LIMIT, 100));
  const offset = Math.max(0, options.offset ?? 0);

  const arabic = normalizeArabicForSearch(query);
  const arabicCompact = compactArabicForSearch(query);
  const dari = normalizeDariForSearch(query);
  const pashto = normalizePashtoForSearch(query);

  const activeNorm =
    mode === 'arabic' ? arabic : mode === 'dari' ? dari : mode === 'pashto' ? pashto : arabic || dari || pashto;

  if (!activeNorm || activeNorm.length < 2) {
    return { results: [], total: 0, offset, limit, hasMore: false };
  }

  const db = await openSearchDatabase();
  const norms = { arabic, arabicCompact, dari, pashto };
  const candidates = await queryCandidates(db, mode, norms);

  const scored: SearchResult[] = [];
  for (const row of candidates) {
    const match = scoreRow(row, mode, norms);
    if (!match) continue;
    scored.push(buildResult(row, match.language, match.score, match.matchedText));
  }

  scored.sort((a, b) => {
    const scoreDiff = (b.score || 0) - (a.score || 0);
    if (scoreDiff !== 0) return scoreDiff;
    if (a.surahNumber !== b.surahNumber) return a.surahNumber - b.surahNumber;
    return a.ayahNumber - b.ayahNumber;
  });

  const total = scored.length;
  const results = scored.slice(offset, offset + limit);
  return {
    results,
    total,
    offset,
    limit,
    hasMore: offset + results.length < total,
  };
}

/** Backward-compatible Arabic search API. */
export async function searchArabicIndex(query: string, limit: number = 50): Promise<SearchResult[]> {
  const page = await searchQuranPaged(query, { mode: 'arabic', limit, offset: 0 });
  return page.results;
}

/** Backward-compatible translation search API. */
export async function searchTranslationIndex(
  query: string,
  language: 'dari' | 'pashto' | 'both' = 'both',
  limit: number = 50,
): Promise<SearchResult[]> {
  const mode: QuranSearchMode =
    language === 'both' ? 'all' : language === 'dari' ? 'dari' : 'pashto';
  // "both" historically meant both translations; exclude Arabic for that path.
  if (language === 'both') {
    const dariPage = await searchQuranPaged(query, { mode: 'dari', limit, offset: 0 });
    const pashtoPage = await searchQuranPaged(query, { mode: 'pashto', limit, offset: 0 });
    const merged = new Map<string, SearchResult>();
    for (const item of [...dariPage.results, ...pashtoPage.results]) {
      const key = `${item.surahNumber}:${item.ayahNumber}:${item.matchedLanguage}`;
      const existing = merged.get(key);
      if (!existing || (item.score || 0) > (existing.score || 0)) {
        merged.set(key, item);
      }
    }
    return Array.from(merged.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);
  }

  const page = await searchQuranPaged(query, { mode, limit, offset: 0 });
  return page.results;
}

export async function ensureAyahIndexReady(): Promise<void> {
  await openSearchDatabase();
}

export function clearQuranSearchIndexCache(): void {
  dbPromise = null;
  ftsAvailable = null;
}

export {
  cleanPashtoDisplay,
  compactArabicForSearch,
  normalizeArabicForSearch,
  normalizeDariForSearch,
  normalizePashtoForSearch,
};
