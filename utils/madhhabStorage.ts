import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  MADHHAB_STORAGE_KEY,
  getActiveMadhhab,
  parseMadhhab,
  setActiveMadhhab,
  type MadhhabKey,
} from '@/utils/madhhab';

let writeGeneration = 0;
let hydratePromise: Promise<MadhhabKey> | null = null;

async function readStoredMadhhab(): Promise<MadhhabKey> {
  const seen = writeGeneration;
  let stored: string | null = null;
  try {
    stored = await AsyncStorage.getItem(MADHHAB_STORAGE_KEY);
  } catch {
    stored = null;
  }
  if (seen !== writeGeneration) return getActiveMadhhab();
  const parsed = parseMadhhab(stored);
  setActiveMadhhab(parsed);
  return getActiveMadhhab();
}

/** Loads the saved school once. Missing or invalid values stay Hanafi and do not notify. */
export function hydrateMadhhab(): Promise<MadhhabKey> {
  if (!hydratePromise) {
    hydratePromise = readStoredMadhhab();
  }
  return hydratePromise;
}

export async function persistMadhhab(next: MadhhabKey): Promise<void> {
  const parsed = parseMadhhab(next);
  writeGeneration += 1;
  setActiveMadhhab(parsed);
  await AsyncStorage.setItem(MADHHAB_STORAGE_KEY, parsed);
}
