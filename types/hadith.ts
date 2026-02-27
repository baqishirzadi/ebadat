export type HadithSourceBook = 'Bukhari' | 'Muslim';

export type HadithSpecialDay =
  | 'ramadan'
  | 'laylat_al_qadr'
  | 'eid_al_fitr'
  | 'eid_al_adha'
  | 'first_10_dhul_hijjah'
  | 'ashura';

export interface HadithHijriRange {
  month: number;
  day_start: number;
  day_end: number;
}

export interface Hadith {
  id: number;
  arabic_text: string;
  dari_translation: string;
  pashto_translation: string;
  source_book: HadithSourceBook;
  source_number: string;
  is_muttafaq: boolean;
  topics: string[];
  special_days?: HadithSpecialDay[];
  hijri_range?: HadithHijriRange;
  weekday_only?: 'friday';
  daily_index: number;
}

export type AhadithSection = 'daily' | 'muttafaq' | 'topics' | 'search';

export interface AhadithCalendarContext {
  gregorianDate: Date;
  epochDay: number;
  weekday: number;
  hijri: {
    year: number;
    month: number;
    day: number;
  };
  specialDayKeys: HadithSpecialDay[];
  isFriday: boolean;
}

export type DailySelectionReason = 'special_days' | 'hijri_range' | 'weekday_only' | 'daily_index';

export interface DailyHadithSelection {
  hadith: Hadith;
  reason: DailySelectionReason;
  context: AhadithCalendarContext;
}

export interface AhadithNotificationPreferences {
  enabled: boolean;
  hour: number;
  minute: number;
}

export interface HadithEntryDTO extends Hadith {
  published?: boolean;
  published_at?: string | null;
  notification_sent?: boolean;
  notification_sent_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface HadithAdminPayload {
  arabic_text: string;
  dari_translation: string;
  pashto_translation: string;
  source_book: HadithSourceBook;
  source_number: string;
  is_muttafaq: boolean;
  topics: string[];
  special_days?: HadithSpecialDay[];
  hijri_range?: HadithHijriRange;
  weekday_only?: 'friday';
  daily_index?: number;
}
