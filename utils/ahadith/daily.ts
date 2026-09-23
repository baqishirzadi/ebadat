import type { DailyHadithSelection, Hadith } from '@/types/hadith';
import { KABUL_TIME_ZONE, getKabulDateKey } from '@/utils/afghanistanCalendar';
import { buildDateFromLocalTimeInTimezone } from '@/utils/prayerTimezone';
import { getCanonicalDailyHadiths } from '@/utils/ahadith/repository';
import { selectDailyHadith } from '@/utils/ahadith/selector';

export type DailyHadithLanguage = 'dari' | 'pashto';

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
  const text = language === 'pashto'
    ? selection.hadith.pashto_translation
    : selection.hadith.dari_translation;

  return {
    ...selection,
    dateKey,
    text: text.replace(/\s+/g, ' ').trim(),
    source: sourceFor(selection.hadith),
    language,
  };
}
