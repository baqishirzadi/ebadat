import { getDateKeyInTimezone } from '@/utils/prayerTimezone';

export interface WidgetHadith {
  id: number;
  text: string;
  source: string;
}

type CuratedHadith = {
  id?: number;
  daily_index?: number;
  dari_translation?: string;
  source_book?: string;
  source_number?: string;
};

let hadithCache: WidgetHadith[] | null = null;

function loadHadiths(): WidgetHadith[] {
  if (hadithCache) return hadithCache;

  // Keep this lazy: the main app should not parse the curated dataset during
  // startup just because the widget snapshot module was imported.
  const dataset = require('@/data/ahadith/hadiths.curated.v1.json') as CuratedHadith[];
  hadithCache = dataset
    .filter((item) => Number.isInteger(item.id) && typeof item.dari_translation === 'string' && item.dari_translation.trim())
    .map((item) => ({
      id: item.id!,
      text: item.dari_translation!.replace(/\s+/g, ' ').trim(),
      source: [item.source_book, item.source_number].filter(Boolean).join(' '),
      dailyIndex: Number.isInteger(item.daily_index) ? item.daily_index! : item.id!,
    }))
    .sort((a, b) => a.dailyIndex - b.dailyIndex || a.id - b.id)
    .map(({ id, text, source }) => ({ id, text, source }));

  return hadithCache;
}

function epochDay(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (![year, month, day].every(Number.isFinite)) return 0;
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/**
 * Selects a stable local-date Hadith from bundled data. No network or app
 * process is required, so the Android/iOS widget can rotate it independently.
 */
export function getWidgetHadithForDateKey(dateKey: string): WidgetHadith {
  const hadiths = loadHadiths();
  if (hadiths.length === 0) return { id: 0, text: '', source: '' };
  const index = ((epochDay(dateKey) % hadiths.length) + hadiths.length) % hadiths.length;
  return hadiths[index];
}

export function getWidgetHadithForDate(date: Date, timezone = 'Asia/Kabul'): WidgetHadith {
  return getWidgetHadithForDateKey(getDateKeyInTimezone(date, timezone));
}
