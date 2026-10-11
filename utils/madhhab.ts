/**
 * School of fiqh selected by the user.
 * Hanafi is the default. Callers that keep today's behavior must treat
 * `hanafi` (and a missing value) as "do not branch".
 */

import type { AppLanguage } from '@/types/quran';

export const MADHHAB_KEYS = ['hanafi', 'shafii', 'maliki', 'hanbali', 'ahl_hadith'] as const;

export type MadhhabKey = (typeof MADHHAB_KEYS)[number];

export const DEFAULT_MADHHAB: MadhhabKey = 'hanafi';

export const MADHHAB_STORAGE_KEY = '@ebadat/madhhab';

type MadhhabCopy = Record<AppLanguage, string>;

const OPTION_LABELS: Record<MadhhabKey, MadhhabCopy> = {
  hanafi: { dari: 'حنفی', pashto: 'حنفي', english: 'Hanafi', arabic: 'الحنفي', turkish: 'Hanefi' },
  shafii: { dari: 'شافعی', pashto: 'شافعي', english: "Shafi'i", arabic: 'الشافعي', turkish: 'Şafii' },
  maliki: { dari: 'مالکی', pashto: 'مالکي', english: 'Maliki', arabic: 'المالكي', turkish: 'Maliki' },
  hanbali: { dari: 'حنبلی', pashto: 'حنبلي', english: 'Hanbali', arabic: 'الحنبلي', turkish: 'Hanbeli' },
  ahl_hadith: { dari: 'اهل حدیث', pashto: 'اهل حدیث', english: 'Ahl al-Hadith', arabic: 'أهل الحديث', turkish: 'Ehl-i Hadis' },
};

/** Titles for schools other than Hanafi. Hanafi keeps the existing app strings. */
const MUFTI_TITLES: Record<Exclude<MadhhabKey, 'hanafi'>, MadhhabCopy> = {
  shafii: {
    dari: 'مفتی هوشمند شافعی',
    pashto: 'هوښیار شافعي مفتي',
    english: "Smart Shafi'i Mufti",
    arabic: 'المفتي الذكي الشافعي',
    turkish: 'Akıllı Şafii Müftü',
  },
  maliki: {
    dari: 'مفتی هوشمند مالکی',
    pashto: 'هوښیار مالکي مفتي',
    english: 'Smart Maliki Mufti',
    arabic: 'المفتي الذكي المالكي',
    turkish: 'Akıllı Maliki Müftü',
  },
  hanbali: {
    dari: 'مفتی هوشمند حنبلی',
    pashto: 'هوښیار حنبلي مفتي',
    english: 'Smart Hanbali Mufti',
    arabic: 'المفتي الذكي الحنبلي',
    turkish: 'Akıllı Hanbeli Müftü',
  },
  ahl_hadith: {
    dari: 'مفتی هوشمند اهل حدیث',
    pashto: 'د اهل حدیثو هوښیار مفتي',
    english: 'Smart Ahl al-Hadith Mufti',
    arabic: 'المفتي الذكي لأهل الحديث',
    turkish: 'Akıllı Ehl-i Hadis Müftü',
  },
};

let active: MadhhabKey = DEFAULT_MADHHAB;
const listeners = new Set<(madhhab: MadhhabKey) => void>();

export function isHanafiMadhhab(
  madhhab: MadhhabKey | null | undefined,
): madhhab is 'hanafi' | null | undefined {
  return madhhab == null || madhhab === 'hanafi';
}

export function parseMadhhab(value: unknown): MadhhabKey {
  if (typeof value === 'string' && (MADHHAB_KEYS as readonly string[]).includes(value)) {
    return value as MadhhabKey;
  }
  return DEFAULT_MADHHAB;
}

export function getActiveMadhhab(): MadhhabKey {
  return active;
}

export function setActiveMadhhab(next: MadhhabKey): void {
  const parsed = parseMadhhab(next);
  if (parsed === active) return;
  active = parsed;
  listeners.forEach((listener) => listener(active));
}

export function subscribeMadhhab(listener: (madhhab: MadhhabKey) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Adapter for useSyncExternalStore, which expects a no-argument listener. */
export function subscribeActiveMadhhab(onStoreChange: () => void): () => void {
  return subscribeMadhhab(() => onStoreChange());
}

export function madhhabLabel(madhhab: MadhhabKey, language: AppLanguage): string {
  return OPTION_LABELS[parseMadhhab(madhhab)][language];
}

/** Null for Hanafi so the screen keeps the existing translated title. */
export function nonHanafiMuftiTitle(madhhab: MadhhabKey, language: AppLanguage): string | null {
  if (madhhab === 'hanafi') return null;
  return MUFTI_TITLES[madhhab][language];
}
