import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { JUZ_RANGES, getJuzRange } from '@/data/juzRanges';
import { getSurahSync } from '@/hooks/useSurahData';
import {
  getAyahCachePath,
  getAyahUrlCandidates,
  hasMp3Header,
  migrateStoredReciterKey,
  RECITERS,
  type ReciterKey,
} from '@/utils/quranAudio';

export type QuranDownloadRange = {
  surah: number;
  startAyah: number;
  endAyah: number;
};

export type QuranDownloadScope = {
  type: 'surah' | 'juz';
  id: number;
  ranges: QuranDownloadRange[];
};

export type QuranDownloadManifestEntry = {
  key: string;
  reciter: ReciterKey;
  scopeType: QuranDownloadScope['type'];
  scopeId: number;
  total: number;
  completed: number;
  updatedAt: number;
};

export type QuranDownloadProgress = QuranDownloadManifestEntry & {
  current?: QuranDownloadRange & { ayah: number };
};

export const QURAN_DOWNLOAD_MANIFEST_KEY = '@ebadat/quran_download_manifest_v1';
export const QURAN_DOWNLOAD_RECITER_KEY = '@ebadat/quran_download_reciter_v1';
const MIN_VALID_AUDIO_BYTES = 1024;
const DOWNLOAD_ATTEMPTS_PER_AYAH = 3;
const DOWNLOAD_RETRY_DELAY_MS = 500;

export async function getSavedDownloadReciter(): Promise<ReciterKey | null> {
  try {
    const saved = await AsyncStorage.getItem(QURAN_DOWNLOAD_RECITER_KEY);
    const migrated = migrateStoredReciterKey(saved);
    if (migrated && migrated !== saved) {
      await AsyncStorage.setItem(QURAN_DOWNLOAD_RECITER_KEY, migrated);
    }
    return migrated;
  } catch {
    return null;
  }
}

export async function getPreferredDownloadReciter(fallback: ReciterKey = 'minshawy_murattal'): Promise<ReciterKey> {
  return (await getSavedDownloadReciter()) ?? fallback;
}

export async function setPreferredDownloadReciter(reciter: ReciterKey): Promise<void> {
  if (!RECITERS[reciter]) throw new Error('unknown_reciter');
  await AsyncStorage.setItem(QURAN_DOWNLOAD_RECITER_KEY, reciter);
}

export function getSurahDownloadScope(surah: number, ayahCount?: number): QuranDownloadScope {
  const total = ayahCount ?? getSurahSync(surah)?.numberOfAyahs ?? 0;
  return {
    type: 'surah',
    id: surah,
    ranges: total > 0 ? [{ surah, startAyah: 1, endAyah: total }] : [],
  };
}

export function getJuzDownloadScope(juzNumber: number): QuranDownloadScope {
  const range = getJuzRange(juzNumber);
  if (!range) return { type: 'juz', id: juzNumber, ranges: [] };

  const ranges: QuranDownloadRange[] = [];
  for (let surah = range.startSurah; surah <= range.endSurah; surah += 1) {
    const ayahCount = getSurahSync(surah)?.numberOfAyahs ?? 0;
    if (!ayahCount) continue;
    const startAyah = surah === range.startSurah ? range.startAyah : 1;
    const endAyah = surah === range.endSurah ? range.endAyah : ayahCount;
    if (startAyah <= endAyah) ranges.push({ surah, startAyah, endAyah });
  }
  return { type: 'juz', id: juzNumber, ranges };
}

export function getDownloadManifestKey(reciter: ReciterKey, scope: Pick<QuranDownloadScope, 'type' | 'id'>): string {
  return `${reciter}:${scope.type}:${scope.id}`;
}

async function readManifest(): Promise<QuranDownloadManifestEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(QURAN_DOWNLOAD_MANIFEST_KEY);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

async function writeManifest(entries: QuranDownloadManifestEntry[]): Promise<void> {
  await AsyncStorage.setItem(QURAN_DOWNLOAD_MANIFEST_KEY, JSON.stringify(entries));
}

// Two cards (translation header and 16-line mode) can download at the same time,
// so every read-modify-write of the manifest goes through one queue.
let manifestQueue: Promise<unknown> = Promise.resolve();

function updateManifest(
  update: (entries: QuranDownloadManifestEntry[]) => QuranDownloadManifestEntry[],
): Promise<void> {
  const next = manifestQueue.then(async () => {
    await writeManifest(update(await readManifest()));
  });
  manifestQueue = next.catch(() => undefined);
  return next;
}

