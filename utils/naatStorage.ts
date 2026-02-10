import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Naat, NaatDraft } from '@/types/naat';

const CATALOG_KEY = '@ebadat/naat_catalog_v2';
const LOCAL_KEY = '@ebadat/naat_local_v2';
const NAAT_DIR = `${FileSystem.documentDirectory ?? ''}naats/`;

type StoredCatalog = Omit<Naat, 'localFileUri' | 'isDownloaded' | 'downloadProgress' | 'lastPositionMillis'>[];
type StoredLocal = {
  [id: string]: {
    localFileUri?: string;
    isDownloaded?: boolean;
    downloadProgress?: number;
    lastPositionMillis?: number;
    duration_seconds?: number | null;
    file_size_mb?: number | null;
  };
};

export async function ensureNaatDirectory(): Promise<void> {
  if (!NAAT_DIR) return;
  try {
    const info = await FileSystem.getInfoAsync(NAAT_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(NAAT_DIR, { intermediates: true });
    }
  } catch {
    // no-op
  }
}

export function getNaatDirectory(): string {
  return NAAT_DIR;
}

export async function loadCatalog(): Promise<StoredCatalog> {
  try {
    const raw = await AsyncStorage.getItem(CATALOG_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredCatalog;
  } catch {
    return [];
  }
}

export async function saveCatalog(items: StoredCatalog): Promise<void> {
  await AsyncStorage.setItem(CATALOG_KEY, JSON.stringify(items));
}

export async function loadLocalMeta(): Promise<StoredLocal> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredLocal;
  } catch {
    return {};
  }
}

export async function saveLocalMeta(meta: StoredLocal): Promise<void> {
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(meta));
}

export function mergeCatalogWithLocal(catalog: StoredCatalog, local: StoredLocal): Naat[] {
  return catalog.map((item) => {
    const localMeta = local[item.id] || {};
    return {
      ...item,
      localFileUri: localMeta.localFileUri,
      isDownloaded: !!localMeta.isDownloaded,
      downloadProgress: localMeta.downloadProgress,
      lastPositionMillis: localMeta.lastPositionMillis,
      duration_seconds: localMeta.duration_seconds ?? item.duration_seconds,
      file_size_mb: localMeta.file_size_mb ?? item.file_size_mb,
    };
  });
}

export async function upsertLocalMeta(id: string, patch: StoredLocal[string]): Promise<void> {
  const local = await loadLocalMeta();
  local[id] = { ...local[id], ...patch };
  await saveLocalMeta(local);
}

export async function deleteLocalMeta(id: string): Promise<void> {
  const local = await loadLocalMeta();
  if (local[id]) {
    delete local[id];
    await saveLocalMeta(local);
  }
}

export async function verifyDownloads(): Promise<void> {
  const local = await loadLocalMeta();
  let changed = false;
  const ids = Object.keys(local);
  for (const id of ids) {
    const meta = local[id];
    if (meta.localFileUri) {
      const info = await FileSystem.getInfoAsync(meta.localFileUri);
      if (!info.exists) {
        local[id] = { ...meta, localFileUri: undefined, isDownloaded: false };
        changed = true;
      }
    }
  }
  if (changed) {
    await saveLocalMeta(local);
  }
}

export function createDraftPayload(draft: NaatDraft): Partial<Naat> {
  return {
    title_fa: draft.title_fa.trim(),
    title_ps: draft.title_ps.trim(),
    reciter_name: draft.reciter_name.trim(),
    description: draft.description?.trim() || null,
    audio_url: draft.audio_url.trim(),
    duration_seconds: draft.duration_seconds ?? null,
    file_size_mb: draft.file_size_mb ?? null,
  };
}
