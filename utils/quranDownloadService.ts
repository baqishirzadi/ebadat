import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { JUZ_RANGES, getJuzRange } from '@/data/juzRanges';
import { getSurahSync } from '@/hooks/useSurahData';
import {
  getAyahCachePath,
  getAyahUrl,
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

function isReciterKey(value: string | null): value is ReciterKey {
  return Boolean(value && value in RECITERS);
}

export async function getSavedDownloadReciter(): Promise<ReciterKey | null> {
  try {
    const saved = await AsyncStorage.getItem(QURAN_DOWNLOAD_RECITER_KEY);
    return isReciterKey(saved) ? saved : null;
  } catch {
    return null;
  }
}

export async function getPreferredDownloadReciter(fallback: ReciterKey = 'yasser_ad_dussary'): Promise<ReciterKey> {
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

export async function getDownloadManifest(): Promise<QuranDownloadManifestEntry[]> {
  return readManifest();
}

async function isValidCachedFile(path: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    return Boolean(info.exists && !info.isDirectory && typeof info.size === 'number' && info.size >= MIN_VALID_AUDIO_BYTES);
  } catch {
    return false;
  }
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
  const entries = await readManifest();
  const existing = entries.find((entry) => entry.key === key);
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
        const temporaryPath = `${path}.part`;
        try {
          await FileSystem.downloadAsync(getAyahUrl(range.surah, ayah, reciter), temporaryPath);
          if (!(await isValidCachedFile(temporaryPath))) throw new Error('invalid_audio_file');
          await FileSystem.moveAsync({ from: temporaryPath, to: path });
        } finally {
          const tempInfo = await FileSystem.getInfoAsync(temporaryPath).catch(() => null);
          if (tempInfo?.exists) await FileSystem.deleteAsync(temporaryPath, { idempotent: true });
        }
      }
      completed += 1;
      manifest.completed = completed;
      manifest.updatedAt = Date.now();
      const nextEntries = entries.filter((entry) => entry.key !== key);
      nextEntries.push(manifest);
      await writeManifest(nextEntries);
      onProgress?.({ ...manifest, current: { ...range, ayah } });
    }
  }
  // A resumed manifest can only be trusted after every range has been checked.
  if (existing && existing.total === total && completed === 0) manifest.completed = existing.completed;
  return manifest;
}

export async function deleteQuranScope(scope: QuranDownloadScope, reciter: ReciterKey): Promise<void> {
  for (const range of scope.ranges) {
    for (let ayah = range.startAyah; ayah <= range.endAyah; ayah += 1) {
      const path = getAyahCachePath(range.surah, ayah, reciter);
      if (path) await FileSystem.deleteAsync(path, { idempotent: true });
    }
  }
  const entries = await readManifest();
  await writeManifest(entries.filter((entry) => entry.key !== getDownloadManifestKey(reciter, scope)));
}

export { JUZ_RANGES };