export async function getDownloadManifest(): Promise<QuranDownloadManifestEntry[]> {
  return readManifest();
}

async function isValidCachedFile(path: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    const sizeOk = Boolean(
      info.exists && !info.isDirectory && typeof info.size === 'number' && info.size >= MIN_VALID_AUDIO_BYTES,
    );
    return sizeOk && (await hasMp3Header(path));
  } catch {
    return false;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadAyahFile(
  surah: number,
  ayah: number,
  reciter: ReciterKey,
  path: string,
  signal?: AbortSignal,
): Promise<void> {
  const urls = getAyahUrlCandidates(surah, ayah, reciter);
  let lastError: unknown = new Error('download_failed');
  for (let attempt = 0; attempt < DOWNLOAD_ATTEMPTS_PER_AYAH; attempt += 1) {
    if (signal?.aborted) throw new Error('download_cancelled');
    const temporaryPath = `${path}.part-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const result = await FileSystem.downloadAsync(urls[attempt % urls.length], temporaryPath);
      if (result.status !== 200) throw new Error(`http_${result.status}`);
      if (!(await isValidCachedFile(temporaryPath))) throw new Error('invalid_audio_file');
      await FileSystem.deleteAsync(path, { idempotent: true });
      await FileSystem.moveAsync({ from: temporaryPath, to: path });
      return;
    } catch (error) {
      lastError = error;
    } finally {
      await FileSystem.deleteAsync(temporaryPath, { idempotent: true }).catch(() => undefined);
    }
    if (attempt < DOWNLOAD_ATTEMPTS_PER_AYAH - 1) await wait(DOWNLOAD_RETRY_DELAY_MS * (attempt + 1));
  }
  throw lastError;
}

async function ensureDirectory(reciter: ReciterKey): Promise<string> {
  const path = getAyahCachePath(1, 1, reciter);
  if (!path) throw new Error('cache_dir_unavailable');
  const directory = path.slice(0, path.lastIndexOf('/') + 1);
  const info = await FileSystem.getInfoAsync(directory);
  if (!info.exists) await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  return directory;
}

export async function downloadQuranScope(
  scope: QuranDownloadScope,
  reciter: ReciterKey,
  onProgress?: (progress: QuranDownloadProgress) => void,
  signal?: AbortSignal,
): Promise<QuranDownloadManifestEntry> {
  if (!RECITERS[reciter]) throw new Error('unknown_reciter');
  const ranges = scope.ranges;
  const total = ranges.reduce((sum, range) => sum + Math.max(0, range.endAyah - range.startAyah + 1), 0);
  const key = getDownloadManifestKey(reciter, scope);
  let completed = 0;
  const manifest: QuranDownloadManifestEntry = {
    key,
    reciter,
    scopeType: scope.type,
    scopeId: scope.id,
    total,
    completed: 0,
    updatedAt: Date.now(),
  };

  await ensureDirectory(reciter);
  for (const range of ranges) {
    for (let ayah = range.startAyah; ayah <= range.endAyah; ayah += 1) {
      if (signal?.aborted) throw new Error('download_cancelled');
      const path = getAyahCachePath(range.surah, ayah, reciter);
      if (!path) throw new Error('cache_dir_unavailable');
      if (!(await isValidCachedFile(path))) {
        await downloadAyahFile(range.surah, ayah, reciter, path, signal);
      }
      completed += 1;
      manifest.completed = completed;
      manifest.updatedAt = Date.now();
      const snapshot = { ...manifest };
      await updateManifest((entries) => [...entries.filter((entry) => entry.key !== key), snapshot]);
      onProgress?.({ ...snapshot, current: { ...range, ayah } });
    }
  }
  return { ...manifest };
}

export async function deleteQuranScope(scope: QuranDownloadScope, reciter: ReciterKey): Promise<void> {
  for (const range of scope.ranges) {
    for (let ayah = range.startAyah; ayah <= range.endAyah; ayah += 1) {
      const path = getAyahCachePath(range.surah, ayah, reciter);
      if (path) await FileSystem.deleteAsync(path, { idempotent: true });
    }
  }
  const key = getDownloadManifestKey(reciter, scope);
  await updateManifest((entries) => entries.filter((entry) => entry.key !== key));
}

export { JUZ_RANGES };
