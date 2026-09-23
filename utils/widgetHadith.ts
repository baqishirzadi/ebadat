import { getDateKeyInTimezone } from '@/utils/prayerTimezone';
import { resolveCanonicalDailyHadith, type DailyHadithLanguage } from '@/utils/ahadith/daily';

export interface WidgetHadith {
  id: number;
  dateKey: string;
  text: string;
  source: string;
}

/**
 * Selects the same calendar-aware Hadith as the main app. No network or app
 * process is required, so the Android/iOS widget can rotate it independently.
 */
export function getWidgetHadithForDateKey(
  dateKey: string,
  language: DailyHadithLanguage = 'dari',
): WidgetHadith {
  const selection = resolveCanonicalDailyHadith(dateKey, language);
  return {
    id: selection.hadith.id,
    dateKey: selection.dateKey,
    text: selection.text,
    source: selection.source,
  };
}

export function getWidgetHadithForDate(
  date: Date,
  timezone = 'Asia/Kabul',
  language: DailyHadithLanguage = 'dari',
): WidgetHadith {
  return getWidgetHadithForDateKey(getDateKeyInTimezone(date, timezone), language);
}
