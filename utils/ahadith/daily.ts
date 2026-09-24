import type { DailyHadithSelection, Hadith } from '@/types/hadith';
import type { AppLanguage } from '@/types/quran';
import { resolveContent } from '@/utils/i18n/content';
import { KABUL_TIME_ZONE, getKabulDateKey } from '@/utils/afghanistanCalendar';
import { buildDateFromLocalTimeInTimezone } from '@/utils/prayerTimezone';
import { getCanonicalDailyHadiths } from '@/utils/ahadith/repository';
import { selectDailyHadith } from '@/utils/ahadith/selector';

/** The daily hadith follows the app language like every other surface. */
export type DailyHadithLanguage = AppLanguage;

export interface CanonicalDailyHadith extends DailyHadithSelection {
  dateKey: string;
  text: string;
  source: string;
  language: DailyHadithLanguage;
}

function sourceFor(hadith: Hadith): string {
  return [hadith.source_book, hadith.source_number].filter(Boolean).join(' ');
}

/**
 * One Kabul-date resolver shared by the Hadith screen, notifications, and
 * widgets. It intentionally does not accept a mutable remote catalogue.
 */
export function resolveCanonicalDailyHadith(
  dateOrKey: Date | string = new Date(),
  language: DailyHadithLanguage = 'dari',
): CanonicalDailyHadith {
  const dateKey = typeof dateOrKey === 'string' ? dateOrKey : getKabulDateKey(dateOrKey);
  const date = buildDateFromLocalTimeInTimezone(dateKey, '12:00', KABUL_TIME_ZONE);
  const selection = selectDailyHadith(getCanonicalDailyHadiths(), date);
  const resolved = resolveContent(selection.hadith, 'translation', language);

  return {
    ...selection,
    dateKey,
    text: (resolved?.text ?? '').replace(/\s+/g, ' ').trim(),
    source: sourceFor(selection.hadith),
    language: resolved?.language ?? language,
  };
}
