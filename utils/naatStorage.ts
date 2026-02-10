import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Naat, NaatDraft } from '@/types/naat';

const STORAGE_KEY = '@ebadat/naat_items_v1';
const NAAT_DIR = `${FileSystem.documentDirectory ?? ''}naat/`;

type StoredNaat = Omit<Naat, 'createdAt'> & { createdAt: string };

function serializeNaat(naat: Naat): StoredNaat {
  return {
    ...naat,
    createdAt: naat.createdAt.toISOString(),
  };
}

function deserializeNaat(naat: StoredNaat): Naat {
  return {
    ...naat,
    createdAt: new Date(naat.createdAt),
  };
}

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

export async function loadNaats(): Promise<Naat[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredNaat[];
    return parsed.map(deserializeNaat).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch {
    return [];
  }
}

export async function saveNaats(naats: Naat[]): Promise<void> {
  const payload = naats.map(serializeNaat);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function addNaat(draft: NaatDraft): Promise<Naat> {
  const naats = await loadNaats();
  const now = new Date();
  const naat: Naat = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    title: draft.title.trim(),
    reciterName: draft.reciterName.trim(),
    language: draft.language,
    youtubeUrl: draft.youtubeUrl.trim(),
    extractedAudioUrl: draft.extractedAudioUrl?.trim() || undefined,
    duration: undefined,
    localFileUri: undefined,
    isDownloaded: false,
    playCount: 0,
    createdAt: now,
  };
  const updated = [naat, ...naats];
  await saveNaats(updated);
  return naat;
}

export async function updateNaat(id: string, patch: Partial<Naat>): Promise<Naat | null> {
  const naats = await loadNaats();
  const index = naats.findIndex((n) => n.id === id);
  if (index === -1) return null;
  const updated = {
    ...naats[index],
    ...patch,
  };
  naats[index] = updated;
  await saveNaats(naats);
  return updated;
}

export async function deleteNaat(id: string): Promise<void> {
  const naats = await loadNaats();
  const next = naats.filter((n) => n.id !== id);
  await saveNaats(next);
}

export async function incrementPlayCount(id: string): Promise<void> {
  const naats = await loadNaats();
  const index = naats.findIndex((n) => n.id === id);
  if (index === -1) return;
  naats[index] = { ...naats[index], playCount: (naats[index].playCount || 0) + 1 };
  await saveNaats(naats);
}

export async function verifyDownloads(): Promise<void> {
  const naats = await loadNaats();
  let changed = false;
  for (let i = 0; i < naats.length; i++) {
    const naat = naats[i];
    if (naat.localFileUri) {
      const info = await FileSystem.getInfoAsync(naat.localFileUri);
      if (!info.exists) {
        naats[i] = { ...naat, localFileUri: undefined, isDownloaded: false };
        changed = true;
      }
    }
  }
  if (changed) {
    await saveNaats(naats);
  }
}
